import asyncio
import time
from unittest.mock import MagicMock
from fastapi import UploadFile

import sys
sys.path.append("/app")

import services.media_storage_service.handlers as handlers

async def main():
    handlers.minio_client = MagicMock()

    def slow_put(*args, **kwargs):
        time.sleep(0.05) # Simulate slow sync upload

    handlers.minio_client.put_object.side_effect = slow_put

    class MockFile:
        def __init__(self, name):
            self.filename = name
            self.content_type = "text/plain"

        async def read(self):
            await asyncio.sleep(0.05) # Simulate async read
            return b"content"

    files = [MockFile(f"file_{i}.txt") for i in range(10)]

    start = time.time()
    await handlers.bulk_upload(files, folder="test")
    end = time.time()
    print(f"Time taken: {end - start:.4f} seconds")

asyncio.run(main())
