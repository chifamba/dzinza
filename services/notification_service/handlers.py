"""Handlers for Notification Service."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
import time
from collections import deque
from pydantic import BaseModel, EmailStr
import smtplib
import os

router = APIRouter()

SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

class EmailNotification(BaseModel):
    to: EmailStr
    subject: str
    body: str

_email_open_rates = {}
_email_click_rates = {}
_failed_notifications = []

def _send_email(notification: EmailNotification):
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            message = f"Subject: {notification.subject}\n\n{notification.body}"
            server.sendmail(SMTP_USER or "noreply@example.com", notification.to, message)
        return True
    except Exception:
        return False

_rate_limits = {}
RATE_LIMIT = 10  # max 10 notifications per user per minute

def check_rate_limit(user_id: str):
    now = int(time.time())
    window = now // 60
    key = f"{user_id}:{window}"
    _rate_limits.setdefault(key, 0)
    if _rate_limits[key] >= RATE_LIMIT:
        return False
    _rate_limits[key] += 1
    return True

_templates = {
    "welcome": "Welcome, {name}!",
    "reset": "Reset your password using this code: {code}"
}

_priority_queue = deque()

@router.post("/notify/email/")
def send_email_notification(notification: EmailNotification, background_tasks: BackgroundTasks, user_id: str = "anon", priority: int = 0, template: str = None, template_vars: dict = None):
    if not check_rate_limit(user_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    if template:
        body = _templates.get(template, "").format(**(template_vars or {}))
        notification.body = body
    if priority > 0:
        _priority_queue.appendleft((priority, notification))
        return {"status": "queued", "priority": priority}
    if not _send_email(notification):
        _failed_notifications.append(notification.dict())
        raise HTTPException(status_code=500, detail="Failed to send email, will retry")
    return {"status": "sent"}

@router.post("/notify/process_priority/")
def process_priority_queue():
    processed = []
    while _priority_queue:
        _, notification = _priority_queue.popleft()
        if _send_email(notification):
            processed.append(notification.to)
    return {"processed": processed}

@router.post("/notify/email/schedule/")
def schedule_marketing_email(notification: EmailNotification, delay_seconds: int, background_tasks: BackgroundTasks):
    import time
    def delayed_send():
        time.sleep(delay_seconds)
        _send_email(notification)
    background_tasks.add_task(delayed_send)
    return {"status": "scheduled", "delay_seconds": delay_seconds}

@router.post("/notify/email/open/")
def track_email_open(email: str):
    _email_open_rates[email] = _email_open_rates.get(email, 0) + 1
    return {"email": email, "opens": _email_open_rates[email]}

@router.post("/notify/email/click/")
def track_email_click(email: str):
    _email_click_rates[email] = _email_click_rates.get(email, 0) + 1
    return {"email": email, "clicks": _email_click_rates[email]}

@router.get("/notify/email/analytics/")
def get_email_analytics():
    return {
        "open_rates": _email_open_rates,
        "click_rates": _email_click_rates
    }

@router.post("/notify/retry_failed/")
def retry_failed_notifications(background_tasks: BackgroundTasks):
    retried = []
    for notif in list(_failed_notifications):
        n = EmailNotification(**notif)
        if _send_email(n):
            retried.append(n.to)
            _failed_notifications.remove(notif)
    return {"retried": retried, "remaining_failed": len(_failed_notifications)}

# --- A/B Testing ---
_ab_tests = {}
_ab_results = {}

@router.post("/notify/abtest/")
def create_ab_test(test_id: str, variants: dict):
    _ab_tests[test_id] = variants
    _ab_results[test_id] = {k: 0 for k in variants}
    return {"test_id": test_id, "variants": list(variants.keys())}

@router.post("/notify/abtest/record/")
def record_ab_result(test_id: str, variant: str):
    if test_id in _ab_results and variant in _ab_results[test_id]:
        _ab_results[test_id][variant] += 1
        return {"test_id": test_id, "variant": variant, "count": _ab_results[test_id][variant]}
    raise HTTPException(status_code=404, detail="Test or variant not found")

@router.get("/notify/abtest/{test_id}")
def get_ab_results(test_id: str):
    return _ab_results.get(test_id, {})

# --- Segmented Campaigns ---
_segments = {}

@router.post("/notify/segment/")
def create_segment(segment_id: str, user_ids: list[str]):
    _segments[segment_id] = set(user_ids)
    return {"segment_id": segment_id, "users": user_ids}

@router.get("/notify/segment/{segment_id}")
def get_segment(segment_id: str):
    return {"segment_id": segment_id, "users": list(_segments.get(segment_id, []))}

# --- Opt-In Management ---
_opt_in = {}

@router.post("/notify/optin/")
def set_opt_in(user_id: str, enabled: bool):
    _opt_in[user_id] = enabled
    return {"user_id": user_id, "opt_in": enabled}

@router.get("/notify/optin/{user_id}")
def get_opt_in(user_id: str):
    return {"user_id": user_id, "opt_in": _opt_in.get(user_id, True)}

# --- Delivery Status Tracking ---
_delivery_status = {}

@router.post("/notify/delivery_status/")
def set_delivery_status(notification_id: str, status: str):
    _delivery_status[notification_id] = status
    return {"notification_id": notification_id, "status": status}

@router.get("/notify/delivery_status/{notification_id}")
def get_delivery_status(notification_id: str):
    return {"notification_id": notification_id, "status": _delivery_status.get(notification_id, "unknown")}

class PushNotification(BaseModel):
    to: str
    title: str
    body: str

@router.post("/notify/push/")
def send_push_notification(notification: PushNotification):
    # Placeholder for push notification logic
    return {"status": "push sent (stub)", "to": notification.to}

class InAppNotification(BaseModel):
    user_id: str
    message: str

_in_app_notifications = {}

@router.post("/notify/inapp/")
def send_inapp_notification(notification: InAppNotification):
    _in_app_notifications.setdefault(notification.user_id, []).append(notification.message)
    return {"status": "in-app sent", "user_id": notification.user_id}

@router.get("/notify/inapp/{user_id}")
def get_inapp_notifications(user_id: str):
    return {"user_id": user_id, "notifications": _in_app_notifications.get(user_id, [])}

class SMSNotification(BaseModel):
    to: str
    message: str

@router.post("/notify/sms/")
def send_sms_notification(notification: SMSNotification):
    # Placeholder for SMS notification logic
    return {"status": "sms sent (stub)", "to": notification.to}

class WebhookNotification(BaseModel):
    url: str
    payload: dict

@router.post("/notify/webhook/")
def send_webhook_notification(notification: WebhookNotification):
    # Placeholder for webhook notification logic
    return {"status": "webhook sent (stub)", "url": notification.url}

# In-memory user notification preferences (for demo)
_user_prefs = {}

class NotificationPrefs(BaseModel):
    email: bool = True
    push: bool = False
    sms: bool = False
    categories: dict = {}
    quiet_hours: tuple = (22, 7)  # (start_hour, end_hour)

@router.get("/notify/preferences/{user_id}")
def get_preferences(user_id: str):
    return _user_prefs.get(user_id, NotificationPrefs().dict())

@router.post("/notify/preferences/{user_id}")
def set_preferences(user_id: str, prefs: NotificationPrefs):
    _user_prefs[user_id] = prefs.dict()
    return {"user_id": user_id, "preferences": prefs.dict()}

@router.post("/notify/preferences/{user_id}/category/")
def set_category_pref(user_id: str, category: str, enabled: bool):
    prefs = _user_prefs.setdefault(user_id, NotificationPrefs().dict())
    prefs.setdefault("categories", {})[category] = enabled
    return {"user_id": user_id, "category": category, "enabled": enabled}

@router.post("/notify/preferences/{user_id}/quiet_hours/")
def set_quiet_hours(user_id: str, start: int, end: int):
    prefs = _user_prefs.setdefault(user_id, NotificationPrefs().dict())
    prefs["quiet_hours"] = (start, end)
    return {"user_id": user_id, "quiet_hours": (start, end)}

_grouped_notifications = {}

@router.post("/notify/group/")
def group_notifications(user_id: str, messages: list[str]):
    _grouped_notifications.setdefault(user_id, []).extend(messages)
    return {"user_id": user_id, "grouped": _grouped_notifications[user_id]}

@router.get("/notify/group/{user_id}")
def get_grouped_notifications(user_id: str):
    return {"user_id": user_id, "grouped": _grouped_notifications.get(user_id, [])}
