from pathlib import Path


def test_migration_000020_sql_has_no_invalid_grant_on_knowledge_chunk():
    migration_path = Path("migrations/000020_v1_410_vector_index.up.sql")
    sql = migration_path.read_text()

    # Assert GRANT UPDATE(status) is NOT executed on knowledge_chunk
    assert "UPDATE(status) ON knowledge_chunk" not in sql, (
        "knowledge_chunk does not have a status column; GRANT UPDATE(status) on knowledge_chunk is invalid SQL"
    )
    # Assert source_id column exists in knowledge_chunk definition
    assert "source_id" in sql, "knowledge_chunk table definition must include source_id"


def test_chunk_dataclass_includes_source_id_and_validity():
    import inspect

    from domus_knowledge.vector_index import Chunk

    sig = inspect.signature(Chunk)
    assert "source_id" in sig.parameters
    assert "valid_until" in sig.parameters
