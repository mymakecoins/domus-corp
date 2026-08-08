"""Fail-closed runtime configuration with file-backed secret references."""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RuntimeConfig:
    environment: str
    app_version: str
    source_token_file: str | None
    source_token_value: str | None

    @property
    def source_token(self) -> str | None:
        value = (
            Path(self.source_token_file).read_text(encoding="utf-8").strip()
            if self.source_token_file is not None
            else self.source_token_value
        )
        if value is None:
            return None
        if not value:
            raise ValueError("SOURCE_TOKEN resolved to an empty secret")
        return value


def _secret_source(name: str, env: Mapping[str, str]) -> tuple[str | None, str | None]:
    runtime_value = env.get(name)
    reference = env.get(f"{name}_FILE")
    if runtime_value is not None and reference is not None:
        raise ValueError(f"{name} and {name}_FILE are mutually exclusive")
    return reference, runtime_value


def load_config(env: Mapping[str, str] | None = None) -> RuntimeConfig:
    values = os.environ if env is None else env
    environment = values.get("DOMUS_ENV", "dev")
    if environment not in {"dev", "test", "staging", "prod"}:
        raise ValueError(f"unsupported DOMUS_ENV: {environment}")
    if "PROVIDER_API_KEY" in values or "PROVIDER_API_KEY_FILE" in values:
        raise ValueError("the Python runtime must never receive provider credentials")
    source_token_file, source_token_value = _secret_source("SOURCE_TOKEN", values)
    return RuntimeConfig(
        environment=environment,
        app_version=values.get("APP_VERSION", "dev"),
        source_token_file=source_token_file,
        source_token_value=source_token_value,
    )
