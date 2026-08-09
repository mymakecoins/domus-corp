# V1-302 — Rotação e rollback de credenciais

## Rotação

1. Um operador autorizado grava uma nova versão no Vault por meio do serviço administrativo; nunca copie o valor para argumentos, logs ou tickets.
2. O sistema persiste somente a referência opaca em estado `PENDING`.
3. Execute o teste sintético mínimo da mesma versão.
4. Ative a nova versão; a transação bloqueia o provider e revoga logicamente a versão anterior.
5. Confirme que novas resoluções retornam apenas a referência nova e conclua o cleanup do material antigo.

## Falha e rollback

- Antes da ativação: revogue a versão pendente e remova seu material; a ativa anterior permanece válida.
- Depois da ativação: não reative a versão revogada. Crie uma nova versão com material íntegro e repita teste/ativação.
- Se o cleanup do Vault falhar, o acesso permanece bloqueado pelo PostgreSQL e o evento `cleanup_required` deve ser tratado pelo operador.
- Em suspeita de exposição, revogue no provider e no Vault, emita novo material e procure o canário nos sistemas de observabilidade.

Nunca faça rollback restaurando segredo comprometido ou sobrescrevendo uma versão existente.
