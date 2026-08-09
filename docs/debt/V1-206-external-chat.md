# Débitos externos — V1-206

Antes de promoção devem ser definidos e provados:

- login OIDC corporativo que grava a sessão atual no armazenamento seguro do Electron;
- composição concreta de PostgreSQL, Redis, Vault, policy, budget, catálogo, provider e auditoria no Gateway;
- origem HTTPS, certificados, proxy, timeouts e buffering do SSE por ambiente;
- retenção corporativa/jurídica do histórico e política de roaming, backup e MDM;
- matriz adicional de sistemas operacionais, browsers, leitores de tela e condições reais de rede;
- telemetria, SLOs e capacidade de streams simultâneos.

O desenvolvimento usa somente portas injetáveis e dados sintéticos; dependência ausente bloqueia, sem fallback inseguro.
