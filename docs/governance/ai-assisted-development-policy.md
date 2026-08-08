# Política de desenvolvimento assistido por IA

**Issue:** V1-005

**Status:** vigente para a v1.0

**Owners:** Gerência de Projeto, Engenharia e Segurança

**Revisão:** a cada marco ou após incidente relevante

## Objetivo e alcance

Esta política governa o uso de Claude, Gemini, Codex, Kimi e outros modelos no ciclo de desenvolvimento do Domus Corp. Ela se aplica a análise, código, schemas, migrações, políticas, prompts, testes, documentação, operações e revisões. Um modelo é ferramenta de assistência: não é owner, aprovador, operador responsável nem fonte de autoridade.

As fontes de autoridade continuam sendo PRD/ERS, ADRs aprovados, backlog mestre, contratos versionados e decisões humanas registradas. Conflitos devem ser interrompidos e encaminhados ao owner humano; o modelo não pode resolvê-los silenciosamente.

## Usos permitidos

- resumir fontes autorizadas e preparar context packs;
- propor alternativas, scaffolding, código, testes e documentação;
- executar verificações locais e analisar resultados;
- revisar mudanças e levantar riscos, sem emitir aprovação institucional;
- trabalhar apenas com dados sintéticos, públicos ou explicitamente autorizados e minimizados.

Toda saída é tratada como não confiável até revisão. O autor humano continua responsável por escopo, precisão, licenças, segurança e integração.

## Limites obrigatórios

Um modelo não pode:

- decidir ou aprovar requisito, arquitetura, risco, policy, schema, migração, prompt de produção ou release;
- aprovar a própria saída ou substituir revisão humana por revisão de outro modelo;
- receber segredo, credencial, dado pessoal ou dado corporativo não autorizado;
- acessar autonomamente produção, staging protegido ou sistema externo com efeito real;
- executar escrita externa, publicação, deploy, merge, rotação de segredo ou ação irreversível sem autorização humana explícita para o alvo exato;
- contornar controles, reduzir testes ou adotar fallback permissivo quando faltar autoridade.

Em dúvida sobre identidade, classificação, autorização, ambiente ou escopo, aplica-se **fail-closed**: a execução deve parar de forma segura.

## Classificação da mudança e gates

| Classe | Exemplos | Gate mínimo antes do merge |
|---|---|---|
| Baixa | texto não normativo, refatoração local sem mudança de comportamento | revisão humana e verificação relevante |
| Moderada | código de aplicação, dependência, contrato compatível, prompt não produtivo | revisor humano de Engenharia e testes automatizados positivos/negativos proporcionais |
| Alta/P0 | arquitetura, auth, policy, ACL/RLS, budget, schema incompatível, migração, segredo, prompt/modelo produtivo, egress ou escrita externa | Engenharia e especialista humano do domínio (Segurança, DBA, Privacidade ou Release); evidência de testes, risco e rollback |

Achado crítico ou alto bloqueia o merge até correção ou aceitação formal por pessoa autorizada. Aprovação em chat não substitui o review rastreável no PR.

## Fluxo obrigatório

1. O responsável humano define issue, objetivo, fontes, dados permitidos e ações proibidas em um context pack baseado no [template](../templates/ai-context-pack.md).
2. Cada uso material registra modelo, finalidade e prompt ou resumo reproduzível da decisão. Segredos e conteúdo sensível não entram no registro.
3. A saída é conferida contra fontes; mudanças, testes executados e limitações são registrados no [registro de proveniência](../templates/ai-provenance-record.md).
4. O autor classifica o risco e solicita os revisores humanos exigidos pela matriz.
5. O revisor usa o [checklist](../templates/ai-review-checklist.md), inspeciona a mudança e as evidências e registra sua própria decisão.
6. Somente o fluxo humano autorizado pode fazer merge, deploy ou ação externa.

## Registro, retenção e exceções

O registro mínimo pode ficar no PR ou em `docs/evidence/`; o context pack versionável fica em `.ai/context-packs/`. Deve ser possível ligar issue, assistência, arquivos, testes e decisão humana sem armazenar raciocínio privado do modelo. Artefatos anteriores à V1-005 são preservados e passam a seguir este formato quando materialmente alterados.

Exceção exige escopo, prazo, mitigação, owner e aceite conjunto de Engenharia e Segurança. Nenhuma exceção autoriza segredo em prompt, acesso autônomo a produção ou autoaprovação por modelo.
