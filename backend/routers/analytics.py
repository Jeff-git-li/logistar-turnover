"""
Analytics API Router — serves turnover KPIs and dashboard data.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from services.analytics import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _parse_date(val: Optional[str]) -> Optional[datetime]:
    if not val:
        return None
    return datetime.fromisoformat(val)


@router.get("/dashboard")
async def dashboard_summary(
    date_from: Optional[str] = Query(None, description="ISO date, e.g. 2025-01-01"),
    date_to: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """High-level dashboard stats."""
    return await analytics_service.dashboard_summary(
        db, date_from=_parse_date(date_from), date_to=_parse_date(date_to)
    )


@router.get("/inbound-outbound")
async def inbound_outbound_volume(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    granularity: str = Query("day", regex="^(day|week|month)$"),
    warehouse_code: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Inbound vs outbound volume time series."""
    return await analytics_service.inbound_outbound_volume(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        granularity=granularity,
        warehouse_code=warehouse_code,
        customer_code=customer_code,
    )


@router.get("/turnover")
async def inventory_turnover(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_code: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Inventory turnover rate calculation."""
    return await analytics_service.inventory_turnover(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_code=warehouse_code,
        customer_code=customer_code,
    )


@router.get("/customers")
async def customer_breakdown(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Customer-level inbound/outbound breakdown."""
    return await analytics_service.customer_breakdown(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_code=warehouse_code,
    )


@router.get("/products")
async def product_analysis(
    customer_code: Optional[str] = Query(None),
    sort_by: str = Query("volume_cbm", regex="^(volume_cbm|weight|value)$"),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Product/SKU-level analysis rankings."""
    return await analytics_service.product_analysis(
        db, customer_code=customer_code, sort_by=sort_by, limit=limit
    )


@router.get("/warehouse-utilization")
async def warehouse_utilization(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    granularity: str = Query("day", regex="^(day|week|month)$"),
    db: AsyncSession = Depends(get_db),
):
    """Warehouse CBM utilization over time."""
    return await analytics_service.warehouse_utilization(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        granularity=granularity,
    )


@router.get("/fees")
async def fee_analysis(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Fee breakdown from Excel-imported data."""
    return await analytics_service.fee_analysis(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        customer_code=customer_code,
    )
