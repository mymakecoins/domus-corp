import pytest
import httpx
from domus_knowledge.model_gateway_client import ModelGatewayClient, ModelGatewayError


@pytest.mark.anyio
async def test_model_gateway_client_execute_success():
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/model/responses"
        return httpx.Response(
            200,
            json={
                "schema_version": "1.0.0",
                "idempotency_key": "key-123",
                "output": {"content": "Resposta do modelo", "semantic_state": "Grounded"},
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://control-plane.local") as http_client:
        client = ModelGatewayClient(base_url="http://control-plane.local", http_client=http_client)
        res = await client.execute(
            idempotency_key="key-123",
            messages=[{"role": "user", "content": "Olá"}],
        )
        assert res["output"]["semantic_state"] == "Grounded"


@pytest.mark.anyio
async def test_model_gateway_client_fail_closed_on_error():
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"code": "INTERNAL_ERROR"})

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://control-plane.local") as http_client:
        client = ModelGatewayClient(base_url="http://control-plane.local", http_client=http_client)
        with pytest.raises(ModelGatewayError) as exc_info:
            await client.execute(idempotency_key="key-123", messages=[])
        assert "Model Gateway returned HTTP 500" in str(exc_info.value)


@pytest.mark.anyio
async def test_model_gateway_client_stream_success():
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/model/responses/stream"
        content = "data: chunk1\n\ndata: chunk2\n\n"
        return httpx.Response(
            200,
            content=content.encode("utf-8"),
            headers={"content-type": "text/event-stream"},
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://control-plane.local") as http_client:
        client = ModelGatewayClient(base_url="http://control-plane.local", http_client=http_client)
        chunks = []
        async for chunk in client.stream(
            idempotency_key="key-123",
            messages=[{"role": "user", "content": "Olá"}],
        ):
            chunks.append(chunk)
        assert chunks == ["chunk1", "chunk2"]


@pytest.mark.anyio
async def test_model_gateway_client_stream_error():
    def mock_handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="Service Unavailable")

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport, base_url="http://control-plane.local") as http_client:
        client = ModelGatewayClient(base_url="http://control-plane.local", http_client=http_client)
        with pytest.raises(ModelGatewayError) as exc_info:
            async for _ in client.stream(idempotency_key="key-123", messages=[]):
                pass
        assert "503" in str(exc_info.value)
