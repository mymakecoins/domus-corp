# Especificação de Design: V1-501 — Orquestrador de Contexto e Cliente do Model Gateway TS

## Resumo Executivo

Esta especificação define a implementação da issue **V1-501** no serviço `apps/knowledge-api`. Ela estabelece a camada de Orquestração de Contexto em Python, o motor de Sanitização de Prompts e o Cliente HTTP Fail-Closed para o Model Gateway TypeScript no âmbito da Onda 5 (E5: Plano de Inteligência).

---

## 1. Arquitetura do Sistema e Fronteiras de Módulos

A implementação expande o pacote `apps/knowledge-api/src/domus_knowledge` com três novos submódulos focados:

```
apps/knowledge-api/src/domus_knowledge/
├── prompt_sanitizer.py       # Templates de prompt e sanitização de conteúdo não confiável
├── context_orchestrator.py   # Montagem de contexto, aplicação de ACL e limites de orçamento
├── model_gateway_client.py   # Cliente HTTP fail-closed para o Model Gateway TS do Control-Plane
└── main.py                   # Rotas FastAPI para os endpoints de inteligência
```

### Restrições Arquiteturais Invioláveis
1. **Sem Egress para Provedores Externos**: O runtime Python **JAMAIS** deve conter credenciais diretas de provedores de LLM (OpenAI, Anthropic, Gemini, etc.) e **JAMAIS** deve realizar requisições HTTP diretas para APIs externas de IA.
2. **Roteamento Obrigatório pelo Model Gateway TS**: Todas as inferências de modelos devem trafegar estritamente pelo Control-Plane (`http://control-plane...` ou `CONTROL_PLANE_URL` configurado).
3. **Garantia de Fail-Closed**: Se o Control-Plane estiver inacessível, sofrer timeout ou retornar rejeição por política/orçamento, o cliente falha imediatamente lançando `ModelGatewayError`, sem executar fallback para provedores externos.
4. **Fronteira contra Prompt Injection**: Todo trecho de evidência recuperado deve ser sanitizado e envelopado dentro de tags explícitas `<untrusted_content>`, escapando quaisquer tags de fechamento internas.

---

## 2. Design dos Componentes

### 2.1 Sanitizador de Prompts (`prompt_sanitizer.py`)
- **Sanitização de Conteúdo**: Substitui/escapa sequências de fechamento `</untrusted_content>` ou tentativas de injeção XML/tags dentro dos textos recuperados.
- **Envelopamento de Evidências**: Envolve cada trecho de evidência no formato:
  ```xml
  <untrusted_content source_id="{source_id}" version_id="{version_id}" chunk_id="{chunk_id}" owner="{owner}">
  {texto_sanitizado}
  </untrusted_content>
  ```
- **Construção de Mensagens**: Monta as instruções do sistema (regras invioláveis) e o prompt do usuário contendo os blocos de evidências delimitados.

### 2.2 Orquestrador de Contexto (`context_orchestrator.py`)
- **Entrada**: Intenção/pergunta do usuário, contexto do usuário/tenant e itens de evidência recuperados (`RetrievalPage` / `Citation`).
- **Processamento**:
  - Filtra itens não autorizados por ACL/RLS.
  - Formata metadados de proveniência para cada trecho.
  - Avalia limites de orçamento de tokens e versionamento de política (`policy_version`).
- **Saída**: Objeto `OrchestratedContextResult` contendo as mensagens estruturadas de prompt (System e User) e estimativas de alocação de tokens.

### 2.3 Cliente HTTP Fail-Closed do Model Gateway (`model_gateway_client.py`)
- **Transporte**: `httpx.AsyncClient` comunicando com `/v1/model/responses` (unário) e `/v1/model/responses/stream` (SSE).
- **Schema da Requisição** (alinhado com a versão 2.17.0 dos contratos):
  ```json
  {
    "schema_version": "1.0.0",
    "idempotency_key": "<uuid>",
    "task": "chat",
    "messages": [ ... ],
    "required_capabilities": ["CHAT", "STREAMING"],
    "maximum_output_tokens": 1024
  }
  ```
- **Tratamento de Erros**: Lança `ModelGatewayError` em caso de falha de conexão, respostas não-200 ou violações no formato do stream SSE.

### 2.4 Rotas da API (`main.py` / `intelligence_routes.py`)
- `POST /v1/intelligence/orchestrate`: Orquestra o contexto e executa chamada unária ao Model Gateway.
- `POST /v1/intelligence/orchestrate/stream`: Orquestra o contexto e transmite a resposta em formato streaming SSE.

---

## 3. Estratégia de Testes e Verificação com Doubles Locais

1. **Testes Unitários**:
   - `test_prompt_sanitizer.py`: Valida escape de tags, defesas contra injeções XML e montagem correta das mensagens.
   - `test_context_orchestrator.py`: Valida aplicação dos filtros de ACL/RLS e vinculação de metadados de proveniência.
   - `test_model_gateway_client.py`: Valida serialização dos contratos, parsing de SSE streaming e disparo de exceções fail-closed em erros do servidor.
2. **Testes de Integração**:
   - `test_intelligence_endpoints.py`: Testes ponta a ponta dos endpoints FastAPI usando `httpx.MockTransport` (garantindo zero tráfego para a rede externa).

---

## 4. Auto-Revisão da Especificação
- **Placeholders**: Nenhum.
- **Consistência Interna**: Alinhado 100% com ADR-001, JSON Schema v2.17.0 e os requisitos de prontidão da Onda 5.
- **Escopo**: Focado exclusivamente na execução da issue V1-501.
- **Ambiguidade**: Regras de fail-closed, schemas de payload e caminhos de módulos estão explicitamente definidos.
