# Débitos externos — V1-403

Antes de qualquer promoção ou uso de dado corporativo, definir e homologar:

- nomes, regiões, quotas e policies dos buckets `originals`, `quarantine` e `artifacts`;
- TLS, KMS/SSE, chaves, rotação e workload identities separadas;
- Object Lock, versionamento, replication, backup, restore, RTO e RPO;
- lifecycle/retention, legal hold, exclusão e reconciliação conforme requisitos regulatórios;
- malware engine, atualização de assinaturas, sandbox, SLO e tratamento de inconclusivos;
- multipart, limites, timeouts e capacidade por ambiente;
- alertas de integridade, objetos órfãos, restore divergente e exclusão ambígua.

O MinIO local permanece restrito a fixtures sintéticas. Nenhum parâmetro de staging/produção foi decidido.
