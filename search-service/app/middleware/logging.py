"""
Request logging middleware for search service.
"""
from datetime import datetime
from uuid import uuid4
import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = structlog.get_logger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = datetime.now()
        request_id = str(uuid4())
        
        # Log request
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            user_agent=request.headers.get("user-agent"),
        )
        
        response = await call_next(request)
        
        # Log response
        process_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(
            "Request completed",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            process_time_ms=process_time,
        )
        
        return response
