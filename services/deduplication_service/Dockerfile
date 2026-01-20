# Dockerfile for deduplication_service
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY services/deduplication_service /app
COPY services/shared /app/shared

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

ENV PYTHONPATH=/app:/app/shared

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
