import asyncio
import aiohttp
import time
import json
import websockets

API_URL = "http://127.0.0.1:8000/api/v1"
WS_URL = "ws://127.0.0.1:8000/ws/telemetry"
CONCURRENT_USERS = 100

async def login():
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{API_URL}/auth/login", json={"email": "admin@rootrecall.com", "password": "securepassword123"}) as resp:
            data = await resp.json()
            return data.get("access_token")

async def simulate_user(user_id, token):
    try:
        # Simulate API load
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {token}"}
            for _ in range(5):
                await session.get(f"{API_URL}/incidents", headers=headers)
                await asyncio.sleep(0.5)
        
        # Simulate WebSocket load
        async with websockets.connect(f"{WS_URL}?token={token}") as ws:
            for _ in range(10): # Listen to 10 events
                await ws.recv()
        print(f"User {user_id} completed successfully.")
    except Exception as e:
        print(f"User {user_id} failed: {e}")

async def run_load_test():
    print("Starting load test...")
    token = await login()
    if not token:
        print("Failed to login as admin. Is the server running?")
        return
    
    start_time = time.time()
    tasks = [simulate_user(i, token) for i in range(CONCURRENT_USERS)]
    await asyncio.gather(*tasks)
    
    print(f"Load test completed in {time.time() - start_time:.2f} seconds.")

if __name__ == "__main__":
    asyncio.run(run_load_test())
