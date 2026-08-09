# Evidência local — V1-203

## Estado

Repositório de memória pessoal local concluído. Integrações externas e políticas corporativas permanecem fora desta fatia.

## Cobertura

- SQLite com WAL, foreign keys, busy timeout, secure delete e migração versionada;
- conteúdo cifrado, metadados de origem/escopo/versão/retenção e tags separadas;
- recuperação exige usuário/dispositivo e intervalo máximo de 90 dias;
- item máximo 64 KiB e paginação máxima 100;
- exclusão transacional com recibo local sem conteúdo;
- seleção para gateway exclui `LOCAL_ONLY` mesmo quando solicitado;
- exportação somente cifrada e senha mínima de 12 caracteres.

## Evidência

- SQLite real não contém o canário plaintext;
- testes de reinício lógico, isolamento, exclusão, limites, consentimento e exportação;
- gate monorepo verde.

## Limites

Débitos externos estão em `docs/debt/V1-203-external-local-memory.md`.
