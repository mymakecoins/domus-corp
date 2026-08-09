# Débitos externos — V1-101

**Estado:** adiados por decisão humana durante o desenvolvimento local da v1.0.  
**Não bloqueia:** implementação, testes com doubles e verificação em infraestrutura efêmera local.  
**Bloqueia:** promoção a staging/produção e declaração de integração operacional.

## Itens

1. Provisionar IdP corporativo de sandbox e registrar issuer, audience, discovery/JWKS e mapeamento real de claims.
2. Criar projetos e variáveis protegidas de staging conforme V1-006, incluindo OIDC de workload.
3. Provisionar PostgreSQL e Redis de staging e aplicar a role `domus_identity_runtime` sem `BYPASSRLS`.
4. Validar revogação distribuída contra o SLA p95 de 5 s e limite de 30 s.
5. Integrar prova de posse e Keychain/KeyStore com o cliente Electron na V1-201.

## Critério de remoção

Cada item exige evidência operacional, owner humano e teste no ambiente correspondente. Doubles e Compose local não encerram estes débitos.
