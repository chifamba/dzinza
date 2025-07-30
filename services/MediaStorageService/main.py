from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
import asyncpg
import os
import jwt
from enum import Enum
import aiofiles

from shared.logging import setup_logging
from shared.healthcheck import get_healthcheck_router

# --- Environment & App Setup ---
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/db")
JWT_SECRET = os.getenv("JWT_SECRET", "a_very_secret_key")
ALGORITHM = "HS256"
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/media_uploads")

app = FastAPI(
    title="Media Storage Service",
    description="API for managing uploads and associations of images, documents, and multimedia.",
    version="1.0.0"
)
logger = setup_logging("MediaStorageService")
app.include_router(get_healthcheck_router("MediaStorageService"))

# --- Enums and Pydantic Models ---
class MediaType(str, Enum):
    IMAGE = "IMAGE"
    DOCUMENT = "DOCUMENT"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"

class MediaMetadata(BaseModel):
    id: UUID
    user_id: UUID
    person_id: Optional[UUID] = None
    filename: str
    url: str
    uploaded_at: datetime
    type: MediaType
    description: Optional[str] = None

# --- Database Pool & Storage Directory ---
@app.on_event("startup")
async def startup():
    app.state.db_pool = await asyncpg.create_pool(DATABASE_URL)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    logger.info(f"Upload directory '{UPLOAD_DIR}' is ready.")

@app.on_event("shutdown")
async def shutdown():
    await app.state.db_pool.close()

async def get_db_pool():
    return app.state.db_pool

# --- Auth ---
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return {"user_id": UUID(payload["sub"])}
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# --- Helper Function to Determine Media Type ---
def get_media_type(filename: str) -> MediaType:
    extension = filename.split('.')[-1].lower()
    if extension in ['jpg', 'jpeg', 'png', 'gif']:
        return MediaType.IMAGE
    if extension in ['pdf', 'doc', 'docx', 'txt']:
        return MediaType.DOCUMENT
    if extension in ['mp4', 'mov', 'avi']:
        return MediaType.VIDEO
    if extension in ['mp3', 'wav', 'ogg']:
        return MediaType.AUDIO
    # Default fallback
    return MediaType.DOCUMENT

# --- API Endpoints ---
@app.post("/media/upload", response_model=MediaMetadata, status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    person_id: Optional[UUID] = Form(None),
    description: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    media_id = uuid4()
    file_location = os.path.join(UPLOAD_DIR, f"{media_id}_{file.filename}")

    try:
        async with aiofiles.open(file_location, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not save file.")

    media_type = get_media_type(file.filename)
    # The URL should be a public-facing URL, this is a simplified example
    media_url = f"/media/static/{media_id}_{file.filename}"

    query = """
        INSERT INTO media_metadata (id, user_id, person_id, filename, url, type, description, uploaded_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    """

    new_media_record = await pool.fetchrow(
        query, media_id, user["user_id"], person_id, file.filename, media_url, media_type.value, description, datetime.utcnow()
    )

    return new_media_record

@app.get("/media/{mediaId}", response_model=MediaMetadata)
async def get_media_metadata(
    mediaId: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_db_pool)
):
    query = "SELECT * FROM media_metadata WHERE id = $1"
    media_record = await pool.fetchrow(query, mediaId)

    if not media_record:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found")

    # Basic authorization: check if the user owns the media.
    # A more complex system might check for shared access (e.g., via family tree).
    if media_record['user_id'] != user['user_id']:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    return media_record
