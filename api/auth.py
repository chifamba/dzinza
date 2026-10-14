"""Single-user auth for the private Dzinza tool.

Deliberately simple: one admin password (from ADMIN_PASSWORD env var, bcrypt-hashed
and stored in Neo4j on first run), session cookie after login. No OAuth, no MFA,
no Redis — this is a private single-user tool, not a SaaS.
"""

import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from .db import get_driver

log = logging.getLogger("dzinza.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE = "dzinza_session"
SESSION_DAYS = 30

# In-memory session store. Single user, single process — this is fine.
# (If the API ever runs multi-process, move this to Neo4j.)
_sessions: dict[str, datetime] = {}


class LoginRequest(BaseModel):
    password: str


def _get_password_hash() -> str | None:
    with get_driver().session() as session:
        record = session.run(
            "MATCH (c:AppConfig {key: 'admin_password_hash'}) RETURN c.value AS h"
        ).single()
        return record["h"] if record else None


def _set_password_hash(password_hash: str) -> None:
    with get_driver().session() as session:
        session.run(
            "MERGE (c:AppConfig {key: 'admin_password_hash'}) SET c.value = $h",
            h=password_hash,
        )


def ensure_admin_password() -> None:
    """On first run, hash ADMIN_PASSWORD from env and store it. Refuses to run
    with the default dev password unless DZINZA_DEV is set — a small guard
    against accidentally deploying wide open."""
    if _get_password_hash():
        return
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not password or password == "change-me":
        if os.environ.get("DZINZA_DEV") == "1":
            password = "dzinza-dev"
            log.warning("Using default dev password (DZINZA_DEV=1). Do not expose.")
        else:
            raise RuntimeError(
                "First run requires ADMIN_PASSWORD env var to be set "
                "(or DZINZA_DEV=1 for local development)."
            )
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    _set_password_hash(hashed)
    log.info("Admin password initialized.")


def _check_password(password: str) -> bool:
    stored = _get_password_hash()
    if not stored:
        return False
    return bcrypt.checkpw(password.encode(), stored.encode())


def _new_session() -> str:
    token = secrets.token_urlsafe(32)
    _sessions[token] = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    return token


def _valid_session(token: str | None) -> bool:
    if not token:
        return False
    expiry = _sessions.get(token)
    if not expiry:
        return False
    if expiry < datetime.now(timezone.utc):
        del _sessions[token]
        return False
    return True


async def require_auth(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if not _valid_session(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )


@router.post("/login")
def login(body: LoginRequest, response: Response):
    if not _check_password(body.password):
        # Constant-time-ish failure; don't reveal whether a password is set.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password"
        )
    token = _new_session()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="lax",
    )
    return {"ok": True}


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        _sessions.pop(token, None)
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(_: None = Depends(require_auth)):
    return {"authenticated": True}
