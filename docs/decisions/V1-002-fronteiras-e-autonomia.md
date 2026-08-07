# V1-002 — ADR de fronteiras, egress e autonomia

**Status:** Aprovado  
**Data:** 07/08/2026  
**Decisor:** Marcos Wasem  
**Rastreabilidade:** ADR-001; RF-001; RF-047; H-001; V1-001

## Contexto

A v1.0 usa TypeScript/Fastify para autoridade, governança e ação e Python/FastAPI/workers para Knowledge e Intelligence. Sem fronteiras explícitas, a divisão cria caminhos alternativos capazes de contornar identidade, policy, classificação, budget, auditoria ou confirmação.

## Decisão

1. **Autoridade:** Identity, Policy Engine, Usage/Budget, Model Gateway, Tooling/MCP e Action Gateway são serviços TypeScript server-side. Python consome decisões versionadas e nunca as recalcula para ampliar acesso.
2. **Egress de IA:** Model Gateway TypeScript é o único caminho para LLMs, embeddings hospedados e APIs de providers. Credenciais ficam no Vault e não são entregues a clientes ou workers Python.
3. **Egress de ferramentas:** toda chamada MCP passa pelo proxy TypeScript; toda escrita externa passa também pelo Action Gateway.
4. **Fontes:** connectors de ingestão podem ler somente fontes registradas e consentidas, com identidade própria e allowlist. Essa exceção não concede acesso a providers, MCPs ou destinos de ação.
5. **Dados:** PostgreSQL registra autoridade, estado e ciclo de vida. MinIO e Qdrant não ampliam acesso e são reconstruíveis/invalidáveis a partir dessa autoridade.
6. **Contratos:** toda fronteira TypeScript/Python usará OpenAPI, JSON Schema ou AsyncAPI versionado. Os schemas concretos pertencem à V1-003.
7. **Fail-closed:** erro, ausência, timeout ou versão desconhecida de identidade, policy, classificação, ACL, budget, auditoria ou aprovação resulta em negação segura.

## Limites de autonomia

| Capacidade | Automação permitida | Gate obrigatório |
|---|---|---|
| Consulta, busca, síntese e comparação | automática dentro da policy efetiva | identidade, ACL, vigência, classificação, budget e auditoria |
| Ingestão | processamento automático após seleção | seleção e confirmação explícita da fonte/escopo; policy não pode ser ampliada |
| Claim, insight ou briefing | geração como derivado | evidência, estado de confiança, proveniência; publicação normativa exige owner/aprovação |
| Proposta de ação | automática | não executa nem reserva consentimento |
| Escrita externa de baixo/médio risco | não autônoma no piloto | preview, confirmação, reautorização, idempotência e recibo |
| Ação destrutiva, irreversível ou de alto risco | proibida sem aprovação adicional | alçada explícita, segundo gate e controle específico; pode permanecer desabilitada |
| Rotina agendada | leitura/briefing conforme policy | owner, pausa, budget, auditoria; ingestão e escrita agendadas autônomas ficam fora do piloto |

Confirmação do usuário não substitui policy nem amplia alçada. Dados recuperados, prompts, modelos e conteúdo de fontes não podem conceder autorização.

## Caminhos explicitamente proibidos

- Electron/renderer → provider, Vault, banco, filesystem privilegiado ou MCP;
- Python → provider/MCP usando credencial própria ou recebida do Gateway;
- Qdrant/MinIO → decisão de ACL sem consulta à autoridade vigente;
- Intelligence → execução externa direta;
- conteúdo ingerido/recuperado → instrução de sistema, policy ou aprovação;
- cache, parâmetro de debug, modo offline ou retry → bypass de controle indisponível.

## Consequências

**Positivas:** uma autoridade explicável, superfície de egress pequena, custo reconciliável, testes negativos claros e contenção de comprometimento de worker/cliente.

**Negativas:** Model e Action Gateways tornam-se componentes críticos; aumentam latência, necessidade de HA, disciplina de contratos e operação cross-runtime.

**Mitigações:** degradação segura, circuit breakers, reservas idempotentes, observabilidade redigida, contratos testados, identidades de workload, allowlists de rede e HA sem fallback permissivo.

## Alternativas rejeitadas

1. **Egress direto por runtime:** reduz um salto, mas duplica policy, credenciais, budget e auditoria e cria divergência inevitável.
2. **Service mesh como autoridade:** é útil para identidade/transporte, porém não entende alçada, classificação, budget, proveniência ou consentimento.
3. **Autonomia baseada na decisão do modelo:** o modelo processa entrada não confiável e não é autoridade de identidade, policy ou ação.
4. **Um único processo para todos os planos:** simplifica o deploy inicial, mas mistura trust boundaries e responsabilidades; módulos podem compartilhar infraestrutura sem compartilhar autoridade.

## Evidências e aprovação

- C4 e fluxos: `docs/architecture/V1-002-c4.md`.
- Threat model e matriz: `docs/security/V1-002-threat-model.md`.
- Marcos Wasem aprovou esta decisão, os limites de autonomia e os riscos iniciais em 07/08/2026, sem exceções registradas.
- A V1-003 está elegível para materializar os contratos; este ADR não define payloads antecipadamente.
