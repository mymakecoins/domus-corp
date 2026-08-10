# Evidência de verificação — V1-404

- pipeline Python determinístico para TXT, JSON, CSV e PDF;
- integridade da versão exata do original antes do parsing;
- canonicalização, IDs estáveis, classificação herdada e artefato imutável;
- idempotência por versão/profile/parser e fencing monotônico;
- PostgreSQL com RLS forçado, FK restritiva, estados e outbox sem conteúdo;
- contratos 2.12.0 e AsyncAPI 1.6.0;
- fixtures sintéticas positivas e negativas, lint, mypy estrito e testes integrais.

Configurações de ambientes externos permanecem em
`docs/debt/V1-404-external-ingestion-runtime.md`.
