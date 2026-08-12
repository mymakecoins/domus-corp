BEGIN;
DROP TABLE IF EXISTS meeting_draft_tasks CASCADE;
DROP TABLE IF EXISTS meeting_transcripts CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS automation_runs CASCADE;
DROP TABLE IF EXISTS automation_routines CASCADE;
DELETE FROM schema_migrations WHERE version=25;
COMMIT;
