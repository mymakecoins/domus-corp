#!/usr/bin/env python3
"""
CLI entrypoint for DomusCorp Backup, Restore & Disaster Recovery (V1-702).
Automates backup execution, checksum integrity validation, staging restore, and DR reporting.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add apps/knowledge-api/src to python path
ROOT = Path(__file__).resolve().parents[1]
KNOWLEDGE_SRC = ROOT / "apps" / "knowledge-api" / "src"
if str(KNOWLEDGE_SRC) not in sys.path:
    sys.path.insert(0, str(KNOWLEDGE_SRC))

from domus_knowledge.backup_dr import (
    run_cli_backup,
    run_cli_restore,
    run_cli_verify,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="DomusCorp PostgreSQL, MinIO, and Qdrant Backup & DR Tool"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Backup command
    cmd_backup = subparsers.add_parser("backup", help="Create automated encrypted backup")
    cmd_backup.add_argument("--storage-path", required=True, help="Isolated backup target directory")
    cmd_backup.add_argument("--encryption-key", required=True, help="Encryption secret key")
    cmd_backup.add_argument("--label", default="automated_backup", help="Label for this backup run")
    cmd_backup.add_argument("--pg-dsn", default="", help="PostgreSQL connection DSN")
    cmd_backup.add_argument("--minio-url", default="", help="MinIO endpoint URL")
    cmd_backup.add_argument("--qdrant-url", default="", help="Qdrant endpoint URL")

    # Verify command
    cmd_verify = subparsers.add_parser("verify", help="Verify checksum integrity of backup manifest")
    cmd_verify.add_argument("--manifest-path", required=True, help="Path to manifest JSON file")
    cmd_verify.add_argument("--encryption-key", required=True, help="Encryption secret key")

    # Restore command
    cmd_restore = subparsers.add_parser("restore", help="Execute staging restore & DR validation")
    cmd_restore.add_argument("--manifest-path", required=True, help="Path to manifest JSON file")
    cmd_restore.add_argument("--encryption-key", required=True, help="Encryption secret key")
    cmd_restore.add_argument("--target-env", default="staging", help="Target environment for restore")

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "backup":
        manifest = run_cli_backup(
            storage_path=args.storage_path,
            encryption_key=args.encryption_key,
            pg_dsn=args.pg_dsn,
            minio_url=args.minio_url,
            qdrant_url=args.qdrant_url,
            label=args.label,
        )
        print(f"SUCCESS: Backup completed successfully. Manifest created at {manifest.manifest_path}")
        print(f"Backup ID: {manifest.backup_id} | Checksum: {manifest.checksum_sha256[:16]}...")
        return 0

    elif args.command == "verify":
        try:
            valid = run_cli_verify(
                manifest_path=args.manifest_path,
                encryption_key=args.encryption_key,
            )
            if valid:
                print("SUCCESS: Backup manifest and encrypted artifacts integrity VERIFIED.")
                return 0
            else:
                print("ERROR: Backup integrity check FAILED. Corrupted or missing files.")
                return 1
        except Exception as e:
            print(f"ERROR: Verification failed with exception: {e}")
            return 1

    elif args.command == "restore":
        try:
            success = run_cli_restore(
                manifest_path=args.manifest_path,
                encryption_key=args.encryption_key,
                target_env=args.target_env,
            )
            if success:
                print(f"SUCCESS: Disaster recovery restore to {args.target_env} completed successfully.")
                return 0
            else:
                print(f"ERROR: Disaster recovery restore to {args.target_env} failed.")
                return 1
        except Exception as e:
            print(f"ERROR: Restore failed with exception: {e}")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
