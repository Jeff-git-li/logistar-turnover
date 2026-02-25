"""
Warehouse capacity API — CRUD for user-configured warehouse total capacity (CBM).
"""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database import get_db
from models import WarehouseCapacity
from config import settings

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


class CapacityPayload(BaseModel):
    warehouse_id: str
    total_capacity_cbm: float


class CapacityResponse(BaseModel):
    warehouse_id: str
    warehouse_name: str
    total_capacity_cbm: float


@router.get("/capacities")
async def list_capacities(db: AsyncSession = Depends(get_db)):
    """Get all warehouse capacities."""
    rows = (await db.execute(select(WarehouseCapacity))).scalars().all()
    warehouse_map = settings.WAREHOUSE_MAP
    # Ensure every known warehouse appears
    result = {}
    for wid, info in warehouse_map.items():
        result[wid] = {
            "warehouse_id": wid,
            "warehouse_name": info.get("name", f"Warehouse {wid}"),
            "total_capacity_cbm": 0,
        }
    for row in rows:
        wid = str(row.warehouse_id)
        info = warehouse_map.get(wid, {})
        result[wid] = {
            "warehouse_id": wid,
            "warehouse_name": info.get("name", f"Warehouse {wid}"),
            "total_capacity_cbm": row.total_capacity_cbm or 0,
        }
    return list(result.values())


@router.put("/capacities")
async def set_capacity(payload: CapacityPayload, db: AsyncSession = Depends(get_db)):
    """Create or update a warehouse capacity."""
    row = (
        await db.execute(
            select(WarehouseCapacity).where(
                WarehouseCapacity.warehouse_id == payload.warehouse_id
            )
        )
    ).scalar_one_or_none()

    if row:
        row.total_capacity_cbm = payload.total_capacity_cbm
    else:
        row = WarehouseCapacity(
            warehouse_id=payload.warehouse_id,
            total_capacity_cbm=payload.total_capacity_cbm,
        )
        db.add(row)
    await db.commit()

    info = settings.WAREHOUSE_MAP.get(payload.warehouse_id, {})
    return {
        "warehouse_id": payload.warehouse_id,
        "warehouse_name": info.get("name", f"Warehouse {payload.warehouse_id}"),
        "total_capacity_cbm": payload.total_capacity_cbm,
    }
