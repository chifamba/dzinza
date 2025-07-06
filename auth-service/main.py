from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from routes.auth import router as auth_router
import uvicorn
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("auth-service")

app = FastAPI(title="Dzinza Auth Service")

# CORS setup
origins = os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="v1/auth/login")


# Health check endpoint - remains at root level
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "auth-service",
        "timestamp": os.getenv("TIMESTAMP", "N/A"),
        "version": os.getenv("VERSION", "1.0.0")
    }

# Include the auth router with v1 prefix
app.include_router(auth_router, prefix="/v1")

# Add fallback routes to handle direct requests without going through API Gateway
# These will simply redirect to the v1 prefixed routes
@app.post("/auth/register")
async def register_redirect():
    raise HTTPException(
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        headers={"Location": "/v1/auth/register"}
    )

@app.post("/auth/login")
async def login_redirect():
    raise HTTPException(
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        headers={"Location": "/v1/auth/login"}
    )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login functionality not yet implemented"
    )


@app.post("/auth/refresh")
async def refresh_token():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Token refresh functionality not yet implemented"
    )


@app.post("/auth/logout")
async def logout():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Logout functionality not yet implemented"
    )


@app.post("/auth/request-verification")
async def request_verification():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Email verification request functionality not yet implemented"
    )


@app.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Email verification functionality not yet implemented"
    )


# Include routers
app.include_router(auth_router)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 3002))
    logger.info(f"Starting Dzinza Auth Service on port {port}")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")
    uvicorn.run(app, host="0.0.0.0", port=port)
