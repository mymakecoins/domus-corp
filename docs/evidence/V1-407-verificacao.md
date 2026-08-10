# Evidência de verificação — V1-407

- taxonomia imutavelmente versionada, publicação segregada e uma versão publicada por escopo;
- hierarquia acíclica, termos/sinônimos bounded e chaves estáveis;
- assignments monotônicos; sugestão de modelo nunca confirma classificação;
- reprocessamento determinístico, idempotente e com fencing persistido;
- PostgreSQL com RLS/FKs/outbox e contratos 2.15.0/AsyncAPI 1.9.0;
- seed e parâmetros externos mantidos como débitos, sem afirmar taxonomia real.
