# Validação e handoff — Design System Domus Corp v1.0

## Resultado

O design system foi consolidado pelas sete perspectivas do time da `product-ideation-skill` e está pronto para implementação sobre shadcn/ui.

| Verificação | Resultado |
|---|---:|
| Estados semânticos de IA documentados | 8 de 8 |
| Cenários Dado–Quando–Então | 6 |
| Variantes de Button documentadas | 6 |
| Estilos Indigo/Violeta executáveis em Button | 0 |
| Arquivos de tokens gerados | 2 |
| Componentes compostos Domus especificados | 12 |
| Modos de densidade | 2 (`default` e `compact`) |
| Temas | 2 (`light` e `dark`) |
| Referências documentais | 5 |

## Artefatos

| Arquivo | Função |
|---|---|
| `DESIGN_SYSTEM_DOMUS_CORP.md` | Especificação completa de tokens, componentes, estados, interação, acessibilidade, roadmap e critérios de aceite. |
| `domus-design-tokens.css` | Variáveis CSS/HSL para shadcn/ui/Tailwind, light/dark, estados, IA, densidade e gradientes. |
| `domus-design-tokens.ts` | Tokens tipados, catálogo de estados, ícones, densidade e guardrail de Button. |
| `domus-button-variants.ts` | Variantes `cva` de Button sem Indigo/Violeta nos estados interativos. |

## Decisões que não devem ser alteradas sem revisão

1. `#0468F7` é o background primário de Button; as variantes alternativas usam neutros ou Error Strong.
2. `#271BAE` e `#310AE3` continuam disponíveis para profundidade, gradientes e marca, mas não para background, hover, active ou borda ativa de Button.
3. Os oito estados da IA são contratos de produto, não apenas estilos: Fundamentada, Parcial, Conflitante, Inferida, Sem evidência, Obsoleta, Bloqueada e Inconclusiva.
4. Citações, evidências, Action Review, policy e RLS têm componentes compostos próprios; não devem ser improvisados em cada tela.
5. O design system precisa ser validado com contraste, teclado, leitor de tela, zoom, reduced motion, snapshot light/dark e teste de proibição de cores em Button.

## Próximos passos

A implementação deve seguir D0–D6 na especificação: tokens, primitivos shadcn/ui, acessibilidade, componentes de confiança, governança, ação e handoff. O trabalho se conecta principalmente às issues V1-205, V1-207, V1-412, V1-510, V1-605, V1-807 e V1-808 do backlog da v1.0.

## Referências

[1]: ./DESIGN_SYSTEM_DOMUS_CORP.md "Design System Domus Corp v1.0"  
[2]: ./domus-design-tokens.css "Tokens CSS do Domus Corp"  
[3]: ./domus-design-tokens.ts "Tokens tipados do Domus Corp"  
[4]: ./domus-button-variants.ts "Variantes de Button do Domus Corp"  
[5]: ./upload/beta_up_design_tokens_palette.md "Paleta BetaUp Soluções"  
[6]: https://github.com/shadcn-ui/ui "shadcn/ui — repositório oficial"
