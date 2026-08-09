# Débitos externos — V1-204

Antes de promoção devem ser definidos:

- integrations, client IDs, endpoints, scopes e políticas de consentimento;
- testes reais de Keychain, Credential Manager e Secret Service por SO;
- revocation endpoints, refresh rotation e semântica de erros por provider;
- custom protocol/device flow quando loopback não for suportado;
- auditoria, suporte, reautenticação e rollout externos.

Nenhuma integração real é presumida no desenvolvimento.
