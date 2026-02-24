from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, Index
from sqlalchemy.sql import func
from database import Base


class OutboundOrder(Base):
    """Outbound/dropshipping orders from getOrderList API."""
    __tablename__ = "outbound_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), unique=True, index=True)
    order_code = Column(String(100), index=True)
    reference_no = Column(String(200))
    customer_code = Column(String(50), index=True)
    order_status = Column(String(10))
    parcel_quantity = Column(Integer, default=1)
    country_code = Column(String(10))
    mp_code = Column(String(50))
    add_time = Column(DateTime, index=True)
    ship_time = Column(DateTime, index=True)
    service_number = Column(String(100))
    tracking_number = Column(String(100))
    so_weight = Column(Float)
    so_actual_weight = Column(Float)
    so_vol_weight = Column(Float)
    order_measure_length = Column(Float)
    order_measure_width = Column(Float)
    order_measure_height = Column(Float)
    warehouse_code = Column(String(20), index=True)
    picking_code = Column(String(100))
    order_measure = Column(String(100))

    # Calculated fields
    volume_cbm = Column(Float)  # in cubic meters

    # Metadata
    synced_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_outbound_customer_ship", "customer_code", "ship_time"),
        Index("ix_outbound_warehouse_ship", "warehouse_code", "ship_time"),
    )


class InboundReceiving(Base):
    """Inbound receiving orders from getReceivingListForYB API."""
    __tablename__ = "inbound_receivings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    receiving_id = Column(String(50), unique=True, index=True)
    receiving_code = Column(String(100), index=True)
    warehouse_code = Column(String(20), index=True)
    customer_code = Column(String(50), index=True)
    receiving_type = Column(String(10))
    expected_date = Column(String(20))
    receiving_status = Column(Integer)
    total_packages = Column(Integer)
    receiving_add_time = Column(DateTime, index=True)
    pd_putaway_time = Column(DateTime, index=True)
    sku_species = Column(Integer)
    expect_qty = Column(Integer)
    received_qty = Column(Integer)
    shelves_qty = Column(Integer)

    # Metadata
    synced_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_inbound_customer_add", "customer_code", "receiving_add_time"),
        Index("ix_inbound_warehouse_add", "warehouse_code", "receiving_add_time"),
    )


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


class ExcelOrderDetail(Base):
    """Detailed order data parsed from exported Excel files."""
    __tablename__ = "excel_order_details"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_no = Column(String(200), index=True)       # 参考号
    order_code = Column(String(100), index=True)          # 订单号
    platform_ref_no = Column(String(200))                 # 平台参考号
    public_platform_no = Column(String(200))              # 公共平台单号
    tracking_number = Column(String(200))                 # 运单号
    picking_code = Column(String(100))                    # 拣货单号
    customer_code = Column(String(50), index=True)        # 客户代码
    parcel_quantity = Column(Integer)                     # 订单内件数
    shipping_method = Column(String(100))                 # 运输方式
    warehouse_code = Column(String(20), index=True)       # 仓库代码
    order_status = Column(String(50))                     # 订单状态
    warehouse_remark = Column(Text)                       # 仓库备注
    exception_info = Column(Text)                         # 异常情况
    removal_type = Column(String(50))                     # 下架类型
    recipient_name = Column(String(200))                  # 收件人姓名
    recipient_company = Column(String(200))               # 收件人公司名
    id_number = Column(String(100))                       # 证件号
    country_code = Column(String(10))                     # 目的国家
    country_cn = Column(String(100))                      # 国家中文名称
    country_en = Column(String(100))                      # 国家英文名称
    state_province = Column(String(100))                  # 州/省
    city = Column(String(100))                            # 城市
    address1 = Column(Text)                               # 联系地址1
    address2 = Column(Text)                               # 联系地址2
    address3 = Column(Text)                               # 联系地址3
    recipient_phone = Column(String(50))                  # 收件人电话
    recipient_phone2 = Column(String(50))                 # 收件人电话2
    recipient_fax = Column(String(50))                    # 收件人传真
    recipient_email = Column(String(200))                 # 收件人邮箱
    recipient_zip = Column(String(20))                    # 收件人邮编
    recipient_door_no = Column(String(50))                # 收件人门牌号
    recipient_tax_id = Column(String(100))                # 收件人税号
    recipient_eori = Column(String(100))                  # 收件人EORI
    vat_no = Column(String(100))                          # VAT税号
    sender_eori = Column(String(100))                     # 发件人EORI
    signature_service = Column(String(50))                # 签名服务
    insurance_service = Column(String(50))                # 保险服务
    insured_amount = Column(Float)                        # 投保金额
    insured_currency = Column(String(10))                 # 投保金额币种
    product_serial = Column(String(200))                  # 产品序列号
    order_time = Column(DateTime, index=True)             # 下单时间
    print_time = Column(DateTime)                         # 打印时间
    pack_time = Column(DateTime)                          # 打包时间
    ship_time = Column(DateTime, index=True)              # 出货时间
    cutoff_time = Column(DateTime)                        # 截单时间
    zone_code = Column(String(50))                        # 分区代码
    zone_plan = Column(String(100))                       # 分区方案
    billing_weight = Column(Float)                        # 计费重量
    actual_weight = Column(Float)                         # 实际重量
    vol_weight = Column(Float)                            # 体积重量
    net_weight = Column(Float)                            # 产品净重
    order_volume_cm3 = Column(Float)                      # 订单体积（cm³）
    volume = Column(String(100))                          # 体积
    measure_length = Column(Float)                        # 签出包裹体积长(CM)
    measure_width = Column(Float)                         # 签出包裹体积宽(CM)
    measure_height = Column(Float)                        # 签出包裹体积高(CM)

    # Fee fields (from template 2)
    shipping_fee_usd = Column(Float)                      # 运输费(USD)
    operation_fee_usd = Column(Float)                     # 操作费(USD)
    oversize_fee_usd = Column(Float)                      # 超长费(USD)
    packaging_fee_usd = Column(Float)                     # 包材费用(USD)
    fuel_surcharge_usd = Column(Float)                    # 燃油附加费(USD)
    super_remote_fee_usd = Column(Float)                  # 超偏远(USD)
    remote_fee_usd = Column(Float)                        # 偏远(USD)
    residential_fee_usd = Column(Float)                   # 住宅附加费(USD)

    total_fee_usd = Column(Float)                         # 总费用(USD)
    other_fee_usd = Column(Float)                         # 其他费用(USD) (template 1)
    cod_amount = Column(Float)                            # COD
    cod_currency = Column(String(10))                     # COD币种
    sync_time = Column(DateTime)                          # 同步时间
    billing_time = Column(DateTime)                       # 计费时间
    packaging_material = Column(String(100))              # 包材
    delivery_method = Column(String(100))                 # 目的地派送方式
    creator = Column(String(100))                         # 创建人
    order_remark = Column(Text)                           # 订单备注
    goods_value = Column(Float)                           # 货值
    goods_value_currency = Column(String(10))             # 货值币种
    platform = Column(String(100))                        # 平台
    ioss = Column(String(100))                            # IOSS

    # Calculated
    volume_cbm = Column(Float)

    # Metadata
    source_file = Column(String(500))
    imported_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index("ix_excel_customer_ship", "customer_code", "ship_time"),
        Index("ix_excel_warehouse_ship", "warehouse_code", "ship_time"),
    )


class SyncLog(Base):
    """Track data sync operations."""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String(50))  # 'outbound', 'inbound', 'product', 'excel'
    status = Column(String(20))     # 'running', 'success', 'failed'
    records_synced = Column(Integer, default=0)
    error_message = Column(Text)
    started_at = Column(DateTime, server_default=func.now())
    finished_at = Column(DateTime)
