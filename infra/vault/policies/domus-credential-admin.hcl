path "secret/data/provider-credentials/+/versions/+" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/metadata/provider-credentials/+/versions/+" {
  capabilities = ["read", "delete"]
}
