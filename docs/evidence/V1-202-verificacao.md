# Evidência local — V1-202

## Estado

Onboarding local de desenvolvimento concluído. Cópia final e políticas externas exigem revisão de UX/Privacidade.

## Cobertura

- estados retomáveis/versionados e conclusão idempotente;
- campos opcionais e `LOCAL_ONLY` por default;
- consentimento por campo para elegibilidade, sem envio automático;
- seleção pura inclui somente campo elegível, consentido e selecionado na ação;
- arquivo cifrado por `safeStorage`, escrita atômica e recusa de backend `basic_text`;
- IPC nominada, fechada, limitada a 64 KiB e validada por frame.

## Evidência

- canário local não cruza seleção de gateway nem aparece no arquivo;
- testes de retomada, conflito, exclusão, corrupção lógica, plaintext e adulteração IPC;
- fluxo React com labels, fieldset, status anunciado, pausa e revisão;
- Electron real mantém `require`/`process` ausentes e expõe somente namespaces allowlisted;
- gate monorepo verde.

## Limites

Débitos externos estão em `docs/debt/V1-202-external-privacy.md`.
