"""
API v1 router aggregator.

Combines all endpoint routers into a single versioned API router.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import market_router, simulation_router, statarb_router, options_router, portfolio_router, stream_router, backtest_router, system_router, news_router

# Create the v1 API router
api_router = APIRouter(prefix="/api/v1")

# Include all endpoint routers
api_router.include_router(market_router)
api_router.include_router(simulation_router)
api_router.include_router(statarb_router)
api_router.include_router(options_router)
api_router.include_router(portfolio_router)
api_router.include_router(stream_router)
api_router.include_router(backtest_router)
api_router.include_router(backtest_router)
api_router.include_router(system_router)
api_router.include_router(news_router, prefix="/news", tags=["News"])


def get_available_routes() -> list[dict]:
    """
    Get a list of all available API routes.

    Returns:
        List of route information dictionaries
    """
    routes = []
    for route in api_router.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            routes.append({
                "path": f"/api/v1{route.path}",
                "methods": list(route.methods - {"HEAD", "OPTIONS"}),
                "name": route.name,
                "summary": getattr(route, "summary", None),
            })
    return routes
