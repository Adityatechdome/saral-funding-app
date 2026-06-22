"""
Daily MongoDB backup to Azure Blob Storage.

Collections exported as gzipped JSON, uploaded to:
  backups/YYYY-MM-DD/collection_name.json.gz

Run manually:   python backup.py
Run on Render:  add a Cron Job → python backup.py (daily at 02:00 IST)

Keeps last 30 days of backups. Older ones are deleted automatically.
"""
import os
import gzip
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import pymongo
from azure.storage.blob import BlobServiceClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MONGO_URL     = os.environ["MONGO_URL"]
DB_NAME       = os.environ["DB_NAME"]
AZURE_ACCOUNT = os.environ["AZURE_ACCOUNT_NAME"]
AZURE_CONTAINER = os.environ.get("AZURE_BACKUP_CONTAINER", os.environ.get("AZURE_CONTAINER", "saralfunding-docs"))
AZURE_SAS     = os.environ["AZURE_SAS_TOKEN"]

BACKUP_RETENTION_DAYS = int(os.environ.get("BACKUP_RETENTION_DAYS", "30"))

# Collections to back up
COLLECTIONS = [
    "users",
    "business_profiles",
    "funding_assessments",
    "scheme_matches",
    "documents",
    "consultations",
    "leads",
    "notifications",
    "audit_logs_archive",
    "admin_recommendations",
    "schemes",
    "banks",
    "admin_config",
]


def _blob_client() -> BlobServiceClient:
    account_url = f"https://{AZURE_ACCOUNT}.blob.core.windows.net"
    sas = AZURE_SAS if AZURE_SAS.startswith("?") else "?" + AZURE_SAS
    return BlobServiceClient(account_url=account_url + sas)


def _ensure_container(client: BlobServiceClient) -> None:
    try:
        client.create_container(AZURE_CONTAINER)
        logger.info(f"Created backup container: {AZURE_CONTAINER}")
    except Exception:
        pass  # Already exists


def _export_collection(db, name: str) -> bytes:
    """Dump a collection to gzipped JSON bytes."""
    docs = list(db[name].find({}, {"_id": 0}))
    raw = json.dumps(docs, default=str, ensure_ascii=False, indent=2).encode("utf-8")
    return gzip.compress(raw)


def _upload(client: BlobServiceClient, date_str: str, name: str, data: bytes) -> None:
    blob_name = f"backups/{date_str}/{name}.json.gz"
    blob = client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name)
    blob.upload_blob(data, overwrite=True)
    logger.info(f"  Uploaded {blob_name} ({len(data) // 1024} KB)")


def _delete_old_backups(client: BlobServiceClient) -> None:
    """Delete backup folders older than BACKUP_RETENTION_DAYS."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=BACKUP_RETENTION_DAYS)
    container = client.get_container_client(AZURE_CONTAINER)
    try:
        blobs = container.list_blobs(name_starts_with="backups/")
        deleted = 0
        for blob in blobs:
            # blob.name = backups/YYYY-MM-DD/collection.json.gz
            parts = blob.name.split("/")
            if len(parts) < 2:
                continue
            try:
                blob_date = datetime.strptime(parts[1], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if blob_date < cutoff:
                    container.delete_blob(blob.name)
                    deleted += 1
            except ValueError:
                pass
        if deleted:
            logger.info(f"Deleted {deleted} old backup blobs (>{BACKUP_RETENTION_DAYS} days)")
    except Exception as e:
        logger.warning(f"Cleanup failed (non-fatal): {e}")


def run_backup() -> None:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    logger.info(f"=== Saral Funding backup starting: {date_str} ===")

    mongo = pymongo.MongoClient(MONGO_URL)
    db = mongo[DB_NAME]

    blob_client = _blob_client()
    _ensure_container(blob_client)

    success, failed = 0, 0
    for name in COLLECTIONS:
        try:
            data = _export_collection(db, name)
            _upload(blob_client, date_str, name, data)
            success += 1
        except Exception as e:
            logger.error(f"  FAILED {name}: {e}")
            failed += 1

    mongo.close()

    _delete_old_backups(blob_client)

    logger.info(f"=== Backup complete: {success} ok, {failed} failed ===")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    run_backup()
