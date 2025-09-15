"""Handlers for Audit History Service."""

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from .models import AuditLog
from pydantic import BaseModel
import datetime

router = APIRouter()

# Assume get_db() yields a SQLAlchemy session

class AuditLogIn(BaseModel):
    user_id: str
    action: str
    target_type: str
    target_id: str
    details: dict = None

@router.post("/audit/log/")
def log_action(log: AuditLogIn, db: Session):
    entry = AuditLog(
        user_id=log.user_id,
        action=log.action,
        target_type=log.target_type,
        target_id=log.target_id,
        details=log.details,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}

@router.get("/audit/history/{user_id}")
def get_audit_history(user_id: str, db: Session, skip: int = 0, limit: int = 100):
    logs = db.query(AuditLog).filter(AuditLog.user_id == user_id).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return [dict(
        id=l.id,
        action=l.action,
        target_type=l.target_type,
        target_id=l.target_id,
        timestamp=l.timestamp.isoformat(),
        details=l.details
    ) for l in logs]

@router.post("/audit/log_login/")
def log_login(user_id: str, db: Session):
    entry = AuditLog(
        user_id=user_id,
        action="login",
        target_type="auth",
        target_id=user_id,
        details={},
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}

@router.post("/audit/log_logout/")
def log_logout(user_id: str, db: Session):
    entry = AuditLog(
        user_id=user_id,
        action="logout",
        target_type="auth",
        target_id=user_id,
        details={},
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}

@router.post("/audit/log_permission_change/")
def log_permission_change(user_id: str, changed_by: str, permission: str, db: Session):
    entry = AuditLog(
        user_id=user_id,
        action="permission_change",
        target_type="role",
        target_id=user_id,
        details={"changed_by": changed_by, "permission": permission},
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}

@router.post("/audit/log_payment/")
def log_payment(user_id: str, payment_id: str, amount: float, db: Session):
    entry = AuditLog(
        user_id=user_id,
        action="payment",
        target_type="payment",
        target_id=payment_id,
        details={"amount": amount},
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id}

@router.get("/audit/search/")
def search_audit_history(
    db: Session,
    user_id: str = None,
    action: str = None,
    target_type: str = None,
    start: str = None,
    end: str = None,
    skip: int = 0,
    limit: int = 100
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if start:
        q = q.filter(AuditLog.timestamp >= datetime.datetime.fromisoformat(start))
    if end:
        q = q.filter(AuditLog.timestamp <= datetime.datetime.fromisoformat(end))
    logs = q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return [dict(
        id=l.id,
        user_id=l.user_id,
        action=l.action,
        target_type=l.target_type,
        target_id=l.target_id,
        timestamp=l.timestamp.isoformat(),
        details=l.details
    ) for l in logs]

import csv
from fastapi.responses import StreamingResponse, JSONResponse
from io import StringIO

# --- Suspicious Activity Detection ---
_failed_logins = {}

@router.post("/audit/failed_login/")
def record_failed_login(user_id: str, timestamp: str):
    _failed_logins.setdefault(user_id, []).append(timestamp)
    return {"user_id": user_id, "failed_logins": len(_failed_logins[user_id])}

@router.get("/audit/suspicious/")
def get_suspicious_activity(threshold: int = 5):
    suspects = [u for u, attempts in _failed_logins.items() if len(attempts) >= threshold]
    return {"suspects": suspects}

# --- Alerting ---
_alerts = []

@router.post("/audit/alert/")
def create_alert(user_id: str, reason: str):
    _alerts.append({"user_id": user_id, "reason": reason})
    return {"status": "alert created", "alerts": len(_alerts)}

@router.get("/audit/alerts/")
def get_alerts():
    return {"alerts": _alerts}

# --- Anomaly Detection Stub ---
@router.get("/audit/anomaly/")
def anomaly_detection():
    # Placeholder for ML-based anomaly detection
    return {"status": "anomaly detection not implemented"}

# --- Secure Audit Logs (Stub) ---
@router.get("/audit/secure/")
def secure_audit_logs():
    # Placeholder for encryption/secure storage
    return {"status": "audit logs are encrypted (stub)"}

# --- Log Integrity Verification (Stub) ---
@router.get("/audit/integrity/")
def verify_log_integrity():
    # Placeholder for cryptographic hash chain
    return {"status": "log integrity verified (stub)"}

# --- Data Retention Policy (Stub) ---
@router.post("/audit/retention/")
def set_retention_policy(days: int):
    # Placeholder for retention logic
    return {"status": f"retention set to {days} days (stub)"}

# --- Compliance Reporting (Stub) ---
@router.get("/audit/compliance/")
def compliance_report():
    # Placeholder for GDPR/compliance export
    return {"status": "compliance report generated (stub)"}

@router.get("/audit/export/")
def export_audit_logs(
    db: Session,
    format: str = "json",
    user_id: str = None,
    action: str = None,
    target_type: str = None,
    start: str = None,
    end: str = None
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if start:
        q = q.filter(AuditLog.timestamp >= datetime.datetime.fromisoformat(start))
    if end:
        q = q.filter(AuditLog.timestamp <= datetime.datetime.fromisoformat(end))
    logs = q.order_by(AuditLog.timestamp.desc()).all()
    data = [dict(
        id=l.id,
        user_id=l.user_id,
        action=l.action,
        target_type=l.target_type,
        target_id=l.target_id,
        timestamp=l.timestamp.isoformat(),
        details=l.details
    ) for l in logs]
    if format == "csv":
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys() if data else [])
        writer.writeheader()
        writer.writerows(data)
        output.seek(0)
        return StreamingResponse(output, media_type="text/csv")
    return JSONResponse(content=data)
