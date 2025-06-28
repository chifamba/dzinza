from fastapi import Depends, HTTPException, status
from app.db.models.user_model import User as DBUser, UserRole
from app.db.database import get_db_session
from app.core.security import verify_token
from app.core.config import settings as app_settings
from app.crud import user_crud as app_user_crud
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import Optional

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{app_settings.API_V1_STR}/auth/login")

async def get_current_user_dependency(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db_session)
) -> DBUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = verify_token(token, app_settings.JWT_SECRET_KEY)
    if payload is None or payload.get("type") != "access":
        raise credentials_exception
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception
    user = await app_user_crud.get_user_by_id(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user_dependency(
    current_user: DBUser = Depends(get_current_user_dependency)
) -> DBUser:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user

async def get_current_admin_user_dependency(
    current_user: DBUser = Depends(get_current_active_user_dependency)
) -> DBUser:
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user
