from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend-service")

app = FastAPI(title="Dzinza Backend Service")

# CORS setup
origins = os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "backend-service",
        "timestamp": os.getenv("TIMESTAMP", "N/A"),
        "version": os.getenv("VERSION", "1.0.0")
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 3001))
    logger.info(f"Starting Dzinza Backend Service on port {port}")
    logger.info(f"Environment: {os.getenv('NODE_ENV', 'development')}")
    uvicorn.run(app, host="0.0.0.0", port=port)
