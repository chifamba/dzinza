from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router
import httpx

app = FastAPI()
logger = setup_logging("ExtendedServicesOpenapi")

app.include_router(get_healthcheck_router("ExtendedServicesOpenapi"))

# Example proxy endpoint for /search/person
@app.get("/search/person")
async def proxy_search_person(request: Request):
    params = dict(request.query_params)
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:8001/search/person", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

# Example proxy endpoint for /audit/logs
@app.get("/audit/logs")
async def proxy_audit_logs(request: Request):
    params = dict(request.query_params)
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://localhost:8002/audit/logs", params=params)
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))

# Add similar proxy endpoints for other paths as needed, mapping to the correct internal service URLs.
