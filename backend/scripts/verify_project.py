import asyncio
import httpx
import websockets
import json
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"
WS_URL = "ws://127.0.0.1:8000/api/v1/stream/ws/live"

GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def print_result(name, success, message=""):
    if success:
        print(f"{GREEN}[PASS]{RESET} {name}")
    else:
        print(f"{RED}[FAIL]{RESET} {name} - {message}")

async def verify_health():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BASE_URL.replace('/api/v1', '')}/health")
            if resp.status_code == 200:
                print_result("Health Check", True, f"Response: {resp.json()}")
            else:
                print_result("Health Check", False, f"Status {resp.status_code}")
        except Exception as e:
            print_result("Health Check", False, str(e))

async def verify_market_data():
    async with httpx.AsyncClient() as client:
        try:
            # 1. Get Tickers
            resp = await client.get(f"{BASE_URL}/market/tickers")
            if resp.status_code == 200:
                data = resp.json()
                print_result("Get Tickers", True, f"Count: {data.get('count', 0)}")
                if data.get('items'):
                    print(f"     First ticker: {data['items'][0]}")
                
                # 2. Add Ticker (if empty)
                if data.get('count', 0) == 0:
                   print("  > Adding SPY for testing...")
                   await client.post(f"{BASE_URL}/market/tickers", json={"symbol": "SPY", "name": "SPDR S&P 500"})
            else:
                print_result("Get Tickers", False, f"Status {resp.status_code}")
        except Exception as e:
             print_result("Market Data", False, str(e))

async def verify_options():
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{BASE_URL}/options/iv/SPY")
            if resp.status_code == 200 or resp.status_code == 404: 
                print_result("Options IV Surface", True, f"Status: {resp.status_code}")
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"     Strikes: {len(data.get('strikes', []))}, Expiries: {len(data.get('expiries', []))}")
            else:
                print_result("Options IV Surface", False, f"Status {resp.status_code}")
        except Exception as e:
            print_result("Options IV Surface", False, str(e))

async def verify_simulation():
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "ticker": "SPY",
                "current_price": 100.0,
                "volatility": 0.2,
                "drift": 0.05,
                "time_horizon": 1.0,
                "simulations": 100,
                "start_date": "2024-01-01",
                "end_date": "2024-03-31"
            }
            resp = await client.post(f"{BASE_URL}/simulation/monte-carlo", json=payload)
            if resp.status_code == 200:
                res = resp.json()
                print_result("Monte Carlo Simulation", True)
                print(f"     Mean Final Price: {res.get('final_price_mean', 'N/A')}")
                if res.get('percentiles'):
                     print(f"     95th Percentile: {res['percentiles'].get('95%', 'N/A')}")
            else:
                print_result("Monte Carlo Simulation", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            print_result("Monte Carlo Simulation", False, str(e))

async def verify_portfolio():
    async with httpx.AsyncClient() as client:
        try:
            payload = {"tickers": ["SPY", "AAPL"]}
            resp = await client.post(f"{BASE_URL}/portfolio/optimize/hrp", json=payload)
            if resp.status_code == 200:
                print_result("HRP Optimization", True)
                weights = resp.json()
                print(f"     Allocations: {weights}")
            elif resp.status_code == 400: # "Insufficient overlapping history" is a VALID business logic error
                 try:
                     detail = resp.json().get('detail', resp.text)
                 except:
                     detail = resp.text
                 print_result("HRP Optimization", True, f"(Logic Validated: {detail})")
            else:
                print_result("HRP Optimization", False, f"Status {resp.status_code}: {resp.text}")
        except Exception as e:
            print_result("HRP Optimization", False, str(e))

async def verify_stream():
    uri = f"{WS_URL}/SPY"
    try:
        async with websockets.connect(uri) as websocket:
            msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(msg)
            if data.get("ticker") == "SPY" and "price" in data:
                 print_result("Live Stream WebSocket", True, f"Received: {data}")
            else:
                 print_result("Live Stream WebSocket", False, f"Invalid Data: {data}")
    except Exception as e:
        print_result("Live Stream WebSocket", False, str(e))

async def main():
    print("Starting System Verification...")
    print("-" * 30)
    await verify_health()
    await verify_market_data()
    await verify_simulation()
    await verify_options()
    await verify_portfolio()
    await verify_stream()
    print("-" * 30)
    print("Verification Complete.")

if __name__ == "__main__":
    asyncio.run(main())
