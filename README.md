# Domus Corp

Monorepo poliglota da plataforma Domus Corp. O runtime TypeScript/Fastify é a autoridade de governança e execução; Python/FastAPI atende Knowledge e Intelligence sem ampliar policy, ACL, classificação ou budget. Interfaces entre runtimes usam somente os contratos versionados em [`contracts/`](contracts/README.md).

## Pré-requisitos

- Node.js 22 LTS (o CI usa 22.18.0);
- Corepack e pnpm 11.9.0;
- Python 3.12 e uv 0.8.15 ou compatível;
- Docker com Compose v2;
- GNU Make e Git.

Nenhum segredo real é necessário. Os valores de `.env.example` são exclusivos para desenvolvimento local e não podem ser reutilizados em ambientes compartilhados.

## Bootstrap de um clone limpo

```sh
cp .env.example .env
make bootstrap
make up
make check
```

`make up` inicia PostgreSQL, Redis, MinIO e Qdrant, aguarda os healthchecks e aplica a migração técnica baseline. Os serviços de aplicação podem ser iniciados separadamente:

```sh
pnpm --filter @domus/control-plane build
pnpm --filter @domus/control-plane start
uv run uvicorn domus_knowledge.main:app --app-dir apps/knowledge-api/src --reload --port 8000
```

Healthchecks: Control Plane em `http://localhost:3000/health` e Knowledge API em `http://localhost:8000/health`.
As dependências locais usam por padrão as portas `15432`, `16379`, `19000`/`19001` e `16333`; todas podem ser alteradas no `.env`.

## Comandos

| Comando | Função |
|---|---|
| `make bootstrap` | Instala dependências travadas e valida o Compose |
| `make up` / `make down` | Inicia ou encerra dependências locais sem apagar volumes |
| `make check` | Executa lint, type-check, testes, contratos, migrações e validação do Compose |
| `make build` | Compila os dois runtimes |
| `make migrate-up` / `make migrate-down` | Aplica ou reverte migrações locais |

Para remover também os dados locais, use conscientemente `docker compose down --volumes`; esse comando é destrutivo e não faz parte do fluxo normal.

## Estrutura

```text
apps/control-plane/   TypeScript, Node.js e Fastify
apps/knowledge-api/   Python, FastAPI e workers futuros
contracts/            OpenAPI, JSON Schema e AsyncAPI versionados
migrations/           Migrações SQL reversíveis
scripts/              Bootstrap e verificações reproduzíveis
```

## CI/CD e imagens

Pull requests executam qualidade dos dois runtimes, contratos, scan de secrets/vulnerabilidades, ida e volta da migração e builds OCI. A publicação em staging é manual, protegida pelo environment do GitHub e produz imagem por commit, digest, SBOM e attestação de proveniência.

O rollback está documentado em [`docs/runbooks/V1-004-rollback.md`](docs/runbooks/V1-004-rollback.md).

## Desenvolvimento assistido por IA

Contribuições com Claude, Gemini, Codex, Kimi ou outro modelo seguem a [política de desenvolvimento assistido por IA](docs/governance/ai-assisted-development-policy.md). Use o [context pack](docs/templates/ai-context-pack.md), o [registro de proveniência](docs/templates/ai-provenance-record.md) e o [checklist de revisão humana](docs/templates/ai-review-checklist.md). Modelos podem propor mudanças, mas não podem aprovar, fazer merge, operar produção nem executar escrita externa de forma autônoma.

## Troubleshooting

- Erro de engine Node: use Node 22; Node 24 local não é o runtime aprovado pelo ADR.
- Porta ocupada: ajuste somente o lado esquerdo do mapeamento em `compose.yaml` ou encerre o processo conflitante.
- Estado local inconsistente: tente `docker compose down` e `make up`. A remoção de volumes perde dados locais.
- Lockfile divergente: não use instalação destravada no CI; atualize o manifest e regenere o lockfile numa mudança revisada.

Todos os direitos reservados.
