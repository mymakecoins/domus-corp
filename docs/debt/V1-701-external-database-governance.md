# Débitos externos — V1-701

**Não bloqueia:** desenvolvimento e verificação local/CI.  
**Bloqueia:** promoção de migrações a staging ou produção.

1. Criar identidade efêmera de migration runner separada das roles de runtime.
2. Configurar branch protection/CODEOWNERS efetivos para exigir DBA e Segurança nos caminhos `migrations/` e `scripts/migration_governance.py`.
3. Definir janelas, auditoria de DDL e alertas no PostgreSQL gerenciado escolhido.
4. Validar backup e restore antes do primeiro rollback externo, conforme V1-702.
5. Anexar evidência do pipeline hospedado aplicando somente versões pendentes.

Escolhas de provedor, nomes de roles externas e políticas de produção serão resolvidas no ambiente correspondente e não são inferidas durante o desenvolvimento.
