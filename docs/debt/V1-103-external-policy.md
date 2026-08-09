# Débitos externos — V1-103

Não bloqueiam desenvolvimento local; bloqueiam promoção ao ambiente correspondente:

1. Definir topologia, autenticação, TLS, disponibilidade e operação do Redis externo usado pelo cache de política e revogação.
2. Medir em ambiente integrado o SLA de invalidação após `policy.published` e `device.revoked` e definir alertas operacionais.
3. Integrar os catálogos reais de sources, assets, models, tools e actions quando as issues proprietárias desses contratos estiverem disponíveis.
4. Configurar políticas globais e templates iniciais por tenant com aprovação dos responsáveis de Segurança e Governança.
5. Executar testes de indisponibilidade, rotação, restauração e consistência com PostgreSQL, Redis, IdP e barramento reais.

Nenhum endpoint, credencial, política de produção, sizing ou fornecedor externo é fixado durante o desenvolvimento.
