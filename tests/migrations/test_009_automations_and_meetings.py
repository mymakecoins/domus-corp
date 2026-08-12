from pathlib import Path

def test_migration_009_exists_and_valid():
    sql_path = Path("migrations/009_automations_and_meetings.sql")
    assert sql_path.exists(), "Migration 009_automations_and_meetings.sql must exist"
    content = sql_path.read_text(encoding="utf-8")
    assert "automation_routines" in content
    assert "automation_runs" in content
    assert "meetings" in content
    assert "meeting_transcripts" in content
    assert "meeting_draft_tasks" in content
    assert "idx_automation_routines_poll" in content
