# Matriz de responsabilidades para assistência de IA

Legenda: **R** executa, **A** responde pela decisão, **C** é consultado, **I** é informado, **P** apenas propõe. O modelo nunca recebe A nem aprovação.

| Atividade | Modelo | Autor humano | Engenharia | Segurança/Especialista | Release/Operações |
|---|---:|---:|---:|---:|---:|
| Context pack e proposta inicial | P | R/A | C | C em P0 | I |
| Código, teste e documentação | P | R | A | C conforme risco | I |
| Arquitetura e contrato | P | R | A | C obrigatório em P0 | I |
| Policy, auth, ACL/RLS, segredo e privacidade | P | R | C | A | I |
| Schema e migração | P | R | A | A do DBA/owner de dados | I |
| Prompt ou modelo de produção | P | R | A | A de Segurança/owner de IA | I |
| Aceitação de risco | I | C | C | A autorizado | I |
| Merge | I | R | A | aprovação adicional conforme risco | I |
| Deploy/release e rollback | I | C | C | C | R/A |
| Escrita em sistema externo | P sem executar | R mediante autorização | C | A conforme impacto | I |

Uma mesma pessoa pode acumular papéis somente quando a política organizacional permitir. Mudanças P0 exigem ao menos uma revisão humana independente do autor; a revisão de outro modelo não satisfaz essa segregação.
