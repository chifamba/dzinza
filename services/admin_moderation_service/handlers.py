"""Request handlers for admin_moderation_service service."""

from fastapi import APIRouter, status, Depends, HTTPException, Path, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi import Body
from .schemas import ReportContent, ModerationLog
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()
class CustomHTTPBearer(HTTPBearer):
    async def __call__(self, request):
        try:
            credentials = await super().__call__(request)
        except HTTPException as exc:
            if exc.status_code == 403:
                raise HTTPException(status_code=401, detail="Unauthorized")
            raise
        if credentials is None:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return credentials

bearer_scheme = CustomHTTPBearer()

reported_content = []

@router.post("/report_content")
def report_content(report: dict):
    """
    Endpoint for users to report content.
    """
    reported_content.append(report)
    return {"message": "Content reported", "report": report}

reports_db: List[ReportContent] = []

@router.post("/reports", status_code=status.HTTP_201_CREATED)
def report_content(payload: ReportContent):
    reports_db.append(payload)
    return {"message": "Report submitted successfully."}

@router.get("/reports")
def list_reports(
    status: Optional[str] = Query(None, enum=["OPEN", "RESOLVED", "REJECTED"]),
    reporter_id: Optional[UUID] = Query(None),
    reported_user_id: Optional[UUID] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    # Dummy auth check
    if not credentials or not credentials.scheme.lower() == "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Filter reports
    filtered = [
        r for r in reports_db
        if (not status or getattr(r, "status", None) == status)
        and (not reporter_id or getattr(r, "reporter_id", None) == str(reporter_id))
        and (not reported_user_id or getattr(r, "reported_user_id", None) == str(reported_user_id))
    ]
    total_records = len(filtered)
    total_pages = (total_records + limit - 1) // limit
    start = (page - 1) * limit
    end = start + limit
    data = filtered[start:end]
    return {
        "data": data,
        "page": page,
        "limit": limit,
        "total_records": total_records,
        "total_pages": total_pages
    }

@router.post("/reports/{report_id}/approve")
def approve_report(report_id: int):
    if 0 <= report_id < len(reports_db):
        # Placeholder: mark as approved (add status field in real impl)
        return {"message": "Report approved."}
    return {"error": "Report not found."}

@router.post("/reports/{report_id}/reject")
def reject_report(report_id: int):
    if 0 <= report_id < len(reports_db):
        # Placeholder: mark as rejected (add status field in real impl)
        return {"message": "Report rejected."}
    return {"error": "Report not found."}

@router.delete("/reports/{report_id}")
def delete_report(report_id: int):
    if 0 <= report_id < len(reports_db):
        reports_db.pop(report_id)
        return {"message": "Report deleted."}
    return {"error": "Report not found."}

@router.post("/reports/bulk_action")
def bulk_moderation(action: str, report_ids: List[int]):
    results = []
    for rid in report_ids:
        if 0 <= rid < len(reports_db):
            if action == "approve":
                results.append({"id": rid, "result": "approved"})
            elif action == "reject":
                results.append({"id": rid, "result": "rejected"})
            elif action == "delete":
                reports_db[rid] = None
                results.append({"id": rid, "result": "deleted"})
            else:
                results.append({"id": rid, "result": "invalid action"})
        else:
            results.append({"id": rid, "result": "not found"})
    # Remove deleted reports
    global reports_db
    reports_db = [r for r in reports_db if r is not None]
    return results

@router.post("/reports/auto_moderate")
def auto_moderate():
    # Placeholder: In real implementation, scan reports for keywords/patterns
    return {"message": "Auto-moderation run (placeholder)."}

appeals_db: List[dict] = []

banned_users: List[str] = []
suspended_users: List[dict] = []
warned_users: List[dict] = []
blocked_ips: List[str] = []

moderation_logs: List[ModerationLog] = []

@router.post("/log_action")
def log_action(log: ModerationLog):
    moderation_logs.append(log)
    return {"message": "Moderation action logged."}

@router.get("/moderation_logs")
def get_moderation_logs():
    return moderation_logs

@router.get("/moderator_performance")
def moderator_performance():
    stats = {}
    for log in moderation_logs:
        mid = str(log.moderator_id)
        stats.setdefault(mid, {"actions": 0, "last_action": None})
        stats[mid]["actions"] += 1
        if not stats[mid]["last_action"] or log.timestamp > stats[mid]["last_action"]:
            stats[mid]["last_action"] = log.timestamp
    return stats

@router.get("/moderation_dashboard")
def moderation_dashboard():
    return {
        "total_logs": len(moderation_logs),
        "total_reports": len(reports_db),
        "total_banned": len(banned_users),
        "total_suspended": len(suspended_users),
        "total_appeals": len(appeals_db)
    }

@router.post("/escalate_case")
def escalate_case(report_id: int, reason: str):
    # Placeholder: In real implementation, escalate to senior moderator
    return {"message": f"Report {report_id} escalated for reason: {reason}"}

@router.post("/users/{userId}/ban", status_code=201)
def ban_user(
    userId: UUID = Path(..., description="User ID to ban"),
    body: dict = Body(...),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    # Dummy auth check
    if not credentials or not credentials.scheme.lower() == "bearer":
        raise HTTPException(status_code=401, detail="Unauthorized")
    reason = body.get("reason") if body else None
    if not reason:
        raise HTTPException(status_code=400, detail="Reason required")
    # Simulate ban action
    ban_action = {
        "user_id": str(userId),
        "banned_by": "00000000-0000-0000-0000-000000000000",
        "reason": reason,
        "banned_at": datetime.utcnow().isoformat()
    }
    banned_users.append(str(userId))
    return ban_action

@router.post("/suspend_user")
def suspend_user(user_id: str, duration_hours: int):
    suspended_users.append({"user_id": user_id, "until": datetime.utcnow().timestamp() + duration_hours * 3600})
    return {"message": f"User {user_id} suspended for {duration_hours} hours."}

@router.post("/warn_user")
def warn_user(user_id: str, reason: str):
    warned_users.append({"user_id": user_id, "reason": reason})
    return {"message": f"User {user_id} warned."}

@router.post("/block_ip")
def block_ip(ip_address: str):
    blocked_ips.append(ip_address)
    return {"message": f"IP {ip_address} blocked."}

@router.post("/unban_user")
def unban_user(user_id: str):
    if user_id in banned_users:
        banned_users.remove(user_id)
        return {"message": f"User {user_id} unbanned."}
    return {"error": "User not found in banned list."}

@router.post("/reports/{report_id}/appeal")
def appeal_report(report_id: int, reason: str):
    if 0 <= report_id < len(reports_db):
        appeals_db.append({"report_id": report_id, "reason": reason, "status": "pending"})
        return {"message": "Appeal submitted."}
    return {"error": "Report not found."}

@router.get("/appeals")
def list_appeals():
    return appeals_db

@router.post("/appeals/{appeal_id}/resolve")
def resolve_appeal(appeal_id: int, resolution: str):
    if 0 <= appeal_id < len(appeals_db):
        appeals_db[appeal_id]["status"] = resolution
        return {"message": "Appeal resolved."}
    return {"error": "Appeal not found."}
