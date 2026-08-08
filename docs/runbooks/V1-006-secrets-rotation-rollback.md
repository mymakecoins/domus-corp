# V1-006 — Rotação e rollback na Vercel

## Rotação inicial

1. O operador autorizado gera a nova credencial no serviço de origem.
2. Atualiza a variável no projeto Vercel correto, marcada como Sensitive, sem copiar o valor para log, argumento CLI, PR ou ticket.
3. Cria um novo deployment, pois mudanças de Environment Variables não alteram deployments anteriores.
4. Executa healthcheck e chamada sintética redigida no novo deployment.
5. Promove o deployment e revoga a credencial anterior após a janela de observação.

O cliente não é reinstalado. A troca ocorre no backend por deployment imutável. Para OIDC não há segredo persistente a rotacionar; a Vercel emite tokens curtos e o destino valida projeto e ambiente.

## Rollback

1. Usar Instant Rollback para a última versão íntegra do código.
2. Se a falha estiver no segredo, não promover um deployment antigo com credencial revogada: corrigir a Sensitive Environment Variable e gerar novo deployment.
3. Repetir healthcheck, validação de isolamento e auditoria redigida.
4. Em exposição, revogar imediatamente e emitir nova credencial; nunca restaurar valor comprometido.

## Migração futura

Em VPS/Azure/AWS, selecionar o adapter `*_FILE` ou identidade federada nativa, preservar nomes lógicos e repetir os mesmos testes. A migração exige ADR próprio; Kubernetes não é pressuposto.
