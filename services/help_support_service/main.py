"""
Help Support Service
Provides ticketing system, live chat, knowledge base, and community forums.
"""

from config import CORS_ALLOWED_ORIGINS
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from handlers import router

app = FastAPI(
    title="Help Support Service",
    description="Customer support and help functionality",
    version="1.0.0"
)

# Parse allowed origins from environment. Default is empty (fails secure).
allowed_origins = [
    origin.strip()
    for origin in CORS_ALLOWED_ORIGINS.split(",")
    if origin.strip()
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "help_support_service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
