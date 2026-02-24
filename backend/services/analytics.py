"""
Analytics Service — calculates turnover KPIs from inventory log data.
Uses InventoryLog as the sole data source.
"""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import func, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import Product, InventoryLog
from config import settings

logger = logging.getLogger(__name__)

# Direction constants matching what we store in InventoryLog.direction
DIR_INBOUND = "inbound"
DIR_OUTBOUND = "outbound"


class AnalyticsService:
    """Computes warehouse turnover analytics & KPIs from inventory logs."""

    def _invlog_base_filter(
        self,
        q,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_id: Optional[str] = None,
        customer_code: Optional[str] = None,
        direction: Optional[str] = None,
    ):
        """Apply common filters to an InventoryLog query."""
        if date_from:
            q = q.where(InventoryLog.warehouse_operation_time >= date_from)
        if date_to:
            q = q.where(InventoryLog.warehouse_operation_time <= date_to)
        if warehouse_id:
            q = q.where(InventoryLog.warehouse_id == str(warehouse_id))
        if customer_code:
            q = q.where(InventoryLog.customer_code == customer_code)
        if direction:
            q = q.where(InventoryLog.direction == direction)
        return q

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Inventory-Log Volume Over Time
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_volume(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        granularity: str = "day",
        warehouse_id: Optional[str] = None,
        customer_code: Optional[str] = None,
    ) -> dict:
        """Inbound vs outbound quantity over time from inventory logs."""
        results = {}
        for dir_label in (DIR_INBOUND, DIR_OUTBOUND):
            q = select(
                func.date(InventoryLog.warehouse_operation_time).label("period"),
                func.count(InventoryLog.id).label("event_count"),
                func.sum(InventoryLog.quantity).label("total_qty"),
                func.count(func.distinct(InventoryLog.product_barcode)).label("unique_skus"),
            )
            q = self._invlog_base_filter(
                q, date_from, date_to, warehouse_id, customer_code, direction=dir_label,
            )

            if granularity == "month":
                q = q.group_by(func.strftime("%Y-%m", InventoryLog.warehouse_operation_time))
            elif granularity == "week":
                q = q.group_by(func.strftime("%Y-%W", InventoryLog.warehouse_operation_time))
            else:
                q = q.group_by(func.date(InventoryLog.warehouse_operation_time))
            q = q.order_by(text("period"))

            rows = (await db.execute(q)).all()
            results[dir_label] = [
                {
                    "period": str(r.period),
                    "event_count": r.event_count,
                    "total_qty": r.total_qty or 0,
                    "unique_skus": r.unique_skus,
                }
                for r in rows
            ]

        return results

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Inventory Turnover (from inventory logs)
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_turnover(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_id: Optional[str] = None,
        customer_code: Optional[str] = None,
    ) -> dict:
        """
        Turnover rate based on inventory logs.
        Turnover = Total Outbound Qty / Average Inventory.
        """
        # Outbound in period
        out_q = select(func.sum(InventoryLog.quantity).label("qty"))
        out_q = self._invlog_base_filter(
            out_q, date_from, date_to, warehouse_id, customer_code, direction=DIR_OUTBOUND,
        )
        total_outbound = (await db.execute(out_q)).scalar() or 0

        # Inbound in period
        in_q = select(func.sum(InventoryLog.quantity).label("qty"))
        in_q = self._invlog_base_filter(
            in_q, date_from, date_to, warehouse_id, customer_code, direction=DIR_INBOUND,
        )
        total_inbound = (await db.execute(in_q)).scalar() or 0

        # Beginning inventory = all inbound before period - all outbound before period
        beginning_inv = 0
        if date_from:
            pre_in_q = select(func.sum(InventoryLog.quantity)).where(
                InventoryLog.direction == DIR_INBOUND,
                InventoryLog.warehouse_operation_time < date_from,
            )
            if warehouse_id:
                pre_in_q = pre_in_q.where(InventoryLog.warehouse_id == str(warehouse_id))
            if customer_code:
                pre_in_q = pre_in_q.where(InventoryLog.customer_code == customer_code)
            pre_in = (await db.execute(pre_in_q)).scalar() or 0

            pre_out_q = select(func.sum(InventoryLog.quantity)).where(
                InventoryLog.direction == DIR_OUTBOUND,
                InventoryLog.warehouse_operation_time < date_from,
            )
            if warehouse_id:
                pre_out_q = pre_out_q.where(InventoryLog.warehouse_id == str(warehouse_id))
            if customer_code:
                pre_out_q = pre_out_q.where(InventoryLog.customer_code == customer_code)
            pre_out = (await db.execute(pre_out_q)).scalar() or 0

            beginning_inv = pre_in - pre_out

        ending_inv = beginning_inv + total_inbound - total_outbound
        avg_inventory = max((beginning_inv + ending_inv) / 2, 1)
        turnover_rate = total_outbound / avg_inventory if avg_inventory > 0 else 0

        return {
            "total_inbound_qty": total_inbound,
            "total_outbound_qty": total_outbound,
            "beginning_inventory": beginning_inv,
            "ending_inventory": ending_inv,
            "average_inventory": round(avg_inventory, 2),
            "turnover_rate": round(turnover_rate, 4),
            "days_in_period": (date_to - date_from).days if date_from and date_to else None,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Customer Breakdown (from inventory logs)
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_customer_breakdown(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_id: Optional[str] = None,
    ) -> list[dict]:
        """Per-customer inbound/outbound from inventory logs."""
        results = {}

        for dir_label in (DIR_INBOUND, DIR_OUTBOUND):
            q = select(
                InventoryLog.customer_code,
                func.count(InventoryLog.id).label("event_count"),
                func.sum(InventoryLog.quantity).label("total_qty"),
                func.count(func.distinct(InventoryLog.product_barcode)).label("unique_skus"),
            )
            q = self._invlog_base_filter(
                q, date_from, date_to, warehouse_id, direction=dir_label,
            )
            q = q.group_by(InventoryLog.customer_code)
            rows = (await db.execute(q)).all()
            for r in rows:
                cust = r.customer_code or "UNKNOWN"
                if cust not in results:
                    results[cust] = {
                        "customer_code": cust,
                        "inbound_events": 0, "inbound_qty": 0, "inbound_skus": 0,
                        "outbound_events": 0, "outbound_qty": 0, "outbound_skus": 0,
                    }
                results[cust][f"{dir_label}_events"] = r.event_count
                results[cust][f"{dir_label}_qty"] = r.total_qty or 0
                results[cust][f"{dir_label}_skus"] = r.unique_skus

        return sorted(results.values(), key=lambda x: x["outbound_qty"], reverse=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 11. SKU-level Movement Analysis (from inventory logs)
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_sku_analysis(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_id: Optional[str] = None,
        customer_code: Optional[str] = None,
        sort_by: str = "outbound_qty",
        limit: int = 100,
    ) -> list[dict]:
        """Per-SKU inbound/outbound qty analysis."""
        q = select(
            InventoryLog.product_barcode,
            InventoryLog.customer_code,
            func.sum(
                case((InventoryLog.direction == DIR_INBOUND, InventoryLog.quantity), else_=0)
            ).label("inbound_qty"),
            func.sum(
                case((InventoryLog.direction == DIR_OUTBOUND, InventoryLog.quantity), else_=0)
            ).label("outbound_qty"),
            func.count(InventoryLog.id).label("total_events"),
        )
        q = self._invlog_base_filter(q, date_from, date_to, warehouse_id, customer_code)
        q = q.where(InventoryLog.direction.in_([DIR_INBOUND, DIR_OUTBOUND]))
        q = q.group_by(InventoryLog.product_barcode, InventoryLog.customer_code)

        if sort_by == "inbound_qty":
            q = q.order_by(text("inbound_qty DESC"))
        else:
            q = q.order_by(text("outbound_qty DESC"))
        q = q.limit(limit)

        rows = (await db.execute(q)).all()

        return [
            {
                "product_barcode": r.product_barcode,
                "customer_code": r.customer_code,
                "inbound_qty": r.inbound_qty or 0,
                "outbound_qty": r.outbound_qty or 0,
                "total_events": r.total_events,
                "net_change": (r.inbound_qty or 0) - (r.outbound_qty or 0),
            }
            for r in rows
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # 12. Dashboard Summary (enhanced with inventory logs)
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_dashboard_summary(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_id: Optional[str] = None,
    ) -> dict:
        """High-level dashboard stats from inventory logs."""
        base_filter = lambda q, d=None: self._invlog_base_filter(
            q, date_from, date_to, warehouse_id, direction=d,
        )

        # Outbound stats
        out_q = select(
            func.count(InventoryLog.id).label("events"),
            func.sum(InventoryLog.quantity).label("qty"),
            func.count(func.distinct(InventoryLog.product_barcode)).label("skus"),
        )
        out_q = base_filter(out_q, DIR_OUTBOUND)
        out_res = (await db.execute(out_q)).one()

        # Inbound stats
        in_q = select(
            func.count(InventoryLog.id).label("events"),
            func.sum(InventoryLog.quantity).label("qty"),
            func.count(func.distinct(InventoryLog.product_barcode)).label("skus"),
        )
        in_q = base_filter(in_q, DIR_INBOUND)
        in_res = (await db.execute(in_q)).one()

        # Unique customers
        cust_q = select(func.count(func.distinct(InventoryLog.customer_code)))
        cust_q = base_filter(cust_q)
        cust_count = (await db.execute(cust_q)).scalar() or 0

        # Unique SKUs
        sku_q = select(func.count(func.distinct(InventoryLog.product_barcode)))
        sku_q = base_filter(sku_q)
        sku_count = (await db.execute(sku_q)).scalar() or 0

        # Total products in DB
        prod_count = (await db.execute(select(func.count(Product.id)))).scalar() or 0

        # Active warehouses
        wh_q = select(func.count(func.distinct(InventoryLog.warehouse_id)))
        wh_q = base_filter(wh_q)
        wh_count = (await db.execute(wh_q)).scalar() or 0

        return {
            "outbound": {
                "total_events": out_res.events or 0,
                "total_qty": out_res.qty or 0,
                "unique_skus": out_res.skus or 0,
            },
            "inbound": {
                "total_events": in_res.events or 0,
                "total_qty": in_res.qty or 0,
                "unique_skus": in_res.skus or 0,
            },
            "unique_customers": cust_count,
            "active_skus": sku_count,
            "total_products": prod_count,
            "active_warehouses": wh_count,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 13. Warehouse Comparison (from inventory logs)
    # ─────────────────────────────────────────────────────────────────────────
    async def invlog_warehouse_comparison(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        customer_code: Optional[str] = None,
    ) -> list[dict]:
        """Per-warehouse inbound/outbound comparison."""
        warehouse_map = settings.WAREHOUSE_MAP

        q = select(
            InventoryLog.warehouse_id,
            InventoryLog.direction,
            func.count(InventoryLog.id).label("events"),
            func.sum(InventoryLog.quantity).label("qty"),
            func.count(func.distinct(InventoryLog.product_barcode)).label("skus"),
            func.count(func.distinct(InventoryLog.customer_code)).label("customers"),
        )
        q = self._invlog_base_filter(q, date_from, date_to, customer_code=customer_code)
        q = q.where(InventoryLog.direction.in_([DIR_INBOUND, DIR_OUTBOUND]))
        q = q.group_by(InventoryLog.warehouse_id, InventoryLog.direction)

        rows = (await db.execute(q)).all()

        warehouses = {}
        for r in rows:
            wid = str(r.warehouse_id)
            if wid not in warehouses:
                info = warehouse_map.get(wid, {})
                warehouses[wid] = {
                    "warehouse_id": wid,
                    "warehouse_name": info.get("name", f"Warehouse {wid}"),
                    "timezone": info.get("timezone", "Unknown"),
                    "inbound_events": 0, "inbound_qty": 0,
                    "outbound_events": 0, "outbound_qty": 0,
                    "unique_skus": 0, "unique_customers": 0,
                }
            d = r.direction
            warehouses[wid][f"{d}_events"] = r.events
            warehouses[wid][f"{d}_qty"] = r.qty or 0
            warehouses[wid]["unique_skus"] = max(warehouses[wid]["unique_skus"], r.skus)
            warehouses[wid]["unique_customers"] = max(warehouses[wid]["unique_customers"], r.customers)

        return sorted(warehouses.values(), key=lambda x: x["outbound_qty"], reverse=True)


analytics_service = AnalyticsService()
