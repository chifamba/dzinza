from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings # To get rate limit strings

# Initialize the limiter
# The key function determines how to identify a client (e.g., by IP address)
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])

# It's common to attach the limiter to the app's state for global access
# and to add an exception handler for RateLimitExceeded.
# This will be done in main.py.

# This file primarily just defines the limiter instance.
# Specific routes will be decorated with @limiter.limit(...)

# Example function to setup rate limiting in main.py (can be called on startup)
# async def setup_rate_limiter_app(app: Starlette): # Or app: FastAPI
#     app.state.limiter = limiter
#     app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Note: Applying different limits to different proxied paths through a single
# catch-all proxy route is non-trivial with decorator-based rate limiters like slowapi.
# Options for path-specific limits on a proxy:
# 1. Multiple proxy endpoints: Define several proxy routes for different path prefixes,
#    each decorated with a different rate limit. This makes the routing more explicit.
# 2. Custom middleware: A middleware that inspects request.url.path, determines the
#    appropriate rate limit string (e.g., from a config map), and then manually
#    invokes the limiter's check (e.g., `await app.state.limiter.hit(limit_string, request.scope)`).
#    This is more flexible but more complex to implement correctly.
#
# For now, we'll apply a default limit to the main proxy endpoint in gateway.py.
# Stricter limits for specific paths like /auth/login (which are proxied) would need one of these approaches.
# The simplest for now is that auth-service itself could also implement rate limiting for its sensitive endpoints.
# If the gateway is to do it, approach 1 (multiple proxy endpoints with different decorators) or
# a more advanced custom middleware (approach 2) would be needed for path-dependent rates.

# Let's assume a default limit is applied to the main proxy route, and sensitive services
# (like auth-service) apply their own stricter limits.
# The RATE_LIMIT_AUTH_ENDPOINTS from settings is not directly used by this simple setup yet.
