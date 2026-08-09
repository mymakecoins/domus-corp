# Débitos externos — V1-305

Fora do ambiente de desenvolvimento, permanecem por decisão futura de FinOps, DBA e Segurança:

- limites e escopos reais por tenant, workspace, usuário, tarefa e provider;
- moeda única operacional, política de conversão e fonte de câmbio, se necessária;
- canais, destinatários e SLA dos alertas de overage e expiração;
- retenção, reconciliação contábil e painéis do ledger;
- capacidade, pooling, timeouts e monitoramento do PostgreSQL externo.

Esses itens não bloqueiam o desenvolvimento e não têm valores presumidos na implementação.
