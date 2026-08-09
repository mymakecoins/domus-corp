# Débitos externos — V1-401

Nenhum valor de ambiente não-development foi fixado nesta issue. Antes de promoção, os responsáveis deverão decidir e validar:

- issuer, client registration, redirect URIs, cookie/domain e parâmetros OIDC/PKCE do painel administrativo;
- URL pública/interna, TLS, CSP, CORS e estratégia de deploy de `apps/admin`;
- capacidade PostgreSQL, PgBouncer, backup, RTO/RPO e retenção regulatória dos metadados/auditoria;
- transporte, particionamento, retry, DLQ e observabilidade do outbox de fontes;
- catálogo real de tipos, sistemas de origem e connectors permitidos;
- SLAs, periodicidades e retenções por tenant/domínio, inclusive exceções aprovadas;
- Vault e credenciais OAuth dos conectores, que serão tratados pela V1-402;
- alertas e responsáveis operacionais para owner revogado, fonte pausada/desconectada e falha de dependência.

Os limites de desenvolvimento documentados em `.ai/context-packs/V1-401.md` são defaults testáveis e não promovem decisões para ambientes externos.
