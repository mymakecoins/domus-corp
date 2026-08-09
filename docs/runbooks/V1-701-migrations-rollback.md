# Runbook — migrações e rollback V1-701

## Aplicação local e CI

O runner usa as variáveis padrão do `psql` (`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` e referência segura de senha fornecida pelo executor):

```sh
./scripts/run-migrations.sh up
```

Ele valida o manifesto, aplica versões pendentes em ordem e interrompe no primeiro erro. Nenhuma credencial pertence ao comando, manifesto ou repositório.

## Rollback local descartável

O rollback remove todas as versões em ordem inversa e destrói dados. Só é habilitado para banco local/CI descartável:

```sh
DOMUS_ALLOW_DESTRUCTIVE_ROLLBACK=local-or-ci ./scripts/run-migrations.sh down
```

Confirme previamente que o alvo não é compartilhado e que `PGHOST`, `PGPORT` e `PGDATABASE` apontam para a instância descartável correta.

## Ambientes externos

Não use a flag local/CI como autorização de rollback externo. Staging e produção exigem plano por migração, backup/restore validado pela V1-702, janela, owner, aprovação DBA/Segurança e evidência anexada. A automação externa deve fornecer credenciais efêmeras de uma role de migração separada das roles de runtime.

## Falha

1. Interrompa novas aplicações.
2. Preserve logs, versão em `schema_migrations` e erro do PostgreSQL sem registrar credenciais ou dados de negócio.
3. Determine se a transação reverteu integralmente.
4. Em local/CI, recrie o banco descartável ou execute o rollback controlado.
5. Em ambiente externo, não improvise DDL: acione DBA/Segurança e o procedimento aprovado daquele ambiente.
