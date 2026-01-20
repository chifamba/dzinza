from fastapi import APIRouter, Request
import socket

def get_healthcheck_router(service_name: str) -> APIRouter:
    router = APIRouter()

    @router.get("/health")
    async def health(request: Request):
        hostname = socket.gethostname()
        return {
            "status": "ok",
            "service": service_name,
            "hostname": hostname
        }

    return router
