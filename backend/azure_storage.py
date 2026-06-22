"""
Azure Blob Storage wrapper using SAS token authentication.

Environment variables:
    AZURE_ACCOUNT_NAME      — storage account name (e.g. techdomeblob)
    AZURE_CONTAINER         — container name (e.g. saralfunding-docs)
    AZURE_SAS_TOKEN         — SAS token string (without leading ?)

When Azure is not configured, files are saved to LOCAL_UPLOAD_DIR (local dev fallback).
"""

import os
import uuid
import re
import logging
import pathlib

from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles

AZURE_ACCOUNT_NAME = os.environ.get("AZURE_ACCOUNT_NAME", "")
AZURE_CONTAINER    = os.environ.get("AZURE_CONTAINER", "saralfunding-docs")
AZURE_SAS_TOKEN    = os.environ.get("AZURE_SAS_TOKEN", "")

AZURE_ENABLED = bool(AZURE_ACCOUNT_NAME and AZURE_SAS_TOKEN)

# Local fallback — files saved here when Azure is not configured
LOCAL_UPLOAD_DIR = pathlib.Path(os.environ.get("LOCAL_UPLOAD_DIR", "uploads"))
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _get_blob_service_client():
    if not AZURE_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Azure Storage not configured. Set AZURE_ACCOUNT_NAME and AZURE_SAS_TOKEN.",
        )
    try:
        from azure.storage.blob import BlobServiceClient
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="azure-storage-blob not installed. Run: pip install azure-storage-blob",
        )
    account_url = f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net"
    return BlobServiceClient(account_url=account_url, credential=AZURE_SAS_TOKEN)


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


async def upload_to_azure(file_bytes: bytes, doc_type: str, user_id: str, original_filename: str) -> dict:
    ext = ("." + original_filename.rsplit(".", 1)[-1].lower()) if "." in original_filename else ""
    slug = _slugify(doc_type)
    blob_name = f"users/{user_id}/{slug}/{uuid.uuid4()}{ext}"

    if not AZURE_ENABLED:
        # ── Local dev fallback ──────────────────────────────────────────────
        local_path = LOCAL_UPLOAD_DIR / blob_name.replace("/", "_")
        local_path.write_bytes(file_bytes)
        logging.info(f"[LOCAL] Saved upload to {local_path}")
        return {"blob_name": blob_name, "blob_url": f"/uploads/{local_path.name}"}

    content_type = "application/octet-stream"
    if ext == ".pdf":
        content_type = "application/pdf"
    elif ext in (".jpg", ".jpeg"):
        content_type = "image/jpeg"
    elif ext == ".png":
        content_type = "image/png"

    try:
        from azure.storage.blob import ContentSettings
        client = _get_blob_service_client()
        blob_client = client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name)
        blob_client.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Azure upload failed: {exc}")

    blob_url = f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/{blob_name}"
    return {"blob_name": blob_name, "blob_url": blob_url}


async def delete_from_azure(blob_name: str) -> bool:
    if not AZURE_ENABLED:
        # Delete local fallback file
        local_path = LOCAL_UPLOAD_DIR / blob_name.replace("/", "_")
        if local_path.exists():
            local_path.unlink()
        return True
    try:
        client = _get_blob_service_client()
        client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name).delete_blob()
        return True
    except Exception:
        return False


def get_sas_url(blob_name: str, expiry_hours: int = 1) -> str:
    if not AZURE_ENABLED:
        # Return local file URL for dev
        local_path = LOCAL_UPLOAD_DIR / blob_name.replace("/", "_")
        return f"/uploads/{local_path.name}"
    token = AZURE_SAS_TOKEN.lstrip("?")
    return f"https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/{blob_name}?{token}"
