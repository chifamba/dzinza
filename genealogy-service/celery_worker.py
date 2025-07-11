#!/usr/bin/env python3
"""
Celery worker entry point for the genealogy service.
This file ensures proper eventlet monkey patching before importing other modules.
"""

# Important: eventlet monkey patch must be the first import
import eventlet
eventlet.monkey_patch()

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Now import the celery app
from app.services.celery_app import celery_app

if __name__ == "__main__":
    # This allows running the worker with: python worker.py
    celery_app.start()
