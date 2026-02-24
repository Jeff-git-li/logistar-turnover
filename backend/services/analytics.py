"""
Analytics Service — calculates turnover KPIs from synced data.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, case, extract, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import OutboundOrder, InboundReceiving, Product, ExcelOrderDetail

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Computes warehouse turnover analytics & KPIs."""

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Inbound vs Outbound Volume Over Time
    # ─────────────────────────────────────────────────────────────────────────
    async def inbound_outbound_volume(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        granularity: str = "day",  # 'day', 'week', 'month'
        warehouse_code: Optional[str] = None,
        customer_code: Optional[str] = None,
    ) -> dict:
        """
        Returns time-series data for inbound qty vs outbound qty.
        """
        # --- Outbound (parcel count per period) ---
        out_q = select(
            func.date(OutboundOrder.ship_time).label("period"),
            func.count(OutboundOrder.id).label("order_count"),
            func.sum(OutboundOrder.parcel_quantity).label("parcel_count"),
            func.sum(OutboundOrder.volume_cbm).label("total_cbm"),
            func.sum(OutboundOrder.so_actual_weight).label("total_weight_kg"),
        ).where(OutboundOrder.ship_time.isnot(None))

        if date_from:
            out_q = out_q.where(OutboundOrder.ship_time >= date_from)
        if date_to:
            out_q = out_q.where(OutboundOrder.ship_time <= date_to)
        if warehouse_code:
            out_q = out_q.where(OutboundOrder.warehouse_code == warehouse_code)
        if customer_code:
            out_q = out_q.where(OutboundOrder.customer_code == customer_code)

        if granularity == "month":
            out_q = out_q.group_by(
                func.strftime("%Y-%m", OutboundOrder.ship_time)
            ).order_by(text("period"))
        elif granularity == "week":
            out_q = out_q.group_by(
                func.strftime("%Y-%W", OutboundOrder.ship_time)
            ).order_by(text("period"))
        else:
            out_q = out_q.group_by(
                func.date(OutboundOrder.ship_time)
            ).order_by(text("period"))

        outbound_result = await db.execute(out_q)
        outbound_rows = outbound_result.all()

        # --- Inbound (qty received per period) ---
        in_q = select(
            func.date(InboundReceiving.pd_putaway_time).label("period"),
            func.count(InboundReceiving.id).label("receiving_count"),
            func.sum(InboundReceiving.received_qty).label("total_received_qty"),
            func.sum(InboundReceiving.shelves_qty).label("total_shelved_qty"),
        ).where(InboundReceiving.pd_putaway_time.isnot(None))

        if date_from:
            in_q = in_q.where(InboundReceiving.pd_putaway_time >= date_from)
        if date_to:
            in_q = in_q.where(InboundReceiving.pd_putaway_time <= date_to)
        if warehouse_code:
            in_q = in_q.where(InboundReceiving.warehouse_code == warehouse_code)
        if customer_code:
            in_q = in_q.where(InboundReceiving.customer_code == customer_code)

        if granularity == "month":
            in_q = in_q.group_by(
                func.strftime("%Y-%m", InboundReceiving.pd_putaway_time)
            ).order_by(text("period"))
        elif granularity == "week":
            in_q = in_q.group_by(
                func.strftime("%Y-%W", InboundReceiving.pd_putaway_time)
            ).order_by(text("period"))
        else:
            in_q = in_q.group_by(
                func.date(InboundReceiving.pd_putaway_time)
            ).order_by(text("period"))

        inbound_result = await db.execute(in_q)
        inbound_rows = inbound_result.all()

        return {
            "outbound": [
                {
                    "period": str(r.period),
                    "order_count": r.order_count,
                    "parcel_count": r.parcel_count or 0,
                    "total_cbm": round(r.total_cbm or 0, 4),
                    "total_weight_kg": round(r.total_weight_kg or 0, 2),
                }
                for r in outbound_rows
            ],
            "inbound": [
                {
                    "period": str(r.period),
                    "receiving_count": r.receiving_count,
                    "total_received_qty": r.total_received_qty or 0,
                    "total_shelved_qty": r.total_shelved_qty or 0,
                }
                for r in inbound_rows
            ],
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Inventory Turnover Rate
    # ─────────────────────────────────────────────────────────────────────────
    async def inventory_turnover(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_code: Optional[str] = None,
        customer_code: Optional[str] = None,
    ) -> dict:
        """
        Calculates turnover rate = Total Outbound Qty / Average Inventory.
        Average Inventory ≈ (Cumulative Inbound - Cumulative Outbound) over the period.
        """
        # Total outbound (shipped parcels in period)
        out_q = select(
            func.sum(OutboundOrder.parcel_quantity).label("total_outbound"),
            func.sum(OutboundOrder.volume_cbm).label("outbound_cbm"),
        ).where(OutboundOrder.ship_time.isnot(None))
        if date_from:
            out_q = out_q.where(OutboundOrder.ship_time >= date_from)
        if date_to:
            out_q = out_q.where(OutboundOrder.ship_time <= date_to)
        if warehouse_code:
            out_q = out_q.where(OutboundOrder.warehouse_code == warehouse_code)
        if customer_code:
            out_q = out_q.where(OutboundOrder.customer_code == customer_code)

        out_res = (await db.execute(out_q)).one()
        total_outbound = out_res.total_outbound or 0
        outbound_cbm = out_res.outbound_cbm or 0

        # Total inbound (received qty in period)
        in_q = select(
            func.sum(InboundReceiving.received_qty).label("total_inbound"),
        ).where(InboundReceiving.pd_putaway_time.isnot(None))
        if date_from:
            in_q = in_q.where(InboundReceiving.pd_putaway_time >= date_from)
        if date_to:
            in_q = in_q.where(InboundReceiving.pd_putaway_time <= date_to)
        if warehouse_code:
            in_q = in_q.where(InboundReceiving.warehouse_code == warehouse_code)
        if customer_code:
            in_q = in_q.where(InboundReceiving.customer_code == customer_code)

        in_res = (await db.execute(in_q)).one()
        total_inbound = in_res.total_inbound or 0

        # Beginning inventory (all inbound before period - all outbound before period)
        beginning_inv = 0
        if date_from:
            pre_in = (
                await db.execute(
                    select(func.sum(InboundReceiving.received_qty))
                    .where(InboundReceiving.pd_putaway_time < date_from)
                )
            ).scalar() or 0
            pre_out = (
                await db.execute(
                    select(func.sum(OutboundOrder.parcel_quantity))
                    .where(OutboundOrder.ship_time < date_from)
                )
            ).scalar() or 0
            beginning_inv = pre_in - pre_out

        ending_inv = beginning_inv + total_inbound - total_outbound
        avg_inventory = (beginning_inv + ending_inv) / 2 if (beginning_inv + ending_inv) > 0 else 1

        turnover_rate = total_outbound / avg_inventory if avg_inventory > 0 else 0

        return {
            "total_inbound_qty": total_inbound,
            "total_outbound_qty": total_outbound,
            "outbound_cbm": round(outbound_cbm, 4),
            "beginning_inventory": beginning_inv,
            "ending_inventory": ending_inv,
            "average_inventory": round(avg_inventory, 2),
            "turnover_rate": round(turnover_rate, 4),
            "days_in_period": (
                (date_to - date_from).days if date_from and date_to else None
            ),
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Customer-level Breakdown
    # ─────────────────────────────────────────────────────────────────────────
    async def customer_breakdown(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        warehouse_code: Optional[str] = None,
    ) -> list[dict]:
        """Per-customer inbound/outbound summary."""
        # Outbound by customer
        out_q = select(
            OutboundOrder.customer_code,
            func.count(OutboundOrder.id).label("outbound_orders"),
            func.sum(OutboundOrder.parcel_quantity).label("outbound_parcels"),
            func.sum(OutboundOrder.volume_cbm).label("outbound_cbm"),
            func.sum(OutboundOrder.so_actual_weight).label("outbound_weight_kg"),
        ).where(OutboundOrder.ship_time.isnot(None))

        if date_from:
            out_q = out_q.where(OutboundOrder.ship_time >= date_from)
        if date_to:
            out_q = out_q.where(OutboundOrder.ship_time <= date_to)
        if warehouse_code:
            out_q = out_q.where(OutboundOrder.warehouse_code == warehouse_code)

        out_q = out_q.group_by(OutboundOrder.customer_code)
        out_res = (await db.execute(out_q)).all()
        out_map = {r.customer_code: r for r in out_res}

        # Inbound by customer
        in_q = select(
            InboundReceiving.customer_code,
            func.count(InboundReceiving.id).label("inbound_receivings"),
            func.sum(InboundReceiving.received_qty).label("inbound_qty"),
        ).where(InboundReceiving.pd_putaway_time.isnot(None))

        if date_from:
            in_q = in_q.where(InboundReceiving.pd_putaway_time >= date_from)
        if date_to:
            in_q = in_q.where(InboundReceiving.pd_putaway_time <= date_to)
        if warehouse_code:
            in_q = in_q.where(InboundReceiving.warehouse_code == warehouse_code)

        in_q = in_q.group_by(InboundReceiving.customer_code)
        in_res = (await db.execute(in_q)).all()
        in_map = {r.customer_code: r for r in in_res}

        # Merge
        all_customers = set(out_map.keys()) | set(in_map.keys())
        results = []
        for cust in sorted(all_customers):
            o = out_map.get(cust)
            i = in_map.get(cust)
            results.append({
                "customer_code": cust,
                "outbound_orders": o.outbound_orders if o else 0,
                "outbound_parcels": o.outbound_parcels if o else 0,
                "outbound_cbm": round(o.outbound_cbm or 0, 4) if o else 0,
                "outbound_weight_kg": round(o.outbound_weight_kg or 0, 2) if o else 0,
                "inbound_receivings": i.inbound_receivings if i else 0,
                "inbound_qty": i.inbound_qty if i else 0,
            })

        return results

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Product/SKU-level Analysis
    # ─────────────────────────────────────────────────────────────────────────
    async def product_analysis(
        self,
        db: AsyncSession,
        customer_code: Optional[str] = None,
        sort_by: str = "volume_cbm",
        limit: int = 50,
    ) -> list[dict]:
        """Product-level analysis: volume, weight, value rankings."""
        q = select(Product)
        if customer_code:
            q = q.where(Product.customer_code == customer_code)

        if sort_by == "weight":
            q = q.order_by(Product.product_weight.desc())
        elif sort_by == "value":
            q = q.order_by(Product.product_declared_value.desc())
        else:
            q = q.order_by(Product.volume_cbm.desc())

        q = q.limit(limit)
        result = (await db.execute(q)).scalars().all()

        return [
            {
                "product_barcode": p.product_barcode,
                "reference_no": p.reference_no,
                "customer_code": p.customer_code,
                "dimensions_cm": f"{p.product_length}×{p.product_width}×{p.product_height}",
                "weight_kg": p.product_weight,
                "volume_cbm": round(p.volume_cbm, 6) if p.volume_cbm else None,
                "declared_value": p.product_declared_value,
            }
            for p in result
        ]

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Warehouse Utilization (CBM)
    # ─────────────────────────────────────────────────────────────────────────
    async def warehouse_utilization(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        granularity: str = "day",
    ) -> dict:
        """
        Cumulative CBM in warehouse over time.
        Inbound adds CBM, outbound removes it.
        """
        # Outbound CBM over time
        out_q = select(
            func.date(OutboundOrder.ship_time).label("period"),
            func.sum(OutboundOrder.volume_cbm).label("cbm_out"),
        ).where(
            OutboundOrder.ship_time.isnot(None),
            OutboundOrder.volume_cbm.isnot(None),
        )
        if date_from:
            out_q = out_q.where(OutboundOrder.ship_time >= date_from)
        if date_to:
            out_q = out_q.where(OutboundOrder.ship_time <= date_to)

        out_q = out_q.group_by(func.date(OutboundOrder.ship_time)).order_by(text("period"))
        out_result = (await db.execute(out_q)).all()
        out_map = {str(r.period): round(r.cbm_out or 0, 4) for r in out_result}

        # Total inventory CBM (products)
        total_product_cbm = (
            await db.execute(select(func.sum(Product.volume_cbm)))
        ).scalar() or 0

        # Summary stats
        total_outbound_cbm = (
            await db.execute(
                select(func.sum(OutboundOrder.volume_cbm)).where(
                    OutboundOrder.ship_time.isnot(None)
                )
            )
        ).scalar() or 0

        return {
            "total_product_catalog_cbm": round(total_product_cbm, 4),
            "total_outbound_cbm": round(total_outbound_cbm, 4),
            "daily_outbound_cbm": out_map,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Dashboard Summary
    # ─────────────────────────────────────────────────────────────────────────
    async def dashboard_summary(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> dict:
        """High-level summary stats for dashboard cards."""
        # Total outbound
        out_q = select(
            func.count(OutboundOrder.id).label("total_orders"),
            func.sum(OutboundOrder.parcel_quantity).label("total_parcels"),
            func.sum(OutboundOrder.volume_cbm).label("total_cbm"),
            func.sum(OutboundOrder.so_actual_weight).label("total_weight"),
        ).where(OutboundOrder.ship_time.isnot(None))
        if date_from:
            out_q = out_q.where(OutboundOrder.ship_time >= date_from)
        if date_to:
            out_q = out_q.where(OutboundOrder.ship_time <= date_to)
        out_res = (await db.execute(out_q)).one()

        # Total inbound
        in_q = select(
            func.count(InboundReceiving.id).label("total_receivings"),
            func.sum(InboundReceiving.received_qty).label("total_received"),
        ).where(InboundReceiving.pd_putaway_time.isnot(None))
        if date_from:
            in_q = in_q.where(InboundReceiving.pd_putaway_time >= date_from)
        if date_to:
            in_q = in_q.where(InboundReceiving.pd_putaway_time <= date_to)
        in_res = (await db.execute(in_q)).one()

        # Unique customers
        cust_count = (
            await db.execute(
                select(func.count(func.distinct(OutboundOrder.customer_code)))
            )
        ).scalar()

        # Product count
        prod_count = (
            await db.execute(select(func.count(Product.id)))
        ).scalar()

        # Countries served
        country_count = (
            await db.execute(
                select(func.count(func.distinct(OutboundOrder.country_code)))
                .where(OutboundOrder.ship_time.isnot(None))
            )
        ).scalar()

        return {
            "outbound": {
                "total_orders": out_res.total_orders or 0,
                "total_parcels": out_res.total_parcels or 0,
                "total_cbm": round(out_res.total_cbm or 0, 4),
                "total_weight_kg": round(out_res.total_weight or 0, 2),
            },
            "inbound": {
                "total_receivings": in_res.total_receivings or 0,
                "total_received_qty": in_res.total_received or 0,
            },
            "unique_customers": cust_count or 0,
            "total_products": prod_count or 0,
            "countries_served": country_count or 0,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Fee Analysis (from Excel data)
    # ─────────────────────────────────────────────────────────────────────────
    async def fee_analysis(
        self,
        db: AsyncSession,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        customer_code: Optional[str] = None,
    ) -> dict:
        """Fee breakdown from imported Excel data."""
        q = select(
            ExcelOrderDetail.customer_code,
            func.count(ExcelOrderDetail.id).label("order_count"),
            func.sum(ExcelOrderDetail.total_fee_usd).label("total_fees"),
            func.sum(ExcelOrderDetail.shipping_fee_usd).label("shipping_fees"),
            func.sum(ExcelOrderDetail.operation_fee_usd).label("operation_fees"),
            func.sum(ExcelOrderDetail.fuel_surcharge_usd).label("fuel_fees"),
            func.sum(ExcelOrderDetail.packaging_fee_usd).label("packaging_fees"),
            func.sum(ExcelOrderDetail.oversize_fee_usd).label("oversize_fees"),
            func.sum(ExcelOrderDetail.remote_fee_usd).label("remote_fees"),
            func.sum(ExcelOrderDetail.super_remote_fee_usd).label("super_remote_fees"),
            func.sum(ExcelOrderDetail.residential_fee_usd).label("residential_fees"),
        )

        if date_from:
            q = q.where(ExcelOrderDetail.ship_time >= date_from)
        if date_to:
            q = q.where(ExcelOrderDetail.ship_time <= date_to)
        if customer_code:
            q = q.where(ExcelOrderDetail.customer_code == customer_code)

        q = q.group_by(ExcelOrderDetail.customer_code)
        result = (await db.execute(q)).all()

        return [
            {
                "customer_code": r.customer_code,
                "order_count": r.order_count,
                "total_fees_usd": round(r.total_fees or 0, 2),
                "shipping_fees_usd": round(r.shipping_fees or 0, 2),
                "operation_fees_usd": round(r.operation_fees or 0, 2),
                "fuel_fees_usd": round(r.fuel_fees or 0, 2),
                "packaging_fees_usd": round(r.packaging_fees or 0, 2),
                "oversize_fees_usd": round(r.oversize_fees or 0, 2),
                "remote_fees_usd": round(r.remote_fees or 0, 2),
                "super_remote_fees_usd": round(r.super_remote_fees or 0, 2),
                "residential_fees_usd": round(r.residential_fees or 0, 2),
            }
            for r in result
        ]


analytics_service = AnalyticsService()
