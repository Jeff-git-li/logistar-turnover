"""
Sync API Router — trigger data syncs from WMS API and Excel imports.
Sync operations run as background tasks so the endpoint returns immediately.
"""
import asyncio
import os
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from database import get_db, async_session_factory
from models import SyncLog
from services.sync_service import sync_service
from services.excel_parser import excel_parser

router = APIRouter(prefix="/api/sync", tags=["sync"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def _run_sync_in_background(coro_factory):
    """Run a sync operation with its own DB session so it doesn't depend on request lifecycle."""
    async with async_session_factory() as db:
        try:
            await coro_factory(db)
        except Exception:
            pass  # errors are already logged/recorded in SyncLog by the service


@router.post("/outbound")
async def sync_outbound(
    background_tasks: BackgroundTasks,
    create_time_from: Optional[str] = Query(None),
    create_time_to: Optional[str] = Query(None),
    ship_time_from: Optional[str] = Query(None),
    ship_time_to: Optional[str] = Query(None),
):
    """Trigger outbound order sync from WMS API (runs in background)."""
    background_tasks.add_task(
        _run_sync_in_background,
        lambda db: sync_service.sync_outbound_orders(
            db,
            create_time_from=create_time_from,
            create_time_to=create_time_to,
            ship_time_from=ship_time_from,
            ship_time_to=ship_time_to,
        ),
    )
    return {"status": "started", "message": "Outbound sync started in background. Check /api/sync/logs for progress."}


@router.post("/inbound")
async def sync_inbound(
    background_tasks: BackgroundTasks,
    create_time_from: Optional[str] = Query(None),
    create_time_to: Optional[str] = Query(None),
    date_shelves_from: Optional[str] = Query(None),
    date_shelves_to: Optional[str] = Query(None),
):
    """Trigger inbound receiving sync from WMS API (runs in background)."""
    background_tasks.add_task(
        _run_sync_in_background,
        lambda db: sync_service.sync_inbound_receivings(
            db,
            create_time_from=create_time_from,
            create_time_to=create_time_to,
            date_shelves_from=date_shelves_from,
            date_shelves_to=date_shelves_to,
        ),
    )
    return {"status": "started", "message": "Inbound sync started in background. Check /api/sync/logs for progress."}


@router.post("/products")
async def sync_products(background_tasks: BackgroundTasks):
    """Trigger product master data sync from WMS API (runs in background)."""
    background_tasks.add_task(
        _run_sync_in_background,
        lambda db: sync_service.sync_products(db),
    )
    return {"status": "started", "message": "Product sync started in background. Check /api/sync/logs for progress."}


@router.post("/excel-upload")
async def upload_excel(
    file: UploadFile = File(...),
    replace_existing: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Upload and import an exported WMS Excel file."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only .xlsx or .xls files are supported")

    # Save uploaded file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Parse and import
    count = await excel_parser.import_to_db(db, filepath, replace_existing=replace_existing)
    return {
        "status": "success",
        "filename": filename,
        "records_imported": count,
    }


@router.get("/logs")
async def get_sync_logs(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get recent sync operation logs."""
    result = await db.execute(
        select(SyncLog).order_by(desc(SyncLog.started_at)).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "sync_type": log.sync_type,
            "status": log.status,
            "records_synced": log.records_synced,
            "error_message": log.error_message,
            "started_at": str(log.started_at) if log.started_at else None,
            "finished_at": str(log.finished_at) if log.finished_at else None,
        }
        for log in logs
    ]
