import asyncio
import aiohttp
import time
import structlog
import os

logger = structlog.get_logger()
API_URL = os.getenv("API_URL", "http://127.0.0.1:8000/api/v1")

async def login(session):
    async with session.post(f"{API_URL}/auth/login", json={"email": "admin@rootrecall.com", "password": "securepassword123"}) as resp:
        if resp.status == 200:
            data = await resp.json()
            return data.get("access_token")
        else:
            logger.error("Login failed", status=resp.status, text=await resp.text())
            return None

async def trigger_chaos_scenario(session, headers):
    logger.info("Triggering chaos scenario (Random)")
    # Hit trigger endpoint
    async with session.post(f"{API_URL}/demo/trigger", headers=headers) as res:
        if res.status == 200:
            logger.info("Successfully triggered chaos")
        else:
            logger.warning("Failed to trigger chaos", status=res.status, text=await res.text())

async def wait_and_remediate(session, headers, delay):
    await asyncio.sleep(delay)
    logger.info("Attempting auto-remediation")
    async with session.post(f"{API_URL}/demo/remediate", headers=headers) as res:
        if res.status == 200:
            logger.info("Remediation initiated successfully")
        else:
            logger.warning("Remediation failed or not ready", status=res.status)

async def run_chaos_loop(duration_minutes=5):
    logger.info(f"Starting chaos engineering loop for {duration_minutes} minutes")
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    async with aiohttp.ClientSession() as session:
        token = await login(session)
        if not token:
            logger.error("Could not obtain auth token. Exiting.")
            return

        headers = {"Authorization": f"Bearer {token}"}

        while time.time() < end_time:
            # Trigger
            await trigger_chaos_scenario(session, headers)
            
            # Wait for anomaly and RCA to generate (simulated delay of 15 seconds)
            await asyncio.sleep(15)
            
            # Attempt remediation
            await wait_and_remediate(session, headers, 5)
            
            # Let it stabilize
            logger.info("Waiting for system to stabilize before next chaos injection")
            await asyncio.sleep(20)

    logger.info("Chaos engineering window completed successfully")

if __name__ == "__main__":
    asyncio.run(run_chaos_loop(1)) # Run for 1 minute for testing
