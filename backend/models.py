from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, Index
from sqlalchemy.sql import func
from database import Base


class Product(Base):
    """Product master data from getProductList API."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_barcode = Column(String(200), unique=True, index=True)
    reference_no = Column(String(200))
    customer_code = Column(String(50), index=True)
    product_length = Column(Float)
    product_width = Column(Float)
    product_height = Column(Float)
    product_weight = Column(Float)
    product_declared_value = Column(Float)
    size_unit = Column(String(10))
    weight_unit = Column(String(10))

    # Calculated
    volume_cbm = Column(Float)  # in cubic meters

    # Metadata
    synced_at = Column(DateTime, server_default=func.now())


class SyncLog(Base):
    """Track data sync operations."""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String(50))  # 'outbound', 'inbound', 'product', 'excel', 'inventory_log'
    status = Column(String(20))     # 'running', 'success', 'failed'
    records_synced = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)


class InventoryLog(Base):
    """
    Inventory movement logs from the inventoryLog API.
    Each row = one inventory change event (inbound shelf, outbound checkout, adjustment, etc.)
    This is the primary data source for turnover analytics.
    """
    __tablename__ = "inventory_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ref_no = Column(String(200), index=True)                 # 操作单号
    reference_no = Column(String(200))                       # 参考号
    product_barcode = Column(String(200), index=True)        # 产品代码 / SKU
    warehouse_id = Column(String(20), index=True)            # 仓库ID
    quantity = Column(Integer)                               # 数量
    receiving_code = Column(String(200))                     # 入库单号
    ibl_add_time = Column(DateTime, index=True)              # 操作时间 (Chinese time)
    ibl_note = Column(Text)                                  # 备注
    customer_code = Column(String(50), index=True)           # 客户代码
    tracking_number = Column(String(200))                    # 跟踪号
    warehouse_operation_time = Column(DateTime, index=True)  # 仓库本地操作时间 (for display)
    operation_type = Column(String(100), index=True)         # 操作类型 (上架, 订单签出, FBA签出, etc.)
    inventory_type = Column(Integer)                         # 库存类型: 0=良品, 1=不良品, 2=暂存
    inventory_type_name = Column(String(50))                 # 库存类型名称
    inventory_status = Column(Integer)                       # 变化状态: 1=增加, 2=减少
    user_name = Column(String(100))                          # 操作人

    # Derived classification
    direction = Column(String(10), index=True)               # 'inbound', 'outbound', 'other'

    # Metadata
    synced_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_invlog_barcode_time", "product_barcode", "warehouse_operation_time"),
        Index("ix_invlog_customer_time", "customer_code", "warehouse_operation_time"),
        Index("ix_invlog_warehouse_time", "warehouse_id", "warehouse_operation_time"),
        Index("ix_invlog_direction_time", "direction", "warehouse_operation_time"),
        # Uniqueness: same ref_no + product_barcode + ibl_add_time = same event
        Index("uq_invlog_event", "ref_no", "product_barcode", "ibl_add_time", unique=True),
    )
