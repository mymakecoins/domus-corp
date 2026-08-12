"""
Unit and integration tests for V1-702: Backup, Restore and Disaster Recovery (PostgreSQL, MinIO, Qdrant).
Follows TDD rules: validates encryption, checksum integrity, isolated retention, RTO/RPO limits, and failure alerting.
"""

import pytest
import os
import tempfile
import json
from pathlib import Path

from domus_knowledge.backup_dr import (
    BackupConfig,
    BackupManager,
    RestoreManager,
    AlertManager,
    BackupManifest,
    BackupCoverageError,
    IntegrityCheckResult,
    RestoreResult,
)

@pytest.fixture
def temp_backup_dir(tmp_path):
    storage = tmp_path / "isolated_backup_storage"
    storage.mkdir()
    return storage

@pytest.fixture
def backup_config(temp_backup_dir):
    return BackupConfig(
        storage_path=str(temp_backup_dir),
        encryption_key="secret-encryption-key-v1-702-test",
        retention_count=2,
        target_rto_seconds=900,  # 15 min
        target_rpo_seconds=3600, # 1 hr
        postgres_dsn="postgresql://user:pass@localhost:5432/domus_db",
        minio_endpoint="http://localhost:9000",
        qdrant_endpoint="http://localhost:6333",
        alert_owner="sre-team@domuscorp.com",
    )

def test_backup_creation_encrypted_checksum_and_retention(backup_config, temp_backup_dir):
    """
    Test that BackupManager creates encrypted artifacts for Postgres, MinIO, and Qdrant,
    computes SHA-256 checksums in the manifest, and enforces retention limits.
    """
    manager = BackupManager(backup_config)
    
    # Mock data source payload for PostgreSQL, MinIO, and Qdrant
    mock_db_data = {"tables": ["users", "audit_log"], "rows": 150}
    mock_minio_data = {"buckets": ["documents"], "objects": [{"key": "doc1.pdf", "version": "v1", "acl": "private"}]}
    mock_qdrant_data = {"collections": ["knowledge_vectors"], "points_count": 500}

    # Execute 3 sequential backups to test retention (retention_count=2)
    manifests = []
    for i in range(3):
        manifest = manager.create_backup(
            postgres_data=mock_db_data,
            minio_data=mock_minio_data,
            qdrant_data=mock_qdrant_data,
            label=f"backup_run_{i+1}"
        )
        manifests.append(manifest)

    # 1. Manifest structure check
    latest_manifest = manifests[-1]
    assert latest_manifest.status == "COMPLETED"
    assert "postgres" in latest_manifest.artifacts
    assert "minio" in latest_manifest.artifacts
    assert "qdrant" in latest_manifest.artifacts
    assert latest_manifest.checksum_sha256 != ""
    
    # 2. Check encrypted artifacts on disk
    pg_artifact = Path(latest_manifest.artifacts["postgres"]["path"])
    assert pg_artifact.exists()
    content = pg_artifact.read_bytes()
    # Content must be encrypted (not raw JSON string)
    assert b"users" not in content

    # 3. Retention check: retention_count is 2, so only 2 backup runs should remain in storage
    remaining_manifest_files = list(temp_backup_dir.glob("manifest_*.json"))
    assert len(remaining_manifest_files) == 2

def test_backup_integrity_verification(backup_config):
    """
    Test checksum verification of backup artifacts.
    Valid manifest passes integrity; tampered file fails integrity.
    """
    manager = BackupManager(backup_config)
    manifest = manager.create_backup(
        postgres_data={"tables": ["audit"]},
        minio_data={"buckets": ["b1"]},
        qdrant_data={"collections": ["c1"]}
    )

    # Valid check
    check_result = manager.verify_integrity(manifest)
    assert check_result.is_valid is True
    assert check_result.corrupted_files == []

    # Tamper with an artifact file
    pg_path = Path(manifest.artifacts["postgres"]["path"])
    pg_path.write_bytes(b"corrupted_tampered_payload_data")

    # Re-verify integrity
    check_result_tampered = manager.verify_integrity(manifest)
    assert check_result_tampered.is_valid is False
    assert "postgres" in check_result_tampered.corrupted_files

def test_restore_routine_and_dr_validation(backup_config):
    """
    Test Disaster Recovery restore to staging environment.
    Verifies data coherence (PG, MinIO, Qdrant) and RTO/RPO SLA compliance.
    """
    backup_mgr = BackupManager(backup_config)
    manifest = backup_mgr.create_backup(
        postgres_data={"schema": "v1.0", "tables": {"audit": 10}},
        minio_data={"buckets": ["vault"], "metadata": {"acl": "immutable"}},
        qdrant_data={"collections": ["kb"], "vectors": 42}
    )

    restore_mgr = RestoreManager(backup_config)
    restore_result = restore_mgr.execute_restore(manifest, target_environment="staging")

    assert restore_result.success is True
    assert restore_result.restored_postgres["tables"]["audit"] == 10
    assert restore_result.restored_minio["buckets"] == ["vault"]
    assert restore_result.restored_qdrant["vectors"] == 42
    assert restore_result.rto_seconds <= backup_config.target_rto_seconds
    assert restore_result.rpo_seconds <= backup_config.target_rpo_seconds
    assert restore_result.rto_sla_met is True
    assert restore_result.rpo_sla_met is True

def test_failed_backup_alerts_owner_and_denies_coverage(backup_config):
    """
    Test that corrupted or failed backups trigger alerts and raise BackupCoverageError
    when attempting to declare coverage.
    """
    alert_mgr = AlertManager()
    backup_mgr = BackupManager(backup_config, alert_manager=alert_mgr)

    manifest = backup_mgr.create_backup(
        postgres_data={"test": 1},
        minio_data={"test": 2},
        qdrant_data={"test": 3}
    )

    # Tamper artifact
    Path(manifest.artifacts["postgres"]["path"]).write_bytes(b"corrupted")

    # Attempting to declare coverage on a corrupted backup must alert and fail
    with pytest.raises(BackupCoverageError) as exc_info:
        backup_mgr.declare_coverage(manifest)
    
    assert "Coverage denied" in str(exc_info.value)
    assert len(alert_mgr.alerts_sent) > 0
    assert alert_mgr.alerts_sent[0]["owner"] == backup_config.alert_owner
    assert alert_mgr.alerts_sent[0]["severity"] == "CRITICAL"

def test_cli_backup_and_restore_workflow(backup_config, temp_backup_dir, monkeypatch):
    """
    Test the CLI workflow functions (run_cli_backup, run_cli_verify, run_cli_restore).
    """
    from domus_knowledge.backup_dr import run_cli_backup, run_cli_verify, run_cli_restore

    # 1. Run CLI backup
    manifest = run_cli_backup(
        storage_path=str(temp_backup_dir),
        encryption_key="secret-key-cli",
        pg_dsn="postgres://localhost/db",
        minio_url="http://minio:9000",
        qdrant_url="http://qdrant:6333",
        label="cli_test"
    )
    assert manifest.status == "COMPLETED"

    # 2. Run CLI verify
    verify_ok = run_cli_verify(
        manifest_path=manifest.manifest_path,
        encryption_key="secret-key-cli"
    )
    assert verify_ok is True

    # 3. Run CLI restore
    restore_ok = run_cli_restore(
        manifest_path=manifest.manifest_path,
        encryption_key="secret-key-cli",
        target_env="staging"
    )
    assert restore_ok is True

