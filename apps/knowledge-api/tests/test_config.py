from pathlib import Path

import pytest

from domus_knowledge.config import load_config


def test_loads_source_secret_from_runtime_file(tmp_path: Path) -> None:
    secret = tmp_path / "source-token"
    secret.write_text("version-one\n", encoding="utf-8")
    config = load_config({"DOMUS_ENV": "test", "SOURCE_TOKEN_FILE": str(secret)})
    assert config.source_token == "version-one"
    secret.write_text("version-two\n", encoding="utf-8")
    assert config.source_token == "version-two"


def test_loads_vercel_sensitive_runtime_variable() -> None:
    config = load_config({"DOMUS_ENV": "test", "SOURCE_TOKEN": "runtime-only"})
    assert config.source_token == "runtime-only"


def test_rejects_ambiguous_secret_sources() -> None:
    with pytest.raises(ValueError, match="mutually exclusive"):
        load_config(
            {"DOMUS_ENV": "test", "SOURCE_TOKEN": "runtime-only", "SOURCE_TOKEN_FILE": "/x"}
        )


@pytest.mark.parametrize("name", ["PROVIDER_API_KEY", "PROVIDER_API_KEY_FILE"])
def test_python_runtime_rejects_provider_credentials(name: str) -> None:
    with pytest.raises(ValueError, match="must never receive provider credentials"):
        load_config({"DOMUS_ENV": "test", name: "forbidden"})
