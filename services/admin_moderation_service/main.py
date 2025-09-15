"""Main entry point for admin_moderation_service service."""

from fastapi import FastAPI
from shared.app_logging import setup_logging
from shared.healthcheck import get_healthcheck_router
from .handlers import router as admin_router
from fastapi import Depends
from services.admin_moderation_service.handlers import bearer_scheme

app = FastAPI()
logger = setup_logging("admin_moderation_service")

app.include_router(get_healthcheck_router("admin_moderation_service"))
app.include_router(
    admin_router,
    prefix="/admin",
    dependencies=[Depends(bearer_scheme)]
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    if request.url.path.startswith("/admin") and "authorization" not in request.headers:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    return await app.default_exception_handler(request, exc)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting admin_moderation_service service...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
