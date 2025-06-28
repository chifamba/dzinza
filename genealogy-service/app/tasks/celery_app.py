from celery import Celery
from app.core.config import settings # To get broker and backend URLs
import os

# It's good practice to set the default Django settings module for the 'celery' program.
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project.settings') # If using Django
# For FastAPI, this is not directly applicable unless you structure settings similarly.

# Ensure that the app name here matches how you refer to it elsewhere,
# especially if you have multiple Celery apps or use include.
# The first argument to Celery is the name of the current module. This is important for auto-discovery of tasks.
# The second argument is the broker URL.
# The third argument is the backend URL (for storing results).

celery_app = Celery(
    "genealogy_tasks", # A name for this Celery application
    broker=str(settings.CELERY_BROKER_URL),
    backend=str(settings.CELERY_RESULT_BACKEND),
    include=[ # List of modules to import when the worker starts.
        'app.tasks.duplicate_detection_tasks',
        # Add other task modules here if you create more
    ]
)

# Celery Configuration Options
# See Celery documentation for all available options:
# https://docs.celeryq.dev/en/stable/userguide/configuration.html
celery_app.conf.update(
    task_serializer='json', # Default, but good to be explicit
    result_serializer='json', # Default
    accept_content=['json'],  # Default
    timezone='UTC', # Recommended to use UTC
    enable_utc=True, # Recommended
    # result_expires=3600, # Time in seconds for results to be kept (1 hour)
    # task_track_started=True, # If you want 'STARTED' state for tasks
    # worker_prefetch_multiplier=1, # Can help with long-running tasks, default is 4
    # task_acks_late=True, # If tasks are idempotent and can be re-run on worker failure
    # worker_send_task_events=True, # For monitoring tools like Flower
)


# Optional: If you want to load configuration from a separate file or from app settings
# celery_app.config_from_object('your_project.celeryconfig') # If you have a celeryconfig.py
# Or directly:
# celery_app.conf.broker_url = str(settings.CELERY_BROKER_URL)
# celery_app.conf.result_backend = str(settings.CELERY_RESULT_BACKEND)


# Optional: Autodiscover tasks from installed apps (more common in Django)
# For FastAPI, explicitly listing modules in `include` is usually clearer.
# app.autodiscover_tasks()
# def autodiscover_tasks():
#     # Autodiscover tasks from a list of modules (e.g., all files in this 'tasks' directory)
#     # This is a simplified version. Celery's built-in autodiscover is more robust.
#     tasks_dir = os.path.dirname(__file__)
#     for module_file in os.listdir(tasks_dir):
#         if module_file.endswith('_tasks.py'):
#             module_name = module_file[:-3]
#             __import__(f"app.tasks.{module_name}",_locals=locals(), globals=globals())

# if __name__ == '__main__':
    # This is for running celery worker directly using `python -m app.tasks.celery_app worker -l info`
    # Or more commonly: `celery -A app.tasks.celery_app worker -l info`
    # Ensure your PYTHONPATH is set up correctly for the celery command to find `app.tasks.celery_app`.
    # Typically, run celery from the project root: `celery -A genealogy-service-py.app.tasks.celery_app worker -l INFO`
    # (adjust path based on actual project structure relative to where command is run)
    # celery_app.start()


# Example of a simple task defined directly here (though usually in separate files)
# @celery_app.task
# def add(x, y):
#     return x + y

# To run a Celery worker:
# celery -A app.tasks.celery_app worker -l info -Q genealogy_queue (if using specific queues)
# To run Celery Beat (for scheduled tasks):
# celery -A app.tasks.celery_app beat -l info
