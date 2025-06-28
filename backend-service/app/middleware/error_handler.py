from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseCallNext
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR, HTTP_502_BAD_GATEWAY, HTTP_503_SERVICE_UNAVAILABLE, HTTP_504_GATEWAY_TIMEOUT
import httpx

from app.utils.logger import logger # Assuming logger is set up

# Note: The proxy_service.py already returns JSONResponses for specific httpx errors.
# FastAPI's @app.exception_handler in main.py is generally preferred for centralized error handling.
# This middleware example is more for demonstrating a BaseHTTPMiddleware approach if needed,
# or for catching errors that might occur within the gateway *before* or *after* the proxy_service call.

class GatewayErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseCallNext):
        try:
            response = await call_next(request)
            # If response is from proxy_service and already an error JSONResponse, it will pass through.
            # This middleware could potentially intercept and re-format those if desired,
            # but usually proxy_service should format them adequately.
            return response
        except HTTPException as http_exc:
            # This will catch HTTPErrors raised by FastAPI itself or other middleware/dependencies
            # before proxy_service, or if proxy_service re-raises an HTTPException.
            # Logged by the handler in main.py usually.
            logger.debug(f"GatewayErrorHandlerMiddleware caught HTTPException: {http_exc.status_code} {http_exc.detail}")
            raise http_exc # Re-raise to be handled by FastAPI's @app.exception_handler

        except httpx.TimeoutException as exc: # Explicitly catch httpx errors here if not caught by proxy_service
            logger.error(f"Gateway: Downstream service timeout: {exc.request.url}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_504_GATEWAY_TIMEOUT,
                content={"detail": f"Timeout connecting to downstream service: {exc.request.url}"},
            )
        except httpx.ConnectError as exc:
            logger.error(f"Gateway: Downstream service connection error: {exc.request.url}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_503_SERVICE_UNAVAILABLE,
                content={"detail": f"Could not connect to downstream service: {exc.request.url}"},
            )
        except httpx.RequestError as exc: # Other httpx request errors
            logger.error(f"Gateway: Downstream service request error: {exc.request.url}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_502_BAD_GATEWAY,
                content={"detail": f"Error communicating with downstream service: {exc.request.url}"},
            )
        except Exception as exc:
            # Catch-all for any other unhandled exceptions within the gateway's own logic
            # (not necessarily from downstream services if proxy_service handles its errors).
            logger.error(f"Unhandled exception in GatewayErrorHandlerMiddleware: {exc}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "An unexpected internal server error occurred at the API gateway."},
            )

# To use this middleware, add it in main.py:
# from app.middleware.error_handler import GatewayErrorHandlerMiddleware
# app.add_middleware(GatewayErrorHandlerMiddleware)

# However, for FastAPI, using @app.exception_handler in main.py for specific
# exception types (like httpx.RequestError, HTTPException, and a general Exception)
# is often cleaner and more direct. The proxy_service.py already converts httpx errors
# to FastAPIResponse. The @app.exception_handler in main.py will handle general errors.
# This middleware might be redundant if main.py has comprehensive exception handlers.
# It's included for structural completeness corresponding to original service if it had such a middleware.
