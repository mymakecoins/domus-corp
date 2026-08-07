# syntax=docker/dockerfile:1.7
FROM ghcr.io/astral-sh/uv:0.8.15-python3.12-alpine AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /workspace
COPY pyproject.toml uv.lock ./
COPY apps/knowledge-api apps/knowledge-api
RUN uv sync --frozen --no-dev

FROM python:3.12.11-alpine3.22 AS runtime
ENV PATH="/app/.venv/bin:$PATH" PORT=8000
RUN addgroup -S domus && adduser -S -G domus -u 10001 domus
WORKDIR /app
COPY --from=build --chown=domus:domus /workspace/.venv .venv
USER domus
EXPOSE 8000
CMD ["uvicorn", "domus_knowledge.main:app", "--host", "0.0.0.0", "--port", "8000"]
