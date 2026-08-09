# Débitos externos — V1-302

Não bloqueiam desenvolvimento local; bloqueiam promoção ao ambiente correspondente:

1. Selecionar e provisionar Vault corporativo ou serviço equivalente, com HA, TLS, backup e processo de unseal/recuperação.
2. Definir autenticação de workload federada, TTL, renovação e revogação para cada ambiente externo.
3. Configurar mounts, namespaces e policies reais sem reutilizar tokens, paths ou credenciais do desenvolvimento.
4. Integrar scanner corporativo de logs, traces, métricas, memória e artefatos e executar red-team de exfiltração.
5. Definir owners, segregação de funções, cerimônia de rotação, alertas e SLA de cleanup para material revogado.
6. Validar o teste sintético permitido por cada provider sem tráfego ou custo não autorizado.

Nenhum endpoint, token, namespace, fornecedor, SLA operacional ou política externa é fixado nesta issue.
