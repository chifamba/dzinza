from fastapi import APIRouter

from .endpoints import auth, users # We will create these files

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
# Add other routers here (e.g., mfa, password, admin)
# api_router.include_router(mfa.router, prefix="/mfa", tags=["MFA"])
# api_router.include_router(password.router, prefix="/password", tags=["Password Management"])
# api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
