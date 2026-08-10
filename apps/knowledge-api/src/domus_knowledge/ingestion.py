"""Deterministic, fail-closed ingestion and normalization domain."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import socket
from concurrent.futures import ProcessPoolExecutor, TimeoutError
from dataclasses import dataclass
from typing import Literal, Protocol

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from .objects import Classification, ObjectRecord, ObjectStore

JobState = Literal[
    "QUEUED", "RUNNING", "SUCCEEDED", "RETRY_WAIT", "FAILED", "QUARANTINED", "CANCELLED"
]
MAX_OUTPUT_BYTES = 50 * 1024 * 1024
MAX_TEXT_CHARS = 10_000_000
MAX_PDF_PAGES = 2_000
MAX_JSON_DEPTH = 64
MAX_JSON_NODES = 1_000_000
MAX_CSV_ROWS = 1_000_000
MAX_CSV_COLUMNS = 1_000
MAX_CSV_FIELD_BYTES = 1024 * 1024
SHA256 = re.compile(r"^sha256:[a-f0-9]{64}$")


@dataclass(frozen=True)
class IngestionJob:
    job_id: str
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    asset_version_id: str
    bucket: str
    object_key: str
    object_version: str
    original_checksum: str
    media_type: str
    classification: Classification
    policy_version: str
    parser_profile: str
    parser_version: str
    request_id: str
    trace_id: str
    fencing_token: int

    @classmethod
    def from_object(
        cls,
        *,
        job_id: str,
        record: ObjectRecord,
        policy_version: str,
        parser_profile: str,
        parser_version: str,
        request_id: str,
        trace_id: str,
        fencing_token: int,
    ) -> IngestionJob:
        identity = record.identity
        return cls(
            job_id,
            identity.tenant_id,
            identity.workspace_id,
            identity.source_id,
            identity.asset_id,
            identity.version_id,
            record.bucket,
            record.object_key,
            record.object_version,
            record.checksum,
            record.media_type,
            record.classification,
            policy_version,
            parser_profile,
            parser_version,
            request_id,
            trace_id,
            fencing_token,
        )

    def idempotency_key(self) -> tuple[str, str, str, str, str]:
        return (
            self.tenant_id,
            self.workspace_id,
            self.asset_version_id,
            self.parser_profile,
            self.parser_version,
        )


@dataclass(frozen=True)
class NormalizedUnit:
    unit_id: str
    position: int
    label: str
    start_offset: int
    end_offset: int


@dataclass(frozen=True)
class NormalizedManifest:
    asset_id: str
    asset_version_id: str
    parser_profile: str
    parser_version: str
    media_type: str
    kind: Literal["text", "pages", "records"]
    language: str
    language_confidence: float
    classification: Classification
    original_checksum: str
    normalized_checksum: str
    artifact_key: str
    size_bytes: int
    units: tuple[NormalizedUnit, ...]
    warnings: tuple[str, ...] = ()


@dataclass(frozen=True)
class IngestionResult:
    job_id: str
    state: JobState
    manifest: NormalizedManifest | None
    error_code: str | None = None


@dataclass(frozen=True)
class ParsedContent:
    content: bytes
    kind: Literal["text", "pages", "records"]
    units: tuple[tuple[str, int, int], ...]


class Parser(Protocol):
    def parse(self, data: bytes) -> ParsedContent: ...


class ArtifactStore(Protocol):
    def put_immutable(self, key: str, content: bytes, checksum: str) -> None: ...


class IngestionRepository(Protocol):
    def find(self, key: tuple[str, str, str, str, str]) -> tuple[str, IngestionResult] | None: ...
    def begin(self, job: IngestionJob) -> None: ...
    def succeed(self, job: IngestionJob, result: IngestionResult) -> None: ...


class TextParser:
    def parse(self, data: bytes) -> ParsedContent:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValueError("INVALID_ENCODING") from error
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        if len(text) > MAX_TEXT_CHARS:
            raise ValueError("PARSER_RESOURCE_LIMIT")
        content = text.encode()
        return ParsedContent(content, "text", (("document", 0, len(content)),))


def _json_size(value: object, depth: int = 0) -> int:
    if depth > MAX_JSON_DEPTH:
        raise ValueError("PARSER_RESOURCE_LIMIT")
    if isinstance(value, dict):
        return 1 + sum(
            _json_size(key, depth + 1) + _json_size(item, depth + 1) for key, item in value.items()
        )
    if isinstance(value, list):
        return 1 + sum(_json_size(item, depth + 1) for item in value)
    return 1


class JsonParser:
    def parse(self, data: bytes) -> ParsedContent:
        try:
            value = json.loads(data.decode("utf-8-sig"))
        except UnicodeDecodeError as error:
            raise ValueError("INVALID_ENCODING") from error
        except json.JSONDecodeError as error:
            raise ValueError("CORRUPT_CONTENT") from error
        if _json_size(value) > MAX_JSON_NODES:
            raise ValueError("PARSER_RESOURCE_LIMIT")
        content = json.dumps(
            value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode()
        if len(content) > MAX_OUTPUT_BYTES:
            raise ValueError("PARSER_RESOURCE_LIMIT")
        return ParsedContent(content, "records", (("record:0", 0, len(content)),))


class CsvParser:
    def parse(self, data: bytes) -> ParsedContent:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValueError("INVALID_ENCODING") from error
        try:
            rows = list(csv.reader(io.StringIO(text, newline=""), strict=True))
        except csv.Error as error:
            raise ValueError("CORRUPT_CONTENT") from error
        if not rows or not rows[0]:
            raise ValueError("CORRUPT_CONTENT")
        width = len(rows[0])
        if width > MAX_CSV_COLUMNS or len(rows) - 1 > MAX_CSV_ROWS:
            raise ValueError("PARSER_RESOURCE_LIMIT")
        if any(len(row) != width for row in rows):
            raise ValueError("CORRUPT_CONTENT")
        if any(len(field.encode()) > MAX_CSV_FIELD_BYTES for row in rows for field in row):
            raise ValueError("PARSER_RESOURCE_LIMIT")
        records = [dict(zip(rows[0], row, strict=True)) for row in rows[1:]]
        lines = [
            json.dumps(record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            for record in records
        ]
        content = ("\n".join(lines) + ("\n" if lines else "")).encode()
        offsets: list[tuple[str, int, int]] = []
        start = 0
        for position, line in enumerate(lines):
            end = start + len(line.encode())
            offsets.append((f"record:{position}", start, end))
            start = end + 1
        return ParsedContent(content, "records", tuple(offsets))


class PdfParser:
    def parse(self, data: bytes) -> ParsedContent:
        try:
            reader = PdfReader(io.BytesIO(data), strict=True)
            if reader.is_encrypted:
                raise ValueError("ENCRYPTED_CONTENT")
            if len(reader.pages) > MAX_PDF_PAGES:
                raise ValueError("PARSER_RESOURCE_LIMIT")
            texts = [
                (page.extract_text() or "").replace("\r\n", "\n").replace("\r", "\n")
                for page in reader.pages
            ]
        except ValueError:
            raise
        except (PdfReadError, OSError, KeyError, TypeError) as error:
            raise ValueError("CORRUPT_CONTENT") from error
        content = "\n\f\n".join(texts).encode()
        if len(content) > MAX_OUTPUT_BYTES:
            raise ValueError("PARSER_RESOURCE_LIMIT")
        units: list[tuple[str, int, int]] = []
        start = 0
        for position, text in enumerate(texts):
            end = start + len(text.encode())
            units.append((f"page:{position + 1}", start, end))
            start = end + 3
        return ParsedContent(content, "pages", tuple(units))


def _parse_isolated(media_type: str, data: bytes) -> ParsedContent:
    """Child entrypoint: parsing has no network capability or inherited credentials."""
    for name in tuple(__import__("os").environ):
        if any(marker in name.upper() for marker in ("TOKEN", "SECRET", "PASSWORD", "API_KEY")):
            __import__("os").environ.pop(name, None)

    def denied_socket(*args: object, **kwargs: object) -> socket.socket:
        del args, kwargs
        raise PermissionError("PARSER_NETWORK_DENIED")

    socket.socket = denied_socket  # type: ignore[misc,assignment]
    direct: dict[str, Parser] = {
        "text/plain": TextParser(),
        "application/json": JsonParser(),
        "text/csv": CsvParser(),
        "application/pdf": PdfParser(),
    }
    try:
        return direct[media_type].parse(data)
    except KeyError as error:
        raise ValueError("UNSUPPORTED_MEDIA_TYPE") from error


class IsolatedParser:
    def __init__(self, media_type: str, timeout_seconds: float = 120.0):
        self._media_type = media_type
        self._timeout_seconds = timeout_seconds

    def parse(self, data: bytes) -> ParsedContent:
        try:
            with ProcessPoolExecutor(max_workers=1, max_tasks_per_child=1) as executor:
                return executor.submit(_parse_isolated, self._media_type, data).result(
                    timeout=self._timeout_seconds
                )
        except TimeoutError as error:
            raise ValueError("PARSER_TIMEOUT") from error
        except (BrokenPipeError, ChildProcessError) as error:
            raise RuntimeError("PARSER_UNAVAILABLE") from error


class ParserRegistry:
    def __init__(self, parsers: dict[str, Parser]):
        self._parsers = parsers

    @classmethod
    def defaults(cls) -> ParserRegistry:
        media_types = ("text/plain", "application/json", "text/csv", "application/pdf")
        return cls({media_type: IsolatedParser(media_type) for media_type in media_types})

    def get(self, media_type: str) -> Parser:
        try:
            return self._parsers[media_type]
        except KeyError as error:
            raise ValueError("UNSUPPORTED_MEDIA_TYPE") from error


class MemoryArtifactStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def put_immutable(self, key: str, content: bytes, checksum: str) -> None:
        if (
            len(content) > MAX_OUTPUT_BYTES
            or f"sha256:{hashlib.sha256(content).hexdigest()}" != checksum
        ):
            raise RuntimeError("OUTPUT_INVALID")
        existing = self.objects.get(key)
        if existing is not None and existing != content:
            raise ValueError("INGESTION_CONFLICT")
        self.objects[key] = content

    def read(self, key: str) -> bytes:
        return self.objects[key]


class MemoryIngestionRepository:
    def __init__(self) -> None:
        self.results: dict[tuple[str, str, str, str, str], tuple[str, IngestionResult]] = {}
        self.events: list[str] = []
        self.highest_fence = 0

    def find(self, key: tuple[str, str, str, str, str]) -> tuple[str, IngestionResult] | None:
        return self.results.get(key)

    def begin(self, job: IngestionJob) -> None:
        if job.fencing_token < self.highest_fence:
            raise ValueError("STALE_FENCE")
        self.highest_fence = job.fencing_token
        self.events.extend(("knowledge.ingestion.queued.v1", "knowledge.ingestion.started.v1"))

    def succeed(self, job: IngestionJob, result: IngestionResult) -> None:
        self.results[job.idempotency_key()] = (job.original_checksum, result)
        self.events.append("knowledge.ingestion.succeeded.v1")


def _language(data: bytes) -> tuple[str, float]:
    text = data.decode("utf-8", errors="ignore").lower()
    portuguese = sum(f" {word} " in f" {text} " for word in ("de", "que", "para", "com", "não"))
    english = sum(f" {word} " in f" {text} " for word in ("the", "and", "for", "with", "not"))
    if max(portuguese, english) < 2:
        return "und", 0.0
    return ("pt" if portuguese > english else "en", min(1.0, max(portuguese, english) / 5))


def process_ingestion(
    job: IngestionJob,
    record: ObjectRecord,
    object_store: ObjectStore,
    artifact_store: ArtifactStore,
    repository: IngestionRepository,
    parsers: ParserRegistry,
) -> IngestionResult:
    if record.state != "AVAILABLE" or record.bucket != "originals":
        raise ValueError("OBJECT_UNAVAILABLE")
    if (
        job.asset_version_id != record.identity.version_id
        or job.object_version != record.object_version
        or job.original_checksum != record.checksum
        or not SHA256.fullmatch(record.checksum)
    ):
        raise ValueError("INGESTION_CONFLICT")
    existing = repository.find(job.idempotency_key())
    if existing is not None:
        if existing[0] != record.checksum:
            raise ValueError("INGESTION_CONFLICT")
        return existing[1]
    repository.begin(job)
    data = b"".join(
        object_store.read_version(record.bucket, record.object_key, record.object_version)
    )
    actual = f"sha256:{hashlib.sha256(data).hexdigest()}"
    if len(data) != record.size_bytes or actual != record.checksum:
        raise RuntimeError("INTEGRITY_MISMATCH")
    parsed = parsers.get(record.media_type).parse(data)
    normalized_checksum = f"sha256:{hashlib.sha256(parsed.content).hexdigest()}"
    artifact_key = (
        f"tenant/{job.tenant_id}/workspace/{job.workspace_id}/asset/{job.asset_id}/"
        f"version/{job.asset_version_id}/parser/{job.parser_profile}/"
        f"{job.parser_version}/{normalized_checksum[7:]}"
    )
    artifact_store.put_immutable(artifact_key, parsed.content, normalized_checksum)
    language, confidence = _language(parsed.content)
    units = tuple(
        NormalizedUnit(
            hashlib.sha256(f"{normalized_checksum}:{position}".encode()).hexdigest(),
            position,
            label,
            start,
            end,
        )
        for position, (label, start, end) in enumerate(parsed.units)
    )
    manifest = NormalizedManifest(
        job.asset_id,
        job.asset_version_id,
        job.parser_profile,
        job.parser_version,
        record.media_type,
        parsed.kind,
        language,
        confidence,
        record.classification,
        record.checksum,
        normalized_checksum,
        artifact_key,
        len(parsed.content),
        units,
    )
    result = IngestionResult(job.job_id, "SUCCEEDED", manifest)
    repository.succeed(job, result)
    return result
