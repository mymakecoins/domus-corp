# Evidência local — V1-204

## Estado

Núcleo OAuth e armazenamento de desenvolvimento concluídos. Providers e provas por SO permanecem decisões de promoção.

## Cobertura

- Authorization Code + PKCE S256 e browser/callback loopback;
- state/nonce/verifier de 256 bits, validade 120 s e consumo único;
- validação exata de host, porta, path, state, code e expiração;
- tokens somente no credential store; metadados mantêm referência opaca;
- adapter Electron usa `safeStorage`, arquivos 0600 e nomes derivados por SHA-256;
- backend `basic_text` ou indisponível bloqueia conexão.

## Evidência

- testes de PKCE, replay, adulteração, expiração e store indisponível;
- canários de access/refresh token ausentes em metadata e resposta;
- compensação remove segredo se persistência de metadata falhar;
- gate monorepo verde.

## Limites

Débitos externos estão em `docs/debt/V1-204-external-oauth.md`.
