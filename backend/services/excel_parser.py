"""
Excel Parser Service — parses exported WMS Excel files into structured data.
Supports both Excel templates (horizontal and fee-based).
"""
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import ExcelOrderDetail, SyncLog

logger = logging.getLogger(__name__)

# Column mapping: Chinese header → model field name
# This covers BOTH templates (horizontal + fee-based)
COLUMN_MAP = {
    "参考号": "reference_no",
    "订单号": "order_code",
    "平台参考号": "platform_ref_no",
    "公共平台单号": "public_platform_no",
    "运单号": "tracking_number",
    "拣货单号": "picking_code",
    "客户代码": "customer_code",
    "订单内件数": "parcel_quantity",
    "运输方式": "shipping_method",
    "仓库代码": "warehouse_code",
    "订单状态": "order_status",
    "仓库备注": "warehouse_remark",
    "异常情况": "exception_info",
    "下架类型": "removal_type",
    "收件人姓名": "recipient_name",
    "收件人公司名": "recipient_company",
    "证件号": "id_number",
    "目的国家": "country_code",
    "国家中文名称": "country_cn",
    "国家英文名称": "country_en",
    "州 \\ 省": "state_province",
    "城市": "city",
    "联系地址1": "address1",
    "联系地址2": "address2",
    "联系地址3": "address3",
    "收件人电话": "recipient_phone",
    "收件人电话2": "recipient_phone2",
    "收件人传真": "recipient_fax",
    "收件人邮箱": "recipient_email",
    "收件人邮编": "recipient_zip",
    "收件人门牌号": "recipient_door_no",
    "收件人税号": "recipient_tax_id",
    "收件人EORI": "recipient_eori",
    "VAT税号": "vat_no",
    "发件人EORI": "sender_eori",
    "签名服务": "signature_service",
    "保险服务": "insurance_service",
    "投保金额": "insured_amount",
    "投保金额币种": "insured_currency",
    "产品序列号": "product_serial",
    "下单时间": "order_time",
    "打印时间": "print_time",
    "打包时间": "pack_time",
    "出货时间": "ship_time",
    "截单时间": "cutoff_time",
    "分区代码": "zone_code",
    "分区方案": "zone_plan",
    "计费重量": "billing_weight",
    "实际重量": "actual_weight",
    "体积重量": "vol_weight",
    "产品净重": "net_weight",
    "订单体积（cm³）": "order_volume_cm3",
    "体积": "volume",
    "签出包裹体积长(CM)": "measure_length",
    "签出包裹体积宽(CM)": "measure_width",
    "签出包裹体积高(CM)": "measure_height",
    # Template 1 specific
    "运费(USD)": "shipping_fee_usd",
    "其他费用(USD)": "other_fee_usd",
    "总费用(USD)": "total_fee_usd",
    # Template 2 specific (fee breakdown)
    "运输费(USD)": "shipping_fee_usd",
    "操作费(USD)": "operation_fee_usd",
    "超长费(USD)": "oversize_fee_usd",
    "包材费用(USD)": "packaging_fee_usd",
    "燃油附加费(USD)": "fuel_surcharge_usd",
    "超偏远(USD)": "super_remote_fee_usd",
    "偏远(USD)": "remote_fee_usd",
    "住宅附加费(USD)": "residential_fee_usd",
    # Common fee fields
    "COD": "cod_amount",
    "COD币种": "cod_currency",
    "同步时间": "sync_time",
    "计费时间": "billing_time",
    "包材": "packaging_material",
    "目的地派送方式": "delivery_method",
    "创建人": "creator",
    "订单备注": "order_remark",
    "货值": "goods_value",
    "货值币种": "goods_value_currency",
    "平台": "platform",
    "IOSS": "ioss",
}

# Fields that should be parsed as datetime
DATETIME_FIELDS = {
    "order_time", "print_time", "pack_time", "ship_time",
    "cutoff_time", "sync_time", "billing_time",
}

# Fields that should be parsed as float
FLOAT_FIELDS = {
    "billing_weight", "actual_weight", "vol_weight", "net_weight",
    "order_volume_cm3", "measure_length", "measure_width", "measure_height",
    "insured_amount", "shipping_fee_usd", "operation_fee_usd",
    "oversize_fee_usd", "packaging_fee_usd", "fuel_surcharge_usd",
    "super_remote_fee_usd", "remote_fee_usd", "residential_fee_usd",
    "total_fee_usd", "other_fee_usd", "cod_amount", "goods_value",
}

INT_FIELDS = {"parcel_quantity"}


def _parse_dt(val) -> Optional[datetime]:
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return pd.to_datetime(val).to_pydatetime()
    except Exception:
        return None


def _safe_float(val) -> Optional[float]:
    if pd.isna(val) or val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    if pd.isna(val) or val is None:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None


def _calc_volume_cbm(length_cm, width_cm, height_cm) -> Optional[float]:
    l, w, h = _safe_float(length_cm), _safe_float(width_cm), _safe_float(height_cm)
    if l and w and h:
        return round((l * w * h) / 1_000_000, 6)
    return None


class ExcelParser:
    """Parse exported WMS Excel files into ExcelOrderDetail records."""

    def parse_file(self, file_path: str | Path) -> list[dict]:
        """
        Parse an Excel file and return a list of dicts ready for DB insertion.
        Auto-detects which template based on columns present.
        """
        file_path = Path(file_path)
        logger.info(f"Parsing Excel file: {file_path}")

        df = pd.read_excel(file_path, dtype=str)
        logger.info(f"Read {len(df)} rows, columns: {list(df.columns)}")

        # Map Chinese columns to English field names
        rename_map = {}
        for col in df.columns:
            col_stripped = col.strip()
            if col_stripped in COLUMN_MAP:
                rename_map[col] = COLUMN_MAP[col_stripped]

        df = df.rename(columns=rename_map)
        logger.info(f"Mapped columns: {list(df.columns)}")

        records = []
        for _, row in df.iterrows():
            record = {"source_file": str(file_path)}

            for field_name in COLUMN_MAP.values():
                if field_name in df.columns:
                    val = row.get(field_name)

                    if field_name in DATETIME_FIELDS:
                        record[field_name] = _parse_dt(val)
                    elif field_name in FLOAT_FIELDS:
                        record[field_name] = _safe_float(val)
                    elif field_name in INT_FIELDS:
                        record[field_name] = _safe_int(val)
                    else:
                        record[field_name] = str(val).strip() if pd.notna(val) else None

            # Calculate volume in CBM
            record["volume_cbm"] = _calc_volume_cbm(
                record.get("measure_length"),
                record.get("measure_width"),
                record.get("measure_height"),
            )

            records.append(record)

        logger.info(f"Parsed {len(records)} records from {file_path.name}")
        return records

    async def import_to_db(
        self, db: AsyncSession, file_path: str | Path, replace_existing: bool = False
    ) -> int:
        """Parse an Excel file and import into the database."""
        log = SyncLog(sync_type="excel", status="running")
        db.add(log)
        await db.commit()

        try:
            records = self.parse_file(file_path)

            if replace_existing:
                # Remove existing records from same source file
                from sqlalchemy import delete
                await db.execute(
                    delete(ExcelOrderDetail).where(
                        ExcelOrderDetail.source_file == str(file_path)
                    )
                )

            count = 0
            for record in records:
                # Skip if order_code already exists (avoid duplicates)
                if record.get("order_code") and not replace_existing:
                    existing = await db.execute(
                        select(ExcelOrderDetail).where(
                            ExcelOrderDetail.order_code == record["order_code"]
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                db.add(ExcelOrderDetail(**record))
                count += 1

            await db.commit()

            log.status = "success"
            log.records_synced = count
            log.finished_at = datetime.now()
            await db.commit()
            logger.info(f"Imported {count} records from {file_path}")
            return count

        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            log.finished_at = datetime.now()
            await db.commit()
            logger.error(f"Excel import failed: {e}")
            raise


excel_parser = ExcelParser()
