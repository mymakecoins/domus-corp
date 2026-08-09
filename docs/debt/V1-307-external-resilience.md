# Débitos externos — V1-307

Devem ser definidos por ambiente antes de promoção:

- limites de taxa e concorrência por tenant, workspace, usuário e provider;
- timeouts de conexão, primeiro byte, inatividade e duração por provider;
- tamanho de resposta, buffers e capacidade de rede;
- limiares, janelas e duração de abertura dos circuitos;
- capacidade/HA do Redis, métricas, alertas, SLOs e runbooks.

Os parâmetros do checkpoint V1-307 são fixtures explícitas de desenvolvimento, não defaults externos.
