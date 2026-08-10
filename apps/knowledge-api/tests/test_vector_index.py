from collections.abc import Sequence

import pytest

from domus_knowledge.vector_index import (
    VectorIndexError,
    create_embedding,
    derive_chunks,
    publish_embedding,
)


def test_chunks_are_deterministic_bounded_and_content_free() -> None:
    a = derive_chunks(
        tenant_id="t",
        workspace_id="w",
        asset_id="a",
        version_id="v",
        text="abcdef",
        classification="INTERNAL",
        policy_version="p",
        max_chars=3,
    )
    assert a == derive_chunks(
        tenant_id="t",
        workspace_id="w",
        asset_id="a",
        version_id="v",
        text="abcdef",
        classification="INTERNAL",
        policy_version="p",
        max_chars=3,
    )
    assert a[0].start_offset == 0 and a[1].end_offset == 6 and not hasattr(a[0], "text")
    with pytest.raises(VectorIndexError):
        derive_chunks(
            tenant_id="t",
            workspace_id="w",
            asset_id="a",
            version_id="v",
            text="x",
            classification="INTERNAL",
            policy_version="p",
            max_chars=0,
        )


class Gateway:
    def __init__(self, vector: Sequence[float]) -> None:
        self.vector = vector
        self.called = False

    def embed(self, *, text: str, profile: str) -> Sequence[float]:
        self.called = True
        return self.vector


def test_embedding_requires_gateway_and_exact_dimensions() -> None:
    chunk = derive_chunks(
        tenant_id="t",
        workspace_id="w",
        asset_id="a",
        version_id="v",
        text="hello",
        classification="INTERNAL",
        policy_version="p",
    )[0]
    gateway = Gateway([0.1, 0.2])
    emb = create_embedding(
        chunk,
        text="hello",
        gateway=gateway,
        profile="dev",
        model_version="m1",
        index_version="i1",
        dimensions=2,
    )
    assert gateway.called and emb.chunk_id == chunk.chunk_id
    with pytest.raises(VectorIndexError):
        create_embedding(
            chunk,
            text="hello",
            gateway=gateway,
            profile="dev",
            model_version="m1",
            index_version="i1",
            dimensions=3,
        )
    with pytest.raises(VectorIndexError):
        publish_embedding(
            embedding=emb, chunk=chunk, tenant_id="other", workspace_id="w", policy_version="p"
        )
