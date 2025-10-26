import os
import aiohttp
import asyncio
from dotenv import load_dotenv
from utils.logger import logger

load_dotenv()

SERPER_API_KEY = os.getenv("SERPER_API_KEY")
SERPER_URL = "https://google.serper.dev/search"

HEADERS = {
    "X-API-KEY": SERPER_API_KEY,
    "Content-Type": "application/json"
}

async def check_single_url(session, url):
    query = f"site:{url}"
    payload = {"q": query}

    try:
        async with session.post(SERPER_URL, headers=HEADERS, json=payload, timeout=20) as resp:
            if resp.status != 200:
                logger.warning(f"{url} -> HTTP {resp.status}")
                return {"url": url, "status": "Error", "details": f"HTTP {resp.status}"}

            data = await resp.json()
            if data.get("organic"):
                return {"url": url, "status": "Indexed ✅"}
            else:
                return {"url": url, "status": "Not Indexed ❌"}
    except asyncio.TimeoutError:
        return {"url": url, "status": "Error", "details": "Timeout"}
    except Exception as e:
        return {"url": url, "status": "Error", "details": str(e)}

async def check_urls(urls):
    results = []
    connector = aiohttp.TCPConnector(limit=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [check_single_url(session, url) for url in urls]
        for future in asyncio.as_completed(tasks):
            result = await future
            results.append(result)
    return results