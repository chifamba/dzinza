from fastapi import APIRouter, Depends, HTTPException, status, Query, Response as FastAPIResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx # For making requests to social providers' token and user info endpoints

from app.core.config import settings
from app.core import security
from app.crud import user_crud, token_crud
from app.db.database import get_db_session
from app.db.models.user_model import User
from app.schemas import user_schema, token_schema
from datetime import datetime, timedelta, timezone

router = APIRouter()

# This is a simplified flow. Real social auth is more complex and involves
# frontend redirects and handling state parameter for CSRF protection.

# --- Google Social Auth ---
@router.get("/google/login", include_in_schema=False) # Usually a redirect, not a typical API endpoint
async def google_login_redirect():
    # This endpoint would typically redirect the user to Google's OAuth 2.0 server
    # The URL would include client_id, redirect_uri, scope, response_type, state
    # from fastapi.responses import RedirectResponse
    # google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?..."
    # return RedirectResponse(google_auth_url)
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Frontend should handle redirect to Google.")

@router.get("/google/callback", response_model=token_schema.Token)
async def google_auth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None), # Important for CSRF protection, verify it
    db: AsyncSession = Depends(get_db_session),
    response: FastAPIResponse = FastAPIResponse() # For setting cookies
):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET or not settings.GOOGLE_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth not configured.")

    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": str(settings.GOOGLE_REDIRECT_URI), # Ensure it's a string
        "grant_type": "authorization_code",
    }
    try:
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, data=token_data)
            token_res.raise_for_status() # Raise an exception for HTTP errors
            token_json = token_res.json()
            google_access_token = token_json.get("access_token")
            # id_token = token_json.get("id_token") # Contains user info directly

        if not google_access_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not retrieve access token from Google.")

        # Get user info from Google
        userinfo_url = "https://www.googleapis.com/oauth2/v1/userinfo"
        headers = {"Authorization": f"Bearer {google_access_token}"}
        async with httpx.AsyncClient() as client:
            userinfo_res = await client.get(userinfo_url, headers=headers)
            userinfo_res.raise_for_status()
            userinfo_json = userinfo_res.json()

        google_email = userinfo_json.get("email")
        if not google_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not retrieve email from Google.")

        # Check if user exists or create new one
        user = await user_crud.get_user_by_email(db, email=google_email)
        if not user:
            user_create_data = user_schema.UserCreate(
                email=google_email,
                password=security.get_password_hash(secrets.token_urlsafe(16)), # Generate random password for social users
                first_name=userinfo_json.get("given_name"),
                last_name=userinfo_json.get("family_name"),
                is_verified=userinfo_json.get("verified_email", False),
                is_active=True
            )
            user = await user_crud.create_user(db, user_in=user_create_data)
        elif not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User account is inactive.")

        # TODO: Optionally link Google ID to user account if not already:
        # user.google_provider_id = userinfo_json.get("id")
        # await user_crud.update_user(db, user=user, user_in={"google_provider_id": userinfo_json.get("id")})


        # Issue application tokens
        access_token = security.create_access_token(subject=str(user.id))
        refresh_token_str = security.create_refresh_token(subject=str(user.id))

        refresh_token_payload = security.verify_token(refresh_token_str, settings.JWT_REFRESH_SECRET_KEY)
        if not refresh_token_payload or not refresh_token_payload.get("exp"):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create refresh token payload")
        expires_at_dt = datetime.fromtimestamp(refresh_token_payload["exp"], tz=timezone.utc)

        await token_crud.revoke_all_user_refresh_tokens(db, user_id=user.id)
        await token_crud.create_refresh_token(
            db,
            token_in=token_schema.RefreshTokenCreate(token=refresh_token_str, user_id=user.id, expires_at=expires_at_dt),
            user_id=user.id
        )
        await user_crud.update_last_login(db, user_id=user.id)

        # Set cookies or return tokens in response body
        # response.set_cookie(...)
        return token_schema.Token(access_token=access_token, refresh_token=refresh_token_str)

    except httpx.HTTPStatusError as e:
        # Log e.request.url, e.response.status_code, e.response.text
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Error communicating with Google: {e.response.status_code}")
    except Exception as e:
        # Log error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


# --- Facebook Social Auth (Placeholder - Similar structure to Google) ---
@router.get("/facebook/login", include_in_schema=False)
async def facebook_login_redirect():
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Frontend should handle redirect to Facebook.")

@router.get("/facebook/callback", response_model=token_schema.Token)
async def facebook_auth_callback(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    response: FastAPIResponse = FastAPIResponse()
):
    if not settings.FACEBOOK_CLIENT_ID or not settings.FACEBOOK_CLIENT_SECRET or not settings.FACEBOOK_REDIRECT_URI:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Facebook OAuth not configured.")
    # 1. Exchange code for Facebook access token
    #    POST to https://graph.facebook.com/vX.X/oauth/access_token
    # 2. Get user info from Facebook using the access token
    #    GET https://graph.facebook.com/me?fields=id,name,email,first_name,last_name
    # 3. Find or create local user
    # 4. Issue application JWTs
    # (Error handling, cookie setting similar to Google)
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Facebook callback not implemented.")


# Update the v1 router to include social_auth_router
# This should be done in app/api/v1/__init__.py, I'll do it next.
import secrets # for UserCreate password

# Note: The social auth callback endpoints are GET requests as per OAuth2 spec for the authorization code grant flow.
# The provider redirects the user's browser (via GET) to your callback URI with the code and state.
