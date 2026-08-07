.DEFAULT_GOAL := help

.PHONY: bootstrap build check down help migrate-down migrate-up test up

help:
	@echo "bootstrap     install locked dependencies and validate Compose"
	@echo "up            start local dependencies and apply baseline migration"
	@echo "down          stop local dependencies without deleting data"
	@echo "check         run all repository quality gates"
	@echo "build         build both application runtimes"
	@echo "migrate-up    apply migrations in order"
	@echo "migrate-down  roll migrations back in reverse order"

bootstrap:
	./scripts/bootstrap.sh

up:
	docker compose up --detach --wait
	./scripts/migrate.sh up

down:
	docker compose down

migrate-up:
	./scripts/migrate.sh up

migrate-down:
	./scripts/migrate.sh down

test:
	pnpm test
	UV_CACHE_DIR=.local/uv-cache uv run pytest

build:
	pnpm build
	UV_CACHE_DIR=.local/uv-cache uv build --no-build-isolation

check:
	./scripts/verify.sh
