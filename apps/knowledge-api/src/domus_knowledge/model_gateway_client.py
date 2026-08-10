"""Module for fail-closed Model Gateway TypeScript HTTP client."""

from typing import Any, AsyncGenerator, Optional
import httpx


class ModelGatewayError(Exception):
    """Exception raised when the Model Gateway returns an error or is unreachable."""

    pass


class ModelGatewayClient:
    """Fail-closed HTTP client for Control-Plane TS Model Gateway."""

    def __init__(self, base_url: str = "http://localhost:3000", http_client: Optional[httpx.AsyncClient] = None):
        self.base_url = base_url.rstrip("/")
        self._http_client = http_client

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is not None:
            return self._http_client
        return httpx.AsyncClient(base_url=self.base_url, timeout=30.0)

    async def execute(
        self,
        idempotency_key: str,
        messages: list[dict[str, str]],
        max_tokens: int = 1024,
        task: str = "chat",
    ) -> dict[str, Any]:
        """Executes a unary model response request against Control-Plane Model Gateway."""
        payload = {
            "schema_version": "1.0.0",
            "idempotency_key": idempotency_key,
            "task": task,
            "messages": messages,
            "required_capabilities": ["CHAT"],
            "maximum_output_tokens": max_tokens,
        }

        client = self._get_client()
        try:
            response = await client.post(
                f"{self.base_url}/v1/model/responses",
                json=payload,
                headers={"content-type": "application/json"},
            )
        except Exception as err:
            raise ModelGatewayError(f"Fail-closed: Failed to connect to Model Gateway: {err}") from err

        if response.status_code != 200:
            raise ModelGatewayError(f"Fail-closed: Model Gateway returned HTTP {response.status_code}: {response.text}")

        return response.json()

    async def stream(
        self,
        idempotency_key: str,
        messages: list[dict[str, str]],
        max_tokens: int = 1024,
        task: str = "chat",
    ) -> AsyncGenerator[str, None]:
        """Streams SSE model responses from Control-Plane Model Gateway."""
        payload = {
            "schema_version": "1.0.0",
            "idempotency_key": idempotency_key,
            "task": task,
            "messages": messages,
            "required_capabilities": ["CHAT", "STREAMING"],
            "maximum_output_tokens": max_tokens,
        }

        client = self._get_client()
        try:
            async with client.stream(
                "POST",
                f"{self.base_url}/v1/model/responses/stream",
                json=payload,
                headers={"accept": "text/event-stream", "content-type": "application/json"},
            ) as response:
                if response.status_code != 200:
                    raise ModelGatewayError(f"Fail-closed: Model Gateway streaming HTTP {response.status_code}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        yield line[6:]
        except Exception as err:
            if isinstance(err, ModelGatewayError):
                raise
            raise ModelGatewayError(f"Fail-closed: Model Gateway stream connection failed: {err}") from err
