# Evidência de verificação — V1-405

- máquina de estados com decisões terminais e optimistic concurrency;
- owner/alçada, clearance e segregação server-side;
- vigência UTC, frescor fail-closed e cutover que preserva a versão anterior em falha;
- conflitos determinísticos, sem combinação silenciosa;
- unicidade PostgreSQL para versão efetiva, RLS forçado, FKs restritivas e outbox;
- contratos 2.13.0 e AsyncAPI 1.7.0 sem conteúdo ou justificativa em eventos;
- fixtures sintéticas, lint, mypy estrito e suíte integral.
