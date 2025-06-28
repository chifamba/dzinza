# Celery tasks package
from .celery_app import celery_app

# Import tasks here to ensure they are registered with Celery workers
# For example:
# from . import duplicate_detection_tasks

# This makes it so `from app.tasks import celery_app` works.
# And ensures tasks are seen by Celery when it auto-discovers.
__all__ = ('celery_app',)
