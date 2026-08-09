#!/usr/bin/env python3
"""Dependency-free basic contract checks for the V1-003 catalog."""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urldefrag
from uuid import UUID

ROOT = Path(__file__).resolve().parents[2]
SCHEMAS = ROOT / "contracts/json-schema/v1"
VALID = ROOT / "contracts/examples/v1/valid/catalog.json"
INVALID = ROOT / "contracts/examples/v1/invalid/catalog.json"
EXPECTED = {
    "external-identity.schema.json", "authenticated-session.schema.json",
    "request-security-context.schema.json", "identity-event.schema.json",
    "identity-error.schema.json",
    "device-challenge.schema.json", "device-registration.schema.json",
    "workspace.schema.json", "workspace-membership.schema.json", "tenancy-event.schema.json",
    "effective-policy.schema.json", "knowledge-asset.schema.json",
    "evidence.schema.json", "claim.schema.json", "insight.schema.json",
    "action-request.schema.json", "usage-ledger.schema.json",
    "contract-error.schema.json", "domain-event.schema.json",
    "model-route-decision.schema.json",
    "egress-guard-decision.schema.json",
    "budget-reservation-decision.schema.json",
    "model-gateway-request.schema.json", "model-gateway-result.schema.json",
    "model-stream-event.schema.json",
    "audit-event.schema.json", "audit-access-event.schema.json",
    "cost-ledger-entry.schema.json", "cost-aggregate.schema.json", "cost-threshold-event.schema.json",
    "source-registry-entry.schema.json", "source-lifecycle-event.schema.json",
    "source-connection.schema.json", "connector-page.schema.json", "connector-sync-job.schema.json",
    "connector-sync-event.schema.json", "connector-dead-letter.schema.json",
}

IDENTITY_SCHEMAS = {
    "external-identity.schema.json",
    "authenticated-session.schema.json",
    "request-security-context.schema.json",
}

FORBIDDEN_SESSION_AUTHORITY = {
    "allowed_sources", "allowed_models", "allowed_tools", "allowed_actions",
    "allowed_classifications", "budget_scope", "effective_policy",
}


class ContractViolation(ValueError):
    pass


def load(path: Path):
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def pointer(document, fragment: str):
    value = document
    if fragment:
        if not fragment.startswith("/"):
            raise ContractViolation(f"unsupported fragment #{fragment}")
        for part in fragment[1:].split("/"):
            value = value[part.replace("~1", "/").replace("~0", "~")]
    return value


def resolve(ref: str, base: Path):
    location, fragment = urldefrag(ref)
    target = (base.parent / location).resolve() if location else base
    if not target.is_relative_to(ROOT):
        raise ContractViolation(f"reference leaves repository: {ref}")
    return pointer(load(target), fragment), target


def validate(instance, schema, base: Path, at: str = "$"):
    if "$ref" in schema:
        resolved, target = resolve(schema["$ref"], base)
        validate(instance, resolved, target, at)
    for branch in schema.get("allOf", []):
        validate(instance, branch, base, at)
    if "const" in schema and instance != schema["const"]:
        raise ContractViolation(f"{at}: expected constant {schema['const']!r}")
    if "enum" in schema and instance not in schema["enum"]:
        raise ContractViolation(f"{at}: value is outside enum")

    kind = schema.get("type")
    checks = {
        "object": lambda x: isinstance(x, dict),
        "array": lambda x: isinstance(x, list),
        "string": lambda x: isinstance(x, str),
        "integer": lambda x: isinstance(x, int) and not isinstance(x, bool),
        "number": lambda x: isinstance(x, (int, float)) and not isinstance(x, bool),
        "boolean": lambda x: isinstance(x, bool),
    }
    if kind in checks and not checks[kind](instance):
        raise ContractViolation(f"{at}: expected {kind}")
    if kind == "object":
        properties = schema.get("properties", {})
        missing = set(schema.get("required", [])) - set(instance)
        if missing:
            raise ContractViolation(f"{at}: missing {sorted(missing)}")
        if schema.get("additionalProperties") is False:
            unknown = set(instance) - set(properties)
            if unknown:
                raise ContractViolation(f"{at}: unknown {sorted(unknown)}")
        elif isinstance(schema.get("additionalProperties"), dict):
            for name in set(instance) - set(properties):
                validate(instance[name], schema["additionalProperties"], base, f"{at}.{name}")
        for name, child in properties.items():
            if name in instance:
                validate(instance[name], child, base, f"{at}.{name}")
    elif kind == "array":
        if len(instance) < schema.get("minItems", 0):
            raise ContractViolation(f"{at}: too few items")
        if schema.get("uniqueItems") and len({json.dumps(x, sort_keys=True) for x in instance}) != len(instance):
            raise ContractViolation(f"{at}: duplicate items")
        for index, item in enumerate(instance):
            validate(item, schema.get("items", {}), base, f"{at}[{index}]")
    elif kind == "string":
        if len(instance) < schema.get("minLength", 0):
            raise ContractViolation(f"{at}: string is too short")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            raise ContractViolation(f"{at}: string is too long")
        if "pattern" in schema and not re.search(schema["pattern"], instance):
            raise ContractViolation(f"{at}: pattern mismatch")
        if schema.get("format") == "uuid":
            try:
                UUID(instance)
            except ValueError as exc:
                raise ContractViolation(f"{at}: invalid UUID") from exc
        if schema.get("format") == "date-time":
            try:
                datetime.fromisoformat(instance.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ContractViolation(f"{at}: invalid date-time") from exc
    elif kind in ("integer", "number"):
        if "minimum" in schema and instance < schema["minimum"]:
            raise ContractViolation(f"{at}: below minimum")
        if "maximum" in schema and instance > schema["maximum"]:
            raise ContractViolation(f"{at}: above maximum")


def walk_refs(value, base: Path):
    if isinstance(value, dict):
        if "$ref" in value:
            _, target = resolve(value["$ref"], base)
            if not target.exists():
                raise ContractViolation(f"missing reference {value['$ref']}")
        for child in value.values():
            walk_refs(child, base)
    elif isinstance(value, list):
        for child in value:
            walk_refs(child, base)


def main() -> int:
    available = {path.name for path in SCHEMAS.glob("*.schema.json")} - {"common.schema.json"}
    if available != EXPECTED:
        raise ContractViolation(f"schema catalog mismatch: {sorted(available ^ EXPECTED)}")

    valid = load(VALID)
    invalid = load(INVALID)
    if set(valid) != EXPECTED or set(invalid) != EXPECTED:
        raise ContractViolation("fixtures do not cover the complete schema catalog")
    for name in sorted(EXPECTED):
        schema_path = SCHEMAS / name
        schema = load(schema_path)
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
            raise ContractViolation(f"{name}: unsupported JSON Schema dialect")
        validate(valid[name], schema, schema_path)
        try:
            validate(invalid[name]["payload"], schema, schema_path)
        except ContractViolation:
            pass
        else:
            raise ContractViolation(f"{name}: invalid fixture was accepted")

    for name in IDENTITY_SCHEMAS:
        properties = load(SCHEMAS / name).get("properties", {})
        leaked = FORBIDDEN_SESSION_AUTHORITY & set(properties)
        if leaked:
            raise ContractViolation(f"{name}: embeds policy authority {sorted(leaked)}")

    identity_event = load(SCHEMAS / "identity-event.schema.json")
    event_types = set(identity_event["properties"]["event_type"]["enum"])
    expected_events = {
        "identity.session_established.v1",
        "identity.session_terminated.v1",
        "device.registered.v1",
        "device.revoked.v1",
    }
    if event_types != expected_events:
        raise ContractViolation("identity event catalog mismatch")

    identity_error = load(SCHEMAS / "identity-error.schema.json")
    error_codes = set(identity_error["properties"]["code"]["enum"])
    expected_errors = {
        "IDENTITY_TOKEN_INVALID", "IDENTITY_TOKEN_EXPIRED",
        "IDENTITY_ISSUER_INVALID", "IDENTITY_AUDIENCE_INVALID",
        "IDENTITY_CLAIM_MISSING", "TENANT_CONTEXT_INVALID",
        "TENANT_ACCESS_DENIED", "TENANT_SELECTION_REQUIRED", "DEVICE_PROOF_INVALID",
        "WORKSPACE_ACCESS_DENIED", "DEVICE_NOT_REGISTERED",
        "DEVICE_REVOKED", "IDENTITY_DEPENDENCY_UNAVAILABLE",
        "IDENTITY_CONTRACT_VERSION_UNSUPPORTED",
    }
    if error_codes != expected_errors:
        raise ContractViolation("identity error catalog mismatch")

    openapi_path = ROOT / "contracts/openapi/v1/openapi.json"
    asyncapi_path = ROOT / "contracts/asyncapi/v1/asyncapi.json"
    openapi = load(openapi_path)
    asyncapi = load(asyncapi_path)
    if openapi.get("openapi") != "3.1.0" or openapi.get("info", {}).get("version") != "1.0.0":
        raise ContractViolation("OpenAPI metadata mismatch")
    if asyncapi.get("asyncapi") != "3.0.0" or asyncapi.get("info", {}).get("version") != "1.4.0":
        raise ContractViolation("AsyncAPI metadata mismatch")
    walk_refs(openapi, openapi_path)
    walk_refs(asyncapi, asyncapi_path)
    print(f"OK: {len(EXPECTED)} schemas, {len(EXPECTED) * 2} fixtures, OpenAPI 3.1 and AsyncAPI 3.0")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ContractViolation, KeyError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
