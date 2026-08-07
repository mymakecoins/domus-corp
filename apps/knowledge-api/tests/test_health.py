import asyncio

from fastapi.routing import APIRoute

from domus_knowledge.main import create_app


def test_health_reports_a_healthy_knowledge_api() -> None:
    app = create_app()
    route = next(
        route for route in app.routes if isinstance(route, APIRoute) and route.path == "/health"
    )
    payload = asyncio.run(route.endpoint())

    assert "GET" in route.methods
    assert payload == {
        "service": "knowledge-api",
        "status": "ok",
        "version": "dev",
    }
