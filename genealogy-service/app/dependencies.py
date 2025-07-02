# genealogy-service/app/dependencies.py
# Placeholder for common dependencies like get_current_user, get_db_session etc.

# Example:
# from fastapi import Depends, HTTPException, status
# from jose import JWTError, jwt
# from pydantic import BaseModel
# from .core.config import settings

# class TokenData(BaseModel):
#     username: str | None = None

# async def get_current_user(token: str = Depends(settings.OAUTH2_SCHEME)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenData(username=username)
#     except JWTError:
#         raise credentials_exception
#     # user = get_user(fake_users_db, username=token_data.username) # Replace with actual user fetching
#     # if user is None:
#     #     raise credentials_exception
#     # return user
#     return {"username": token_data.username} # Placeholder return

from fastapi import Depends, HTTPException, status, Request
from pydantic import BaseModel
import httpx

class AuthenticatedUser(BaseModel):
    id: str
    username: str
    email: str | None = None
    is_active: bool = True
    roles: list[str] = []

async def get_current_active_user(request: Request) -> AuthenticatedUser:
    """
    Dependency to validate the Authorization header with the Auth Service and return user info.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ", 1)[1]
    # Replace with your actual Auth Service URL
    AUTH_SERVICE_URL = "http://auth-service:8000/api/v1/users/me"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                AUTH_SERVICE_URL,
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_data = resp.json()
        return AuthenticatedUser(**user_data)
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        )

def require_role(role: str):
    """Placeholder dependency for role-based access control. Accepts any role and does nothing for now."""
    def dependency(current_user: AuthenticatedUser = Depends(get_current_active_user)):
        # In a real implementation, check current_user's roles/permissions here
        return current_user
    return dependency
