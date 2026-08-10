from pathlib import Path

def test_migration_files_exist():
    up_sql = Path("migrations/000022_v1_505_v1_506_quality_loop.up.sql")
    down_sql = Path("migrations/000022_v1_505_v1_506_quality_loop.down.sql")
    assert up_sql.exists()
    assert down_sql.exists()
    assert "feedback_records" in up_sql.read_text()
    assert "quality_loop_suggestions" in up_sql.read_text()
    assert "knowledge_gaps" in up_sql.read_text()
