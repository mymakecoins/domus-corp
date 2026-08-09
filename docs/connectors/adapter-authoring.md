# Guia de adapters de fontes

Um adapter da v1.0 implementa `SourceConnector` no Control Plane TypeScript. Antes de código real, registre descriptor versionado, owner técnico, escopos OAuth mínimos e classificação máxima; Segurança deve aprovar esses dados.

Regras obrigatórias:

1. use somente `credential_ref` opaca e resolva o segredo pelo `ConnectorCredentialBroker`; nunca retorne ou registre tokens;
2. implemente paginação determinística e cursor opaco de até 8 KiB, sem conteúdo ou PII;
3. normalize ACL de origem como leitura e falhe fechado quando ela estiver ausente ou ambígua;
4. respeite `AbortSignal`, timeout, limites de página e `Retry-After`; não faça retry interno invisível;
5. forneça double determinístico e fixtures sintéticas sem copiar dados corporativos;
6. não persista originais: entregue stream efêmero à fronteira da V1-403;
7. classifique erros como transitórios ou definitivos e sanitize mensagens antes de auditoria/dead-letter;
8. prove por contrato que tenant, workspace, source, policy, cursor, fencing token e estado são autoridade do servidor.

Checklist de revisão: escopos mínimos, rotação/revogação, paginação, rate limit, ACL, classificação, tamanho, cancelamento, dedupe, observabilidade redigida e procedimento de pausa/reprocessamento.
