# Changelog dos contratos

O catálogo segue Semantic Versioning. Mudança incompatível exige nova major; mudança aditiva opcional usa minor; correção documental ou restrição que não altera instâncias aceitas usa patch.

## [2.12.0] — 2026-08-09

- Adição de job/resultado de ingestão e manifesto de artefato normalizado.
- Conteúdo, nomes, caminhos, credenciais e ACL completa permanecem fora dos eventos.

## [2.11.0] — 2026-08-09

- Adição de admissão, recibo, lifecycle e restore de objetos de conhecimento.
- Contratos preservam lineage e integridade sem conteúdo, nome original, segredo ou URL assinada.

## [2.10.0] — 2026-08-09

- Adição de conexão de fonte, página normalizada, job/evento de sync e dead-letter.
- Credenciais permanecem referências opacas; cursor bruto, ACL completa e conteúdo não entram em eventos.

## [2.9.0] — 2026-08-09

- Adição de `SourceRegistryEntry` e `SourceLifecycleEvent` para governança e consumo cross-runtime.
- Elegibilidade de ingestão permanece derivada no servidor; eventos carregam somente metadados redigidos.

## [2.8.0] — 2026-08-09

- `ModelStreamEvent` aceita estado semântico e referências opacas de citação na conclusão do chat.
- A extensão é aditiva; o endpoint de chat exige os campos para seus consumidores, sem inferi-los do texto no frontend.

## [2.7.0] — 2026-08-09

- Adição de `CostLedgerEntry`, `CostAggregate` e `CostThresholdEvent` com moeda explícita e valores decimais seguros entre runtimes.
- Recibos e versões de preço permanecem autoridade server-side e divergências exigem reconciliação.

## [2.6.0] — 2026-08-09

- Adição de `AuditEvent` mínimo e `AuditAccessEvent` para autoauditoria de consultas e exportações.
- Conteúdo operacional, PII, claims e secrets permanecem proibidos na trilha.

## [2.5.0] — 2026-08-09

- Adição de `ModelStreamEvent` com sequência monotônica e estados SSE iniciados, incrementais e terminais.
- Cancelamento, timeout, circuito e limites possuem códigos seguros sem autorizar retry automático.

## [2.4.0] — 2026-08-09

- Adição de `ModelGatewayRequest` sem campos de autoridade e `ModelGatewayResult` correlacionado à policy, rota, reserva e reconciliação.
- O transporte operacional pode devolver texto; auditoria e eventos continuam restritos a metadados redigidos.

## [2.3.0] — 2026-08-09

- Adição de `BudgetReservationDecision` para reservas cumulativas, idempotentes e reconciliáveis.
- Valores monetários cruzam runtimes como strings decimais em unidades menores; a persistência usa `bigint`.

## [2.2.0] — 2026-08-09

- Adição de `EgressGuardDecision` com metadados e contagens redigidas, sem conteúdo ou matches.
- Secrets e padrões proibidos permanecem controles não excepcionáveis.

## [2.1.0] — 2026-08-09

- Adição de `ModelRouteDecision` para decisão determinística e auditável de provider/modelo, preço e fallback.
- A decisão não concede autoridade ao cliente e não representa reserva ou consumo de budget.

## [2.0.0] — 2026-08-08

- `EffectivePolicy` passa a refletir integralmente o ADR-001: usuário, dispositivo, assets, models, tools, actions, classificações, retenção, frescor, insights, budget, decisão, motivos e proveniência por camada.
- Remoção de `subject_id` e `capabilities`; consumidores devem migrar para os campos explícitos antes da integração cross-runtime.
- A major é intencional e ocorre antes de promoção externa ou existência de consumidor produtivo.

## [1.3.0] — 2026-08-08

- Adição de `Workspace`, `WorkspaceMembership` e eventos administrativos de tenancy.
- Adição do canal AsyncAPI `domus.v1.tenancy.events`.
- Papéis e clearance permanecem server-side; `policy_id` é somente referência e não materializa `EffectivePolicy`.

## [1.2.0] — 2026-08-08

- Adição dos contratos de challenge e registro de dispositivo com chave pública P-256 e prova JWS `ES256`.
- Challenge de 256 bits, audiência `domus-device-registration`, validade de 120 segundos e consumo único fail-closed.
- Thumbprint da chave é derivado pelo servidor conforme RFC 7638 e não integra o payload confiável do cliente.

## [1.1.0] — 2026-08-08

- Adição dos contratos separados `ExternalIdentity`, `AuthenticatedSession` e `RequestSecurityContext` para a V1-101.
- Adição de `IdentityEvent` e `IdentityError`, válidos antes da resolução de workspace e policy.
- Adição do canal `domus.v1.identity.events` sem tokens, claims brutos ou autoridade de policy.
- Sessão e contexto de identidade permanecem estritamente separados de `EffectivePolicy`.

## [1.0.0] — 2026-08-07

- Publicação inicial de `EffectivePolicy`, `KnowledgeAsset`, `Evidence`, `Claim`, `Insight`, `ActionRequest`, `UsageLedger`, `ContractError` e `DomainEvent`.
- Publicação dos contratos HTTP OpenAPI e de eventos/jobs AsyncAPI.
- Envelope obrigatório de segurança, correlação e proveniência.

## Política de compatibilidade

1. Remover/renomear campo, tornar opcional obrigatório, estreitar enum/tipo ou alterar semântica é incompatível e requer nova major.
2. Campo novo deve ser opcional durante a janela de transição. Como os schemas são fechados, produtores só o enviam após consumidores declararem suporte à minor correspondente.
3. Uma migração temporária deve documentar produtor, consumidores, prazo, telemetria e remoção. No máximo duas majors adjacentes podem coexistir.
4. Eventos publicados não mudam em trânsito. Nova major usa novo `message.name` e, quando necessário, novo canal.
5. Alterações de `classification`, policy, proveniência, budget, autorização ou erro fail-closed exigem revisão humana de Arquitetura e Segurança.
