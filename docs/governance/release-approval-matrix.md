# Matriz de aprovação de mudanças e releases

| Artefato/mudança | Owner | Revisores obrigatórios | Gate adicional |
|---|---|---|---|
| Código comum e dependência | Engenharia | owner do componente | CI e security scan |
| Contrato cross-runtime | Arquitetura | Engenharia TS + Python | compatibilidade e SemVer |
| Auth, policy, ACL/RLS, segredo, egress | Segurança | Engenharia + Segurança | testes negativos; alta/P0 |
| Schema/migração | DBA | Engenharia + DBA | forward/backward e restore |
| Prompt/modelo produtivo | AI/Produto | Engenharia + Segurança/QA | avaliação, custo e red-team |
| Taxonomia/fonte/conector/índice | Knowledge Owner | Engenharia + domínio | qualidade, vigência e rollback |
| Cliente e memória local | Desktop Owner | Engenharia + QA/Privacidade | anéis e compatibilidade local |
| Produção | Release Manager | owners exigidos acima | aprovação no environment Vercel |
| Aceite de risco alto/crítico | Risk Owner ou Security Lead | Segurança + owner afetado | justificativa, mitigação e expiração |

Segregação de função: autor prepara; revisores inspecionam; Release Manager promove; Risk Owner/Security Lead aceita risco. Assistentes de IA não ocupam nenhum papel e não podem preencher identidade humana no manifesto.
