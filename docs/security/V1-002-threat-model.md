# V1-002 — Threat model e matriz inicial de riscos

**Status:** Aprovado  
**Método:** STRIDE + casos de abuso específicos de IA  
**Data:** 07/08/2026  
**Aprovador:** Marcos Wasem

## 1. Escopo e ativos

O modelo cobre cliente Electron, painel web, serviços TypeScript e Python, PostgreSQL, Redis, MinIO, Qdrant, Vault, IdP, fontes, providers e MCPs. Os ativos prioritários são identidade/tenant, policy efetiva, segredos, conteúdo classificado, proveniência, budget/ledger, aprovações, idempotency keys, recibos e auditoria.

## 2. Atores e pressupostos adversariais

- usuário autenticado malicioso ou com dispositivo comprometido;
- atacante externo com token roubado, replay ou payload adulterado;
- documento, e-mail, página, resultado de ferramenta ou prompt com instrução hostil;
- provider, MCP ou fonte externa comprometida/indisponível;
- serviço ou worker interno comprometido tentando ampliar escopo;
- erro operacional, contrato incompatível ou cache obsoleto.

Todo conteúdo recuperado é dado não confiável. Rede interna, client-side checks e a simples origem corporativa não constituem confiança.

## 3. STRIDE por fronteira

| Fronteira | S | T | R | I | D | E | Controles obrigatórios |
|---|---|---|---|---|---|---|---|
| Cliente → API | token/device spoofing | alteração de tenant/workspace | negação de confirmação | vazamento em UI/log | flood/stream abandonado | operação privilegiada pelo renderer | OIDC/PKCE, sessão curta, device binding, schema, rate limit, authz server-side |
| TS → Python | workload falso | `EffectivePolicy`/IDs alterados | job sem correlação | contexto excessivo | fila/API saturada | worker amplia ACL | mTLS/workload identity, contratos assinados/versionados, escopo monotônico, `request_id`, quotas |
| Serviços → dados | role falsa | objetos/vetores/ledger alterados | mutação sem audit trail | cross-tenant/index leak | locks/indisponibilidade | bypass de RLS | credenciais por workload, RLS, constraints, outbox, encryption, deny by default |
| Model Gateway → provider | endpoint/provider falso | prompt/resposta adulterado | custo não reconciliado | exfiltração | timeout/quota | tool/egress não permitido | allowlist, Vault, TLS, redaction, reserva, timeout, audit e circuit breaker |
| Action Gateway → MCP | servidor/tool spoofed | parameter injection | ação sem recibo | segredo/PII em tool call | retry storm | execução acima da alçada | catálogo assinado, OAuth escopado, confirmação vinculada, idempotência, kill switch |
| Fonte → ingestão | fonte/cursor falso | arquivo malicioso | origem não demonstrável | conteúdo proibido | zip bomb/parser DoS | prompt injection vira policy | registro e consentimento, scan/quarentena, limites, proveniência, separação instrução/dado |

## 4. Casos de abuso de IA

1. **Prompt injection indireto:** conteúdo ordena ignorar policy, revelar contexto ou selecionar ferramenta. Conteúdo nunca ocupa canal de instrução; recuperação e tools permanecem limitadas pela policy calculada fora do modelo.
2. **Confused deputy cross-runtime:** worker Python usa sua identidade para consultar outro tenant ou provider. A identidade de workload não substitui o contexto do ator; escopo só pode diminuir.
3. **Tool poisoning:** manifesto ou resultado MCP tenta trocar parâmetros/destino. O catálogo é versionado e o Action Gateway valida intenção e hash mostrado ao aprovador.
4. **Exfiltração por saída/telemetria:** modelo codifica conteúdo em resposta, URL, erro ou trace. Há classificação/redaction antes e depois do egress e telemetria guarda metadados mínimos.
5. **Budget exhaustion:** prompt, retry ou concorrência força gasto repetido. Reserva atômica antecede provider; ledger e idempotência reconciliam estados inconclusivos.
6. **Envenenamento de conhecimento:** fonte hostil cria claims falsos ou sobrepõe versão vigente. Scan, quarentena, owner, aprovação, proveniência e vigência impedem promoção silenciosa.
7. **Action laundering:** recomendação é convertida em escrita sem consentimento. Intelligence apenas propõe; Action Gateway reautoriza e exige confirmação/aprovação conforme risco.

## 5. Matriz de riscos

Escala inicial: Probabilidade (P) e Impacto (I) de 1 a 5; severidade = P × I. `Crítico` 20–25, `Alto` 12–19, `Médio` 6–11, `Baixo` 1–5. A severidade residual só será aceita após evidência de teste.

| ID | Risco | STRIDE | P×I | Mitigação mínima | Owner | Teste/evidência | Issue destino |
|---|---|---:|---:|---|---|---|---|
| R-01 | segredo em cliente, log, artefato ou contexto | I | 4×5=20 Crítico | Vault/Keychain, redaction, least privilege, rotação | Segurança / Plataforma | secret scan + canário + inspeção de traces | V1-006, V1-302, V1-304, V1-806 |
| R-02 | tenant/workspace escape em SQL, vetor ou evidência | S/E/I | 4×5=20 Crítico | identidade server-side, RLS, filtros antes da busca, escopo monotônico | Identity / Dados / Knowledge | matriz cross-tenant negativa em PostgreSQL e Qdrant | V1-101–103, V1-409, V1-802, V1-806 |
| R-03 | prompt injection muda policy, tool ou egress | T/E/I | 4×5=20 Crítico | separar dados/instruções, quarentena, allowlists e gateway único | Segurança / Knowledge / Harness | corpus adversarial direto e indireto | V1-406, V1-501, V1-603, V1-806 |
| R-04 | worker Python chama provider ou MCP diretamente | E/R/I | 3×5=15 Alto | network deny, workload identity, egress allowlist, contrato interno | Plataforma / Segurança | teste de conectividade negativo e alerta de egress | V1-006, V1-301, V1-602, V1-806 |
| R-05 | bypass/duplicidade de budget por concorrência ou retry | T/D/E | 4×4=16 Alto | reserva atômica, ledger, idempotência e reconciliação | Harness / Finanças | carga concorrente, timeout e replay | V1-305–307, V1-804, V1-806 |
| R-06 | ação indevida, duplicada ou acima da alçada | T/R/E | 4×5=20 Crítico | preview, confirmação vinculada, reauth, idempotência, recibo e kill switch | Action / Segurança | alteração após preview, replay, timeout e dupla aprovação | V1-604–606, V1-805, V1-806 |
| R-07 | policy ausente, conflitante ou obsoleta vira allow | E | 3×5=15 Alto | fail-closed, versão/TTL, invalidação e sem fallback permissivo | Governance | timeout, cache corrupto, versão desconhecida | V1-103, V1-105, V1-802 |
| R-08 | conhecimento revogado/expirado continua recuperável | T/I | 3×4=12 Alto | ciclo de vida autoritativo, tombstone e filtro pré-retrieval | Knowledge / Dados | revogar durante index lag e consultar | V1-405, V1-409–411, V1-803 |
| R-09 | auditoria contém dados sensíveis ou não explica decisão | R/I | 3×4=12 Alto | eventos mínimos, correlação, redaction e acesso auditado | Segurança / Operações | teste de canário e reconstrução de decisão | V1-308, V1-901 |
| R-10 | provider/MCP comprometido retorna payload hostil | T/I/D | 3×5=15 Alto | schema de resposta, sandbox, limites, circuit breaker, output encoding | Harness / Action | respostas malformadas, oversized e instruções hostis | V1-307, V1-603, V1-806 |

## 6. Gates e riscos residuais

- R-01, R-02, R-03 e R-06 bloqueiam release enquanto residuais forem altos ou críticos sem aceite humano formal, prazo e controle compensatório.
- Nenhum controle desta matriz está “implementado” por estar documentado; cada issue destino deve produzir evidência automatizada e comportamento fail-closed.
- Owners e classificações P/I são a baseline inicial aprovada. Evidências das issues destino poderão reduzir o risco residual; qualquer aceite de risco alto ou crítico deverá ser explícito e possuir prazo e controle compensatório.

## 7. Aprovação

Marcos Wasem aprovou este threat model e sua matriz inicial de riscos em 07/08/2026. A aprovação não declara os controles implementados nem aceita riscos residuais antecipadamente.
