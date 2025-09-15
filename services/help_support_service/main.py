"""
Help Support Service
Provides ticketing system, live chat, knowledge base, and community forums.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from handlers import router

app = FastAPI(
    title="Help Support Service",
    description="Customer support and help functionality",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
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
