"""API v1 endpoints package."""

from .market import router as market_router
from .simulation import router as simulation_router
from .statarb import router as statarb_router
from .options import router as options_router
from .portfolio import router as portfolio_router
from .backtest import router as backtest_router
from .stream import router as stream_router
from .system import router as system_router
from .news import router as news_router

__all__ = ["market_router", "simulation_router", "statarb_router", "options_router", "portfolio_router", "stream_router", "backtest_router", "system_router", "news_router"]
