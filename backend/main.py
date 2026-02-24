"""
Logistar Turnover — FastAPI Backend
Warehouse sales/turnover analytics dashboard.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db
from routers import analytics, sync

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Starting up — initializing database...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Logistar Turnover API",
    description="Warehouse turnover rate analytics & data visualization backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analytics.router)
app.include_router(sync.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "logistar-turnover"}
