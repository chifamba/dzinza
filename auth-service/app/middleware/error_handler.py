from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseCallNext
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from app.utils.logger import logger

# Note: FastAPI's @app.exception_handler is often more direct for handling specific exceptions.
# This middleware example shows a more general BaseHTTPMiddleware approach.
# The handlers in main.py are likely sufficient for most cases.

class CustomErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseCallNext):
        try:
            response = await call_next(request)
            return response
        except HTTPException as http_exc:
            # Logged by the handler in main.py already if not caught before
            # logger.error(f"HTTPException in middleware: {http_exc.status_code} {http_exc.detail}")
            # This re-raises the HTTPException to be caught by FastAPI's default or custom handlers.
            raise http_exc
        except Exception as exc:
            # This will catch any unhandled exceptions that occur during the request processing
            # after this middleware and before it returns.
            # It's a fallback. The generic handler in main.py should also catch this.
            logger.error(f"Unhandled exception in CustomErrorHandlerMiddleware: {exc}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "An unexpected internal server error occurred from middleware."},
            )

# How to add this middleware in main.py (if desired, but main.py already has handlers):
# from app.middleware.error_handler import CustomErrorHandlerMiddleware
# app.add_middleware(CustomErrorHandlerMiddleware)

# Generally, for FastAPI, using @app.exception_handler in main.py for specific
# exception types (like HTTPException, RequestValidationError, and a catch-all Exception)
# is the more common and often cleaner pattern than a BaseHTTPMiddleware for error handling.
# The current setup in main.py is good. This file is more of a structural placeholder
# if a different style of error handling middleware was desired.

def register_error_handlers(app):
    """
    This function could be used to consolidate error handler registration
    if you had many custom handlers. For now, main.py's @app.exception_handler
    decorators are effective.
    """
    pass
