"""
Strata - FastAPI Application Entry Point

A quantitative finance dashboard backend providing market data,
portfolio analytics, and trading capabilities.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router, get_available_routes
from app.core.config import settings 
from app.core.db import create_db_and_tables 

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    """
    # Startup: Initialize resources
    print(f"Starting Strata in {settings.api_env} mode...")

    # Initialize database tables
    create_db_and_tables()

    yield

    # Shutdown: Cleanup resources
    print("Shutting down Strata...")


# =========================
# Application Factory
# =========================
app = FastAPI(
    title="Strata API",
    description="""
## Strata Backend

A high-performance API for market data analysis and Monte Carlo simulations.

### Features
- **Market Data**: Access historical OHLCV price data
- **Monte Carlo Simulations**: Run GBM-based price path simulations using C++ engine
- **Real-time Updates**: WebSocket support for live data (coming soon)

### Authentication
Currently open access. OAuth2 authentication coming in v2.
    """,
    version="0.1.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan,
)

# =========================
# CORS Middleware
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Include API Routers
# =========================
app.include_router(api_router)


# =========================
# Root Endpoints
# =========================
@app.get("/", tags=["Root"])
async def root() -> dict[str, Any]:
    """
    Root endpoint with API information and available routes.

    Returns API metadata and a list of all available endpoints.
    """
    return {
        "message": "Welcome to Strata API",
        "version": "0.1.0",
        "docs": "/docs" if settings.is_development else "Disabled in production",
        "health": "/health",
        "api_prefix": "/api/v1",
        "available_routes": get_available_routes(),
    }


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint.

    Returns the current status of the API service including
    environment information and uptime timestamp.
    """
    return {
        "status": "healthy",
        "environment": settings.api_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "0.1.0",
        "services": {
            "database": "connected",
            "monte_carlo_engine": _check_engine_status(),
        },
    }


def _check_engine_status() -> str:
    """Check if the Monte Carlo engine is available."""
    try:
        from app.engine import run_monte_carlo

        return "available" if run_monte_carlo is not None else "not_built"
    except ImportError:
        return "not_built"


# =========================
# Development Server Entry
# =========================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )

