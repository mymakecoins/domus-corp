# Runbooks Operacionais DBA & SRE — Saúde do Banco de Dados e Observabilidade (V1-705)

Este documento define os procedimentos operacionais padrão, arquitetura de observabilidade, alertas e mecanismos de backpressure (shedding) para garantia de disponibilidade, integridade e performance do banco de dados (PostgreSQL e Qdrant) na infraestrutura DomusCorp.

---

## Matriz de Severidade e Responsabilidades

| Alerta / Métricas | Severidade | Owner | Runbook Link | Ação Automática / Manual |
|---|---|---|---|---|
| Connections Pool >= 85% | CRITICAL | DBA | `#runbook-1` | Shedding Automático no Gateway (503) |
| Lock Contention / Waits | WARNING / CRITICAL | DBA | `#runbook-2` | Notificação Pager + Análise de Árvore de Locks |
| Deadlocks Detected | CRITICAL | DBA | `#runbook-2` | Log de Evento + Cancelamento Transacional |
| Slow Query > 2000ms | WARNING / CRITICAL | DBA | `#runbook-3` | Coleta de Trace + Diagnóstico EXPLAIN |
| Qdrant Degraded / Down | WARNING / CRITICAL | SRE | `#runbook-4` | Fallback para Busca Léxica + Restart |
| Disk Usage >= 90% | CRITICAL | SRE | `#runbook-5` | Rotação de Logs + Expansão de Volume |
| Backup Failure / Stale | CRITICAL | DBA | `#runbook-5` | Disparo de Retentativa de Backup V1-702 |

---

## Telemetria e Métricas Coletadas

- **PostgreSQL Pool Saturation**: `db_pool_saturation_percent` = `(active_connections / max_connections) * 100`
- **Lock Contention**: `db_lock_waits_total`
- **Deadlocks**: `db_deadlocks_total`
- **Slow Query Latency**: `db_max_query_time_ms`, `db_slow_queries_total`
- **Disk & IO Latency**: `db_disk_usage_percent`, `db_io_latency_ms`
- **Qdrant Vector Readiness**: `qdrant_status` (`HEALTHY`, `DEGRADED`, `UNAVAILABLE`)
- **Backup Health**: `backup_status` (`OK`, `FAILED`, `STALE`), `last_backup_age_hours`

---

<a id="runbook-1"></a>
## Runbook 1: Saturação do Pool de Conexões e Atuação de Backpressure

### Contexto & Sintomas
O alerta `connection_pool_saturation` atinge >= 85%. O motor de backpressure no Gateway (`GatewayBackpressureEngine`) ativa shedding automático, respondendo com HTTP `503 Service Unavailable` (`code: GATEWAY_BACKPRESSURE_SHEDDING`) para conexões não críticas, preservando transações do ledger e verificações de segurança.

### Diagnóstico Operacional
1. Executar consulta de conexões ativas no PostgreSQL:
   ```sql
   SELECT pid, usename, client_addr, state, query_age(clock_timestamp(), query_start) AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC;
   ```
2. Verificar processos em estado `idle in transaction`:
   ```sql
   SELECT pid, usename, state, state_change, query
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
   ORDER BY state_change ASC;
   ```

### Procedimento de Estabilização Segura
1. **Identificar Vazamento de Conexões**: Se houver acúmulo de conexões `idle in transaction` com duração > 5 minutos:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
     AND clock_timestamp() - state_change > interval '5 minutes';
   ```
2. **Verificar Liberação de Conexões**: Confirme que `db_pool_saturation_percent` caiu para < 75%. O gateway desativará automaticamente o shedding e restabelecerá admissão normal.
3. **Comando Proibido**: **NUNCA** execute `restart` no serviço de banco de dados nem utilize `pg_ctl kill` sem autorização prévia da liderança de DBA.

---

<a id="runbook-2"></a>
## Runbook 2: Contenção de Locks e Deadlocks

### Contexto & Sintomas
O alerta `lock_waits` indica processos bloqueados aguardando liberação de tabelas/linhas ou `deadlock_count > 0` foi registrado nos logs do PostgreSQL.

### Diagnóstico Operacional
1. Exibir a árvore de locks e identificadores bloqueadores:
   ```sql
   SELECT
     blocked_locks.pid     AS blocked_pid,
     blocked_activity.usename  AS blocked_user,
     blocking_locks.pid    AS blocking_pid,
     blocking_activity.usename AS blocking_user,
     blocked_activity.query    AS blocked_statement,
     blocking_activity.query   AS blocking_statement
   FROM  pg_catalog.pg_locks         blocked_locks
   JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
   JOIN pg_catalog.pg_locks         blocking_locks 
     ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
   JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;
   ```

### Procedimento de Resolução
1. **Cancelar Query Bloqueadora**: Cancele a instrução do processo bloqueador sem encerrar a conexão TCP:
   ```sql
   SELECT pg_cancel_backend(<blocking_pid>);
   ```
2. **Encerrar Conexão Persistente (Se necessário)**: Se `pg_cancel_backend` não surtir efeito em 30 segundos:
   ```sql
   SELECT pg_terminate_backend(<blocking_pid>);
   ```
3. **Validar Resolução**: Confirme que as consultas bloqueadas continuaram suas execuções com sucesso.

---

<a id="runbook-3"></a>
## Runbook 3: Slow Queries e Otimização de Performance

### Contexto & Sintomas
O alerta `slow_queries` aciona quando consultas excedem o tempo limite de `2000ms` ou quando o volume de consultas lentas se eleva subitamente.

### Diagnóstico Operacional
1. Consultar estatísticas acumuladas via `pg_stat_statements`:
   ```sql
   SELECT query, calls, total_exec_time, mean_exec_time, rows
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```
2. Executar `EXPLAIN ANALYZE` na réplica de leitura para avaliar custo e sequenciamento de scans:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) <QUERY_LENTA>;
   ```

### Ações Corretivas Permitidas
1. Atualizar estatísticas da tabela afetada:
   ```sql
   ANALYZE <nome_da_tabela>;
   ```
2. Caso o otimizador esteja optando por `Seq Scan` indevido em tabelas grandes, criar índice adequado (B-Tree ou GIN) em ambiente de staging e agendar DDL com a instrução `CONCURRENTLY` em produção:
   ```sql
   CREATE INDEX CONCURRENTLY idx_exemplo ON nome_tabela (coluna);
   ```

---

<a id="runbook-4"></a>
## Runbook 4: Indisponibilidade e Degradação do Qdrant

### Contexto & Sintomas
O alerta `qdrant_status` reporta estado `DEGRADED` ou `UNAVAILABLE`. As buscas vetoriais no Knowledge API ativam o modo de backpressure direcionado ou fallback para o mecanismo de busca léxico / relacional.

### Diagnóstico Operacional
1. Verificar status de saúde da instância Qdrant:
   ```sh
   curl -s http://localhost:6333/healthz
   ```
2. Inspecionar logs da instância Qdrant:
   ```sh
   docker logs --tail 100 qdrant
   ```

### Procedimento de Recuperação
1. **Verificar Memória e I/O**: Se o container do Qdrant foi finalizado por OOM (Out of Memory), reinicie o container:
   ```sh
   docker restart qdrant
   ```
2. **Validação e Cutover de Coleção**: Se os arquivos HNSW estiverem corrompidos, dispare o reindexador paralelo zero-downtime da V1-704 via endpoint API `/v1/vector/reindex/start`.
3. **Confirmação**: Assim que o Qdrant responder `HEALTHY`, a API de conhecimento desativará o shedding vetorial automaticamente.

---

<a id="runbook-5"></a>
## Runbook 5: Saturação de Disco/IO e Falha de Backup

### Contexto & Sintomas
Alertas de espaço em disco (`disk_usage_percent >= 90%`) ou falha na rotina automatizada de backup (`backup_status == FAILED` ou idade do backup > 24 horas).

### Diagnóstico Operacional
1. Verificar utilização do sistema de arquivos e volume de dados:
   ```sh
   df -h /var/lib/postgresql/data
   ```
2. Verificar acúmulo de arquivos WAL não arquivados:
   ```sh
   ls -la /var/lib/postgresql/data/pg_wal
   ```
3. Inspecionar logs da rotina de backup/DR (`scripts/backup_dr.py`).

### Ações Corretivas
1. **Limpeza Segura de Logs WAL Antigos**: Se o diretório WAL estiver saturando o disco, utilize a ferramenta segura `pg_archivecleanup` (NUNCA utilize `rm` direto no diretório WAL):
   ```sh
   pg_archivecleanup /var/lib/postgresql/data/pg_wal <último_wal_confirmado>
   ```
2. **Retentativa de Backup Manual**: Se o backup automatizado falhou, execute manualmente a rotina V1-702:
   ```sh
   python3 scripts/backup_dr.py backup --type full
   ```
3. Valide o sucesso do backup com `python3 scripts/backup_dr.py verify`.

---

## Verificação e Auditoria Contínua

Todos os incidentes operacionais de banco de dados devem ser registrados no log de auditoria com:
- Event ID
- Timestamp UTC
- Operador responsável
- Alerta associado e Runbook utilizado
- Ações efetuadas e resultado da estabilização
