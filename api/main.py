"""Dzinza v2 — private genealogy research tool.

Single FastAPI app (modular monolith). Serves the React frontend build as
static files in production; in dev the Vite dev server is used instead.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import ensure_admin_password, router as auth_router
from .db import close_driver, get_driver
from .routers import events, facts, gedcom, media, persons, relationships, sources, trees

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("dzinza")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect Neo4j, ensure admin password exists.
    get_driver()
    ensure_admin_password()
    log.info("Dzinza v2 API started")
    yield
    close_driver()


app = FastAPI(title="Dzinza", version="2.0.0", lifespan=lifespan)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("CORS_ALLOWED_ORIGINS")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env else [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trees.router)
app.include_router(persons.router)
app.include_router(relationships.router)
app.include_router(sources.router)
app.include_router(events.router)
app.include_router(facts.router)
app.include_router(gedcom.router)
app.include_router(media.router)


@app.get("/api/health")
def health():
    try:
        with get_driver().session() as session:
            session.run("RETURN 1 AS ok").single()
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}


# --- Frontend static serving (production) -----------------------------------
# `frontend/dist` is copied into the image at build time. In dev, run
# `vite dev` separately and point it at the API.
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Don't swallow API routes.
        if full_path.startswith("api/"):
            return {"detail": "Not found"}
        index = FRONTEND_DIST / "index.html"
        return FileResponse(index)
