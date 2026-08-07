# Notas de pesquisa — acessibilidade e testes do front-end

## W3C — WCAG 2.1 e Quick Reference

Fonte: https://www.w3.org/TR/WCAG21/ e https://www.w3.org/WAI/WCAG21/quickref/

A WCAG organiza critérios de sucesso por níveis A, AA e AAA e a Quick Reference permite filtrar critérios, tecnologias e técnicas. O plano do Domus usa os critérios A e AA aplicáveis às superfícies do produto e registra critérios condicionais de mídia como aplicáveis ou não aplicáveis com justificativa.

## Playwright — Accessibility testing

Fonte: https://playwright.dev/docs/accessibility-testing

Playwright documenta a integração com `@axe-core/playwright`, o uso de `AxeBuilder` no estado atual da interface, a possibilidade de filtrar tags `wcag2a`, `wcag2aa`, `wcag21a` e `wcag21aa`, anexar resultados completos aos testes e a necessidade de combinar automação, avaliação manual e testes inclusivos com usuários. Também alerta que testes automatizados detectam somente parte dos problemas de acessibilidade.

## axe-core

Fonte: https://github.com/dequelabs/axe-core

axe-core é um engine para testes automatizados de interfaces HTML e oferece regras WCAG 2.0/2.1/2.2 e boas práticas. A documentação informa que a ferramenta retorna resultados inconclusivos quando precisa de revisão manual e que a execução pode ocorrer em testes unitários, de integração, browser ou funcionais.

## MDN — ARIA live regions

Fonte: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions

Regiões live expõem mudanças dinâmicas a tecnologias assistivas. `aria-live="polite"` é apropriado para atualizações importantes que não exigem interrupção imediata; `assertive` deve ser reservado para notificações críticas. A região deve existir antes da alteração do conteúdo para que a mudança seja anunciada com maior confiabilidade. O plano usa essa orientação para streaming, conclusão, cancelamento, erro e recibos sem anunciar cada token nem roubar foco.
