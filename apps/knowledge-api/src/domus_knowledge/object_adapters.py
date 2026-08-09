"""Test doubles and an SDK-neutral S3 adapter."""

from __future__ import annotations

import hashlib
import tempfile
from collections.abc import Iterable
from typing import Literal, Protocol, cast

from .objects import StoredObject

EICAR = b"EICAR-STANDARD-ANTIVIRUS-TEST-FILE"


class DeterministicScanner:
    def scan(
        self, chunks: Iterable[bytes], media_type: str
    ) -> Literal["CLEAN", "MALWARE", "INCONCLUSIVE"]:
        del media_type
        return "MALWARE" if EICAR in b"".join(chunks) else "CLEAN"


class MemoryObjectStore:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str, str], bytes] = {}

    def put_immutable(
        self, bucket: str, key: str, chunks: Iterable[bytes], checksum: str
    ) -> StoredObject:
        content = b"".join(chunks)
        identity = (bucket, key, "v1")
        if identity in self.objects:
            raise ValueError("KNOWLEDGE_OBJECT_OVERWRITE_DENIED")
        self.objects[identity] = content
        return StoredObject("v1", len(content), checksum, "AES256")

    def read_version(self, bucket: str, key: str, object_version: str) -> Iterable[bytes]:
        yield self.objects[(bucket, key, object_version)]

    def delete_version(self, bucket: str, key: str, object_version: str) -> None:
        self.objects.pop((bucket, key, object_version), None)

    def version_exists(self, bucket: str, key: str, object_version: str) -> bool:
        return (bucket, key, object_version) in self.objects


class S3Client(Protocol):
    def put_object(self, **kwargs: object) -> dict[str, object]: ...
    def get_object(self, **kwargs: object) -> dict[str, object]: ...
    def delete_object(self, **kwargs: object) -> dict[str, object]: ...
    def head_object(self, **kwargs: object) -> dict[str, object]: ...


class StreamingBody(Protocol):
    def read(self, size: int) -> bytes: ...


class S3ObjectStore:
    """Wraps a boto-compatible injected client without importing credentials or an SDK."""

    def __init__(
        self, client: S3Client, *, endpoint_url: str, allow_insecure_synthetic_dev: bool = False
    ) -> None:
        if not endpoint_url.startswith("https://") and not allow_insecure_synthetic_dev:
            raise ValueError("KNOWLEDGE_STORAGE_TLS_REQUIRED")
        self._client = client

    def put_immutable(
        self, bucket: str, key: str, chunks: Iterable[bytes], checksum: str
    ) -> StoredObject:
        digest = hashlib.sha256()
        size = 0
        with tempfile.SpooledTemporaryFile(max_size=1024 * 1024) as body:
            for chunk in chunks:
                size += len(chunk)
                digest.update(chunk)
                body.write(chunk)
            body.seek(0)
            response = self._client.put_object(
                Bucket=bucket,
                Key=key,
                Body=body,
                IfNoneMatch="*",
                ChecksumSHA256=checksum.removeprefix("sha256:"),
                ServerSideEncryption="aws:kms",
            )
        version = response.get("VersionId")
        encryption = response.get("ServerSideEncryption")
        if not isinstance(version, str) or not isinstance(encryption, str):
            raise RuntimeError("KNOWLEDGE_STORAGE_RESPONSE_INVALID")
        actual = f"sha256:{digest.hexdigest()}"
        return StoredObject(version, size, actual, encryption)

    def read_version(self, bucket: str, key: str, object_version: str) -> Iterable[bytes]:
        response = self._client.get_object(Bucket=bucket, Key=key, VersionId=object_version)
        body = cast(StreamingBody | None, response.get("Body"))
        if body is None:
            raise RuntimeError("KNOWLEDGE_RESTORE_RESPONSE_INVALID")
        while chunk := body.read(8 * 1024 * 1024):
            yield chunk

    def delete_version(self, bucket: str, key: str, object_version: str) -> None:
        self._client.delete_object(Bucket=bucket, Key=key, VersionId=object_version)

    def version_exists(self, bucket: str, key: str, object_version: str) -> bool:
        try:
            self._client.head_object(Bucket=bucket, Key=key, VersionId=object_version)
        except Exception as error:
            if "404" in str(error) or "NotFound" in str(error):
                return False
            raise
        return True
