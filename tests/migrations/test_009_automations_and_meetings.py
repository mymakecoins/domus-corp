from pathlib import Path


def test_migration_009_exists_and_valid():
    sql_path = Path("migrations/000025_v1_609_v1_610_automations_and_meetings.up.sql")
    assert sql_path.exists(), "Migration 000025_v1_609_v1_610_automations_and_meetings.up.sql must exist"
    content = sql_path.read_text(encoding="utf-8")
    assert "automation_routines" in content
    assert "automation_runs" in content
    assert "meetings" in content
    assert "meeting_transcripts" in content
    assert "meeting_draft_tasks" in content
    assert "idx_automation_routines_poll" in content
