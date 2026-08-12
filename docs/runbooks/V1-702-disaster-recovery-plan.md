# Plano de Disaster Recovery (DR) e Matriz RTO/RPO — V1-702

## 1. Visão Geral
Este documento estabelece o plano automatizado de Disaster Recovery (DR), política de backup criptografado, retenção isolada e verificação de integridade para os três pilares de persistência da plataforma **DomusCorp**:
1. **PostgreSQL 16.9** (Dados Relacionais, Schema Governança, Audit Log, Ledgers e RLS);
2. **MinIO** (Armazenamento Imutável de Artefatos, Documentos e Transcrições);
3. **Qdrant** (Coleções Vetoriais, Embeddings e Índices HNSW).

---

## 2. Matriz RTO e RPO

| Componente | Tipo de Dado | Método de Backup | RTO Alvo (Max) | RPO Alvo (Max) | Estratégia de Retenção | Criptografia & Integridade |
|---|---|---|---|---|---|---|
| **PostgreSQL** | Relacional / Transacional | Dump Lógico Criptografado / WAL Sync | 15 min (900s) | 1 hora (3600s) | 30 diários, 12 mensais | Encrypted HMAC-PBKDF2 + Checksum SHA-256 |
| **MinIO** | Objetos Imutáveis | Snapshot de Bucket / Metadata Sync | 15 min (900s) | 1 hora (3600s) | Versionamento ativo + 30 dias | Encrypted Payload + Checksum SHA-256 |
| **Qdrant** | Coleção Vetorial | Snapshot API + Collection Export | 15 min (900s) | 1 hora (3600s) | 14 diários | Encrypted Payload + Checksum SHA-256 |

---

## 3. Arquitetura de Backup Criptografado e Retenção Isolada

### 3.1 Criptografia Ativada por Padrão
Nenhum artefato de backup é armazenado em texto plano. Cada dump exportado passa pela rotina `CryptoHelper` (HMAC-SHA256 + PBKDF2 com derivação de chave e vetor de inicialização IV único), garantindo confidencialidade e autenticidade.

### 3.2 Integridade e Checksum SHA-256
A criação do backup gera um manifesto contendo o SHA-256 individual de cada artefato (`postgres`, `minio`, `qdrant`) e o SHA-256 combinado do manifesto. 

### 3.3 Bloqueio de Declaração de Cobertura sem Evidência
Se qualquer arquivo estiver corrompido, ausente ou falhar na verificação de chave/checksum:
1. O `AlertManager` emite alerta de severidade `CRITICAL` para o owner (`sre-team@domuscorp.com` / `dba@domuscorp.com`);
2. A tentativa de declarar cobertura reporta exceção `BackupCoverageError`, impedindo que a organização registre cobertura falsa sem validação prévia.

---

## 4. Procedimento de Restauração em Staging

O script automatizado de restauração executa os seguintes passos:
```bash
python scripts/backup_dr.py restore \
  --manifest-path /caminho/para/manifest_backup_YYYYMMDD.json \
  --encryption-key $BACKUP_ENCRYPTION_KEY \
  --target-env staging
```

1. **Validação de Integridade (Fail-Fast):** Recalcula hashes SHA-256 e valida decodificação HMAC antes de alterar qualquer estado de staging.
2. **Descriptografia dos Artefatos:** Restaura em memória/stream seguro.
3. **Restauração Relacional (PostgreSQL):** Aplica tabelas, schemas e roles RLS.
4. **Restauração de Objetos (MinIO):** Reconstrói buckets, versões e metadados de ACL.
5. **Restauração Vetorial (Qdrant):** Restaura coleções, índices HNSW e vetores correlacionados.
6. **Métricas SLA:** Computa tempo de execução (RTO) e janela temporal entre o backup e o restore (RPO), auditando conformidade.

---

## 5. Matriz de Contato de Emergência

* **Lead SRE / Disaster Coordinator:** `sre-team@domuscorp.com`
* **DBA Lead:** `dba@domuscorp.com`
* **Escalação de Segurança:** `security@domuscorp.com`
