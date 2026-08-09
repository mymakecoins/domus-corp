# Rollback de staging — V1-004

## Princípio

Staging referencia imagens por digest, nunca apenas por tag. Um rollback troca o digest desejado pelo digest anteriormente aprovado; não recompila o commit antigo e não remove evidências do build com falha.

## Aplicação

1. Pause novas promoções no environment protegido `staging`.
2. Obtenha no artefato `*-digest` da última execução verde o digest anterior do serviço afetado.
3. Verifique a proveniência com `gh attestation verify oci://IMAGEM@DIGEST --repo ORGANIZACAO/REPOSITORIO`.
4. Atualize o manifesto de staging para `IMAGEM@sha256:DIGEST_ANTERIOR` pelo fluxo normal de revisão.
5. Aguarde o healthcheck e execute o smoke test de `/health`.
6. Registre commit, digest anterior, digest revertido, motivo, responsável e horário no incidente/release.

## Banco

A migração desta issue cria somente a tabela técnica `schema_migrations`. Em ambiente descartável, o rollback controlado é:

```sh
DOMUS_ALLOW_DESTRUCTIVE_ROLLBACK=local-or-ci ./scripts/run-migrations.sh down
```

Não execute rollback de banco produtivo por este runbook. Migrações de domínio e seus procedimentos pertencem à V1-701.
