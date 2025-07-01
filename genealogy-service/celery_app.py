from celery import Celery
import os

# Read Redis password from file if available
def get_redis_password():
    password_file = os.environ.get("REDIS_PASSWORD_FILE", "/run/secrets/redis_password")
    try:
        with open(password_file, "r") as f:
            return f.read().strip()
    except Exception:
        return "redis_secure_password_789"

redis_password = get_redis_password()

broker_url = f"redis://:{redis_password}@dzinza-redis:6379/0"
backend_url = f"redis://:{redis_password}@dzinza-redis:6379/1"

celery_app = Celery(
    "genealogy",
    broker=broker_url,
    backend=backend_url
)

# Example task (remove or replace with real tasks)
@celery_app.task
def ping():
    return "pong"
