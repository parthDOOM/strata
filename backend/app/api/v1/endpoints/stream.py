from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ConnectionManager, price_generator
import asyncio

router = APIRouter(prefix="/stream", tags=["Live Stream"])
manager = ConnectionManager()

@router.websocket("/ws/live/{ticker}")
async def websocket_endpoint(websocket: WebSocket, ticker: str):
    """
    WebSocket endpoint for live price streaming.
    """
    await manager.connect(websocket)
    try:
        # Create a generator for this connection
        async for data in price_generator(ticker):
            # Check connection state before sending (though send_json raises if closed)
            await websocket.send_json(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
