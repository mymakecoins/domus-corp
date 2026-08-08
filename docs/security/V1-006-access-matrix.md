# V1-006 — Matriz de acesso Vercel-first

## Topologia inicial

Cada ambiente lógico (`dev`, `test`, `staging`, `prod`) possui dois projetos técnicos Vercel, um por runtime. Essa separação é necessária porque variáveis da Vercel têm escopo de projeto; um único projeto faria todas as Functions receberem o mesmo conjunto de variáveis.

| Runtime | Projetos | Configuração pública | Sensitive Environment Variables | Negado |
|---|---|---|---|---|
| Control Plane TypeScript | `domus-control-plane-<env>` | ambiente, versão, log level e URL do Knowledge | provider, PostgreSQL e Redis | secrets de fontes/Knowledge |
| Knowledge API Python | `domus-knowledge-api-<env>` | ambiente, versão, log level e URL do Control Plane | fonte, PostgreSQL, Redis, MinIO e Qdrant | provider, MCP e escrita externa direta |

Os nomes e allowlists versionáveis estão em `deploy/vercel/projects.json`. Valores sensíveis existem somente nas configurações dos projetos Vercel e nunca no repositório. `test` usa projetos próprios e doubles; não compartilha banco, storage, tokens ou URLs com `prod`.

## Identidade e acesso externo

OIDC da Vercel em modo de issuer por team é a identidade de workload. Serviços externos devem validar `owner`, `project`, `environment`, `aud` e expiração, concedendo acesso apenas ao projeto/runtime/ambiente esperado. Credenciais persistentes de cloud devem ser substituídas por tokens curtos quando o serviço suportar federação.

A Vercel não substitui firewall interno de VPS ou cloud privada. Nesta fase, controles de rede são: projetos separados, Vercel Firewall/Deployment Protection, TLS, allowlists no serviço de destino e validação OIDC. Kubernetes, CNI e NetworkPolicy não fazem parte do baseline aprovado.

## Portabilidade futura

O código aceita secret sensível injetado em runtime e, alternativamente, `*_FILE`. O primeiro mecanismo atende à Vercel; o segundo preserva migração futura para Vault Agent, systemd credentials, Docker secrets, Azure Key Vault ou AWS Secrets Manager sem mudar o domínio.

Segurança/DevOps devem revisar RBAC da team Vercel, proteção dos projetos, claims OIDC, variáveis por projeto e allowlists dos serviços gerenciados antes de promover staging/prod.
