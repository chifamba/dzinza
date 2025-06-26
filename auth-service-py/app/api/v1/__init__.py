from fastapi import APIRouter

from .auth_router import router as auth_router
from .mfa_router import router as mfa_router
from .password_router import router as password_router
from .admin_router import router as admin_router
from .social_auth_router import router as social_auth_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
# Social auth routes are often also prefixed with /auth, but have distinct paths like /auth/google/callback
# Ensure paths within social_auth_router do not directly clash with auth_router paths if prefix is the same.
# Or use a sub-prefix e.g. /auth/social/*
api_v1_router.include_router(social_auth_router, prefix="/auth", tags=["Social Authentication"])
api_v1_router.include_router(mfa_router, prefix="/mfa", tags=["Multi-Factor Authentication"])
api_v1_router.include_router(password_router, prefix="/password", tags=["Password Management"])
api_v1_router.include_router(admin_router, prefix="/admin", tags=["Admin"])


# Placeholder for a user profile router if needed (e.g. /users/me)
# from .user_router import router as user_router
# api_v1_router.include_router(user_router, prefix="/users", tags=["Users"])
