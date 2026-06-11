"""
Azure Blob Storage service wrapper for Saral Funding document uploads.

Requires:
    pip install azure-storage-blob

Environment variables:
    AZURE_STORAGE_CONNECTION_STRING  — full Azure connection string
    AZURE_STORAGE_CONTAINER          — container name (default: saral-documents)
"""

import os
import uuid
import re
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

AZURE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "saral-documents")


def _get_blob_service_client():
    """Return a BlobServiceClient. Raises 503 if not configured."""
    if not AZURE_CONNECTION_STRING:
        raise HTTPException(
            status_code=503,
            detail="Azure Storage not configured. Set AZURE_STORAGE_CONNECTION_STRING.",
        )
    try:
        from azure.storage.blob import BlobServiceClient  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="azure-storage-blob package not installed. Run: pip install azure-storage-blob",
        )
    return BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)


def _slugify(text: str) -> str:
    """Convert a doc type label to a filesystem-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


async def upload_to_azure(
    file_bytes: bytes,
    doc_type: str,
    user_id: str,
    original_filename: str,
) -> dict:
    """
    Upload *file_bytes* to Azure Blob Storage.

    Returns a dict with:
        blob_name  — internal path (never sent to frontend)
        blob_url   — private URL (not for direct use; use get_sas_url instead)
    """
    client = _get_blob_service_client()

    ext = ""
    if "." in original_filename:
        ext = "." + original_filename.rsplit(".", 1)[-1].lower()

    slug = _slugify(doc_type)
    blob_name = f"users/{user_id}/{slug}/{uuid.uuid4()}{ext}"

    container_client = client.get_container_client(AZURE_CONTAINER)

    # Ensure container exists (idempotent)
    try:
        container_client.create_container()
    except Exception:
        pass  # already exists

    blob_client = container_client.get_blob_client(blob_name)

    # Guess content type
    content_type = "application/octet-stream"
    if ext in (".pdf",):
        content_type = "application/pdf"
    elif ext in (".jpg", ".jpeg"):
        content_type = "image/jpeg"
    elif ext in (".png",):
        content_type = "image/png"

    try:
        from azure.storage.blob import ContentSettings  # type: ignore

        blob_client.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Azure upload failed: {exc}")

    blob_url = blob_client.url
    return {"blob_name": blob_name, "blob_url": blob_url}


async def delete_from_azure(blob_name: str) -> bool:
    """Delete a blob by its internal name. Returns True on success."""
    if not AZURE_CONNECTION_STRING:
        return False  # silently skip if not configured
    try:
        client = _get_blob_service_client()
        blob_client = client.get_blob_client(container=AZURE_CONTAINER, blob=blob_name)
        blob_client.delete_blob()
        return True
    except Exception:
        return False


def get_sas_url(blob_name: str, expiry_hours: int = 1) -> str:
    """
    Generate a short-lived Shared Access Signature URL for secure download.

    The URL is valid for *expiry_hours* hours (default 1).
    """
    if not AZURE_CONNECTION_STRING:
        raise HTTPException(
            status_code=503,
            detail="Azure Storage not configured. Set AZURE_STORAGE_CONNECTION_STRING.",
        )
    try:
        from azure.storage.blob import (  # type: ignore
            BlobServiceClient,
            generate_blob_sas,
            BlobSasPermissions,
        )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="azure-storage-blob package not installed.",
        )

    service_client = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
    account_name = service_client.account_name

    # Extract account key from connection string
    account_key = None
    for part in AZURE_CONNECTION_STRING.split(";"):
        if part.startswith("AccountKey="):
            account_key = part[len("AccountKey="):]
            break

    if not account_key:
        raise HTTPException(
            status_code=503,
            detail="Could not extract AccountKey from AZURE_STORAGE_CONNECTION_STRING.",
        )

    expiry = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)

    sas_token = generate_blob_sas(
        account_name=account_name,
        container_name=AZURE_CONTAINER,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=expiry,
    )

    return f"https://{account_name}.blob.core.windows.net/{AZURE_CONTAINER}/{blob_name}?{sas_token}"
