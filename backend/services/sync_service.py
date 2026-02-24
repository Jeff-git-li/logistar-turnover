"""
Data Sync Service — syncs WMS API data into local SQLite database.
"""
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert

from models import OutboundOrder, InboundReceiving, Product, SyncLog
from services.wms_client import wms_client

logger = logging.getLogger(__name__)


def _parse_dt(val: str) -> datetime | None:
    """Parse a datetime string from WMS. Returns None for invalid values."""
    if not val or val.startswith("0000"):
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> float | None:
    try:
        return float(val) if val else None
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> int | None:
    try:
        return int(val) if val else None
    except (ValueError, TypeError):
        return None


def _calc_volume_cbm(length_cm, width_cm, height_cm) -> float | None:
    """Calculate volume in cubic meters from cm dimensions."""
    l, w, h = _safe_float(length_cm), _safe_float(width_cm), _safe_float(height_cm)
    if l and w and h:
        return round((l * w * h) / 1_000_000, 6)
    return None


class SyncService:
    """Handles syncing data from WMS APIs into the local database."""

    async def sync_outbound_orders(
        self,
        db: AsyncSession,
        create_time_from: str | None = None,
        create_time_to: str | None = None,
        ship_time_from: str | None = None,
        ship_time_to: str | None = None,
    ) -> int:
        """Sync outbound orders from WMS API."""
        log = SyncLog(sync_type="outbound", status="running")
        db.add(log)
        await db.commit()

        try:
            raw_orders = await wms_client.get_all_orders(
                create_time_from=create_time_from,
                create_time_to=create_time_to,
                ship_time_from=ship_time_from,
                ship_time_to=ship_time_to,
            )

            count = 0
            for raw in raw_orders:
                existing = await db.execute(
                    select(OutboundOrder).where(OutboundOrder.order_id == raw["order_id"])
                )
                order = existing.scalar_one_or_none()

                volume_cbm = _calc_volume_cbm(
                    raw.get("order_measure_length"),
                    raw.get("order_measure_width"),
                    raw.get("order_measure_height"),
                )

                values = dict(
                    order_id=raw["order_id"],
                    order_code=raw.get("order_code"),
                    reference_no=raw.get("reference_no"),
                    customer_code=raw.get("customer_code"),
                    order_status=raw.get("order_status"),
                    parcel_quantity=_safe_int(raw.get("parcel_quantity")),
                    country_code=raw.get("country_code"),
                    mp_code=raw.get("mp_code"),
                    add_time=_parse_dt(raw.get("add_time", "")),
                    ship_time=_parse_dt(raw.get("ship_time", "")),
                    service_number=raw.get("service_number"),
                    tracking_number=raw.get("tracking_number"),
                    so_weight=_safe_float(raw.get("so_weight")),
                    so_actual_weight=_safe_float(raw.get("so_actual_weight")),
                    so_vol_weight=_safe_float(raw.get("so_vol_weight")),
                    order_measure_length=_safe_float(raw.get("order_measure_length")),
                    order_measure_width=_safe_float(raw.get("order_measure_width")),
                    order_measure_height=_safe_float(raw.get("order_measure_height")),
                    warehouse_code=raw.get("warehouse_code"),
                    picking_code=raw.get("picking_code"),
                    order_measure=raw.get("order_measure"),
                    volume_cbm=volume_cbm,
                    synced_at=datetime.now(),
                )

                if order:
                    for k, v in values.items():
                        setattr(order, k, v)
                else:
                    db.add(OutboundOrder(**values))
                count += 1

            await db.commit()

            log.status = "success"
            log.records_synced = count
            log.finished_at = datetime.now()
            await db.commit()
            logger.info(f"Synced {count} outbound orders")
            return count

        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            log.finished_at = datetime.now()
            await db.commit()
            logger.error(f"Outbound sync failed: {e}")
            raise

    async def sync_inbound_receivings(
        self,
        db: AsyncSession,
        create_time_from: str | None = None,
        create_time_to: str | None = None,
        date_shelves_from: str | None = None,
        date_shelves_to: str | None = None,
    ) -> int:
        """Sync inbound receivings from WMS API."""
        log = SyncLog(sync_type="inbound", status="running")
        db.add(log)
        await db.commit()

        try:
            raw_receivings = await wms_client.get_all_receivings(
                create_time_from=create_time_from,
                create_time_to=create_time_to,
                date_shelves_from=date_shelves_from,
                date_shelves_to=date_shelves_to,
            )

            count = 0
            for raw in raw_receivings:
                existing = await db.execute(
                    select(InboundReceiving).where(
                        InboundReceiving.receiving_id == raw["receiving_id"]
                    )
                )
                recv = existing.scalar_one_or_none()

                values = dict(
                    receiving_id=raw["receiving_id"],
                    receiving_code=raw.get("receiving_code"),
                    warehouse_code=raw.get("warehouse_code"),
                    customer_code=raw.get("customer_code"),
                    receiving_type=raw.get("receiving_type"),
                    expected_date=raw.get("expected_date"),
                    receiving_status=_safe_int(raw.get("receiving_status")),
                    total_packages=_safe_int(raw.get("total_packages")),
                    receiving_add_time=_parse_dt(raw.get("receiving_add_time", "")),
                    pd_putaway_time=_parse_dt(raw.get("pd_putaway_time", "")),
                    sku_species=_safe_int(raw.get("sku_species")),
                    expect_qty=_safe_int(raw.get("expect_qty")),
                    received_qty=_safe_int(raw.get("received_qty")),
                    shelves_qty=_safe_int(raw.get("shelves_qty")),
                    synced_at=datetime.now(),
                )

                if recv:
                    for k, v in values.items():
                        setattr(recv, k, v)
                else:
                    db.add(InboundReceiving(**values))
                count += 1

            await db.commit()

            log.status = "success"
            log.records_synced = count
            log.finished_at = datetime.now()
            await db.commit()
            logger.info(f"Synced {count} inbound receivings")
            return count

        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            log.finished_at = datetime.now()
            await db.commit()
            logger.error(f"Inbound sync failed: {e}")
            raise

    async def sync_products(self, db: AsyncSession) -> int:
        """Sync product master data from WMS API."""
        log = SyncLog(sync_type="product", status="running")
        db.add(log)
        await db.commit()

        try:
            raw_products = await wms_client.get_all_products()
            logger.info(f"Fetched {len(raw_products)} products from WMS, upserting to DB...")

            count = 0
            BATCH = 500
            for i in range(0, len(raw_products), BATCH):
                batch = raw_products[i:i + BATCH]
                for raw in batch:
                    volume_cbm = _calc_volume_cbm(
                        raw.get("product_length"),
                        raw.get("product_width"),
                        raw.get("product_height"),
                    )
                    values = dict(
                        product_barcode=raw.get("product_barcode", ""),
                        reference_no=raw.get("reference_no"),
                        customer_code=raw.get("customer_code"),
                        product_length=_safe_float(raw.get("product_length")),
                        product_width=_safe_float(raw.get("product_width")),
                        product_height=_safe_float(raw.get("product_height")),
                        product_weight=_safe_float(raw.get("product_weight")),
                        product_declared_value=_safe_float(raw.get("product_declared_value")),
                        size_unit=raw.get("size_unit"),
                        weight_unit=raw.get("weight_unit"),
                        volume_cbm=volume_cbm,
                        synced_at=datetime.now(),
                    )
                    stmt = sqlite_upsert(Product).values(**values)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=[Product.product_barcode],
                        set_={k: v for k, v in values.items() if k != "product_barcode"},
                    )
                    await db.execute(stmt)
                    count += 1
                await db.commit()
                logger.info(f"Products: upserted {count}/{len(raw_products)}")

            log.status = "success"
            log.records_synced = count
            log.finished_at = datetime.now()
            await db.commit()
            logger.info(f"Synced {count} products")
            return count

        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            log.finished_at = datetime.now()
            await db.commit()
            logger.error(f"Product sync failed: {e}")
            raise


sync_service = SyncService()
