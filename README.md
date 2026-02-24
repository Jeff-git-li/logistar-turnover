# Logistar Turnover Dashboard

Warehouse sales/turnover analytics dashboard with real-time WMS data visualization.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Next.js 14    │────▶│   FastAPI (Py)    │────▶│  WMS APIs     │
│   React 18      │     │   SQLAlchemy      │     │  (3rd party)  │
│   Recharts      │     │   SQLite          │     └───────────────┘
│   Tailwind CSS  │     │                   │
│   :3000         │     │   :8000           │     ┌───────────────┐
└─────────────────┘     │                   │────▶│  Excel Files  │
                        └──────────────────┘     │  (exported)   │
                                                  └───────────────┘
```

## KPIs Tracked

1. **Inventory Turnover Rate** — Outbound / Average Inventory
2. **Inbound vs Outbound Volume** — Daily/weekly/monthly time series
3. **Customer-level Breakdown** — Per-customer in/out metrics
4. **Product/SKU Analysis** — Volume, weight, value rankings
5. **Warehouse Utilization (CBM)** — Cubic meters in/out tracking

## Quick Start

### Backend (FastAPI + Python)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # Edit with your WMS API credentials
uvicorn main:app --reload --port 8001
```

API docs: http://localhost:8001/docs

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:3000

## Data Sources

### WMS APIs (auto-sync)
| API | Service Name | Data |
|-----|-------------|------|
| Outbound Orders | `getOrderList` | Dropshipping orders, ship times, dimensions |
| Inbound Receivings | `getReceivingListForYB` | Receiving entries, putaway times, quantities |
| Product Catalog | `getProductList` | SKU dimensions, weight, declared value |

### Excel Import (manual)
Upload WMS-exported Excel files via the **Data Sync** page. Supports both:
- **Horizontal template** — order details + total fees
- **Fee breakdown template** — order details + itemized shipping/operation/fuel fees

## Project Structure

```
logistar-turnover/
├── backend/
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings from .env
│   ├── database.py             # SQLAlchemy async engine
│   ├── models.py               # DB models (outbound, inbound, products, excel)
│   ├── routers/
│   │   ├── analytics.py        # GET /api/analytics/* endpoints
│   │   └── sync.py             # POST /api/sync/* endpoints
│   └── services/
│       ├── wms_client.py       # WMS API HTTP client
│       ├── sync_service.py     # Data sync logic (API → DB)
│       ├── excel_parser.py     # Excel file parser (CN columns → EN fields)
│       └── analytics.py        # KPI calculation queries
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx        # Dashboard (main overview)
│   │   │   ├── volume/         # Inbound/Outbound volume page
│   │   │   ├── customers/      # Customer breakdown page
│   │   │   ├── products/       # Product/SKU analysis page
│   │   │   └── sync/           # Data sync & Excel upload page
│   │   ├── components/         # Reusable chart/UI components
│   │   └── lib/api.ts          # Typed API client
│   ├── tailwind.config.js
│   └── next.config.js          # Proxy /api → FastAPI :8000
└── README.md
```

## API Endpoints

### Analytics
- `GET /api/analytics/dashboard` — Summary stats
- `GET /api/analytics/inbound-outbound` — Volume time series
- `GET /api/analytics/turnover` — Turnover rate calculation
- `GET /api/analytics/customers` — Customer breakdown
- `GET /api/analytics/products` — Product rankings
- `GET /api/analytics/warehouse-utilization` — CBM tracking
- `GET /api/analytics/fees` — Fee breakdown (Excel data)

### Data Sync
- `POST /api/sync/outbound` — Sync outbound from WMS
- `POST /api/sync/inbound` — Sync inbound from WMS
- `POST /api/sync/products` — Sync product catalog
- `POST /api/sync/excel-upload` — Upload & import Excel file
- `GET /api/sync/logs` — View sync history

All analytics endpoints accept optional `date_from`, `date_to`, `warehouse_code`, and `customer_code` query params for filtering.
