#!/usr/bin/env python3
"""
Simple test script to verify the genealogy service worker is functioning.
"""

import asyncio
import uuid
from app.services.celery_app import celery_app
from app.services.tasks import find_duplicate_persons_task

async def test_worker_connectivity():
    """Test if the worker is responding to simple tasks."""
    print("Testing worker connectivity...")
    
    # Test ping task from the basic celery_app.py
    try:
        # Test the simple ping task
        result = celery_app.send_task('app.services.tasks.ping', args=[])
        print(f"Ping task sent: {result.task_id}")
        
        # Wait for result with timeout
        try:
            response = result.get(timeout=10)
            print(f"Ping response: {response}")
        except Exception as e:
            print(f"Ping task failed: {e}")
    except Exception as e:
        print(f"Failed to send ping task: {e}")
    
    # Test the duplicate persons task with a dummy UUID
    try:
        test_person_id = str(uuid.uuid4())
        result = find_duplicate_persons_task.delay(test_person_id)
        print(f"Duplicate persons task sent: {result.task_id}")
        
        # Wait for result with timeout
        try:
            response = result.get(timeout=30)
            print(f"Duplicate persons response: {response}")
        except Exception as e:
            print(f"Duplicate persons task failed: {e}")
    except Exception as e:
        print(f"Failed to send duplicate persons task: {e}")

if __name__ == "__main__":
    asyncio.run(test_worker_connectivity())
