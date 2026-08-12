# Runbook — Exercício Trimestral de Restore e Validação DR (V1-702)

## 1. Propósito
Este runbook orienta a equipe de DBA/SRE na execução obrigatória do teste trimestral de Disaster Recovery (DR) para validação do RTO/RPO de PostgreSQL, MinIO e Qdrant em ambiente de staging isolado.

---

## 2. Pré-requisitos
- Acesso ao repositório `domus-corp` com Python 3.12+ e ambiente `uv` sincronizado.
- Variável de ambiente `BACKUP_ENCRYPTION_KEY` disponível no cofre de segredos (Vault / GitHub Secrets).
- Ambiente de Staging limpo ou reservado para simulação de restore.

---

## 3. Passo a Passo da Execução Trimestral

### Passo 1: Executar Backup Criptografado
No ambiente de produção/simulação, acione a rotina de backup:
```bash
uv run python scripts/backup_dr.py backup \
  --storage-path ./isolated_backup_storage \
  --encryption-key "$BACKUP_ENCRYPTION_KEY" \
  --label "quarterly_dr_exercise_$(date +%YQ%q)"
```
*Saída esperada:* `SUCCESS: Backup completed successfully. Manifest created at ...`

### Passo 2: Verificação de Integridade e Checksum
Verifique se os artefatos gerados estão integrais antes do envio ao staging:
```bash
uv run python scripts/backup_dr.py verify \
  --manifest-path ./isolated_backup_storage/manifest_backup_<MANIFEST_ID>.json \
  --encryption-key "$BACKUP_ENCRYPTION_KEY"
```
*Saída esperada:* `SUCCESS: Backup manifest and encrypted artifacts integrity VERIFIED.`

### Passo 3: Simulação de Restore em Ambiente Staging
Execute a restauração e validação de RTO/RPO em Staging:
```bash
uv run python scripts/backup_dr.py restore \
  --manifest-path ./isolated_backup_storage/manifest_backup_<MANIFEST_ID>.json \
  --encryption-key "$BACKUP_ENCRYPTION_KEY" \
  --target-env staging
```
*Saída esperada:* `SUCCESS: Disaster recovery restore to staging completed successfully.`

---

## 4. Critérios de Sucesso e Evidência
1. Todos os dados relacionais (PostgreSQL), objetos (MinIO) e vetores (Qdrant) devem ser restaurados sem perda de integridade ou metadados de ACL/versões.
2. O RTO total medido deve ser $\le 900$ segundos (15 minutos).
3. O RPO medido deve ser $\le 3600$ segundos (1 hora).
4. Registrar o relatório do teste em `docs/evidence/V1-702-verificacao.md`.
