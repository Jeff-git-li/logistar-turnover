"""
Analytics API Router — serves turnover KPIs and dashboard data
from inventory logs.
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


@router.get("/invlog/dashboard")
async def invlog_dashboard(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard summary from inventory logs."""
    return await analytics_service.invlog_dashboard_summary(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_id=warehouse_id,
    )


@router.get("/invlog/volume")
async def invlog_volume(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    granularity: str = Query("day", regex="^(day|week|month)$"),
    warehouse_id: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Inbound vs outbound volume time series from inventory logs."""
    return await analytics_service.invlog_volume(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        granularity=granularity,
        warehouse_id=warehouse_id,
        customer_code=customer_code,
    )


@router.get("/invlog/turnover")
async def invlog_turnover(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Inventory turnover rate from inventory logs."""
    return await analytics_service.invlog_turnover(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_id=warehouse_id,
        customer_code=customer_code,
    )


@router.get("/invlog/customers")
async def invlog_customers(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Customer breakdown from inventory logs."""
    return await analytics_service.invlog_customer_breakdown(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_id=warehouse_id,
    )


@router.get("/invlog/skus")
async def invlog_skus(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    sort_by: str = Query("outbound_qty", regex="^(outbound_qty|inbound_qty)$"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """SKU-level movement analysis from inventory logs."""
    return await analytics_service.invlog_sku_analysis(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        warehouse_id=warehouse_id,
        customer_code=customer_code,
        sort_by=sort_by,
        limit=limit,
    )


@router.get("/invlog/warehouses")
async def invlog_warehouses(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    customer_code: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Warehouse comparison from inventory logs."""
    return await analytics_service.invlog_warehouse_comparison(
        db,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        customer_code=customer_code,
    )
