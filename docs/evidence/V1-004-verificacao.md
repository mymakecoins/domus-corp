# Evidência de verificação — V1-004

Data: 07/08/2026  
Responsável pela execução automatizada: Codex  
Autoridade de aceite: Marcos Wasem — aceite registrado em 07/08/2026

## Resultado

| Gate | Resultado |
|---|---|
| Scaffold e guardrails estruturais | 4 testes aprovados |
| Contratos V1 | 9 schemas, 18 fixtures, OpenAPI 3.1 e AsyncAPI 3.0 aprovados |
| TypeScript | lint/type-check, build e 1 teste Fastify aprovados |
| Python | Ruff, formatação, mypy e 1 teste FastAPI aprovados |
| Migrações | par up/down transacional validado e executado no PostgreSQL 16.9 |
| Serviços auxiliares | PostgreSQL, Redis, MinIO e Qdrant atingiram estado healthy |
| Imagens OCI | Control Plane e Knowledge API construídas com sucesso |
| Usuário de runtime | ambas as imagens confirmadas com UID diferente de zero |
| Compose | configuração válida e portas locais configuráveis |
| Whitespace Git | `git diff --check` sem erros |
| Aceite humano | Marcos Wasem aprovou a entrega em 07/08/2026 |

## Observações

- A estação de execução possui Node.js 24 e por isso emite aviso de engine. O runtime aprovado e validado nas imagens é Node.js 22.18.0, também fixado no CI.
- As imagens locais de teste foram construídas sem publicação. O workflow protegido de staging gera digest, SBOM e attestação quando autorizado por humano.
- O ciclo da migração criou a tabela técnica, confirmou a versão `1` e removeu a tabela no rollback.
- Nenhum secret real ou dado corporativo foi utilizado.

## Decisão

Marcos Wasem revisou e aceitou a entrega em 07/08/2026. Com esse aceite, a V1-004 será considerada formalmente encerrada assim que o pipeline hospedado do commit que contém este registro concluir sem falhas; o modelo não substitui nem amplia essa aprovação.
