# Use an official Python image as a builder
FROM python:3.11-slim AS builder

WORKDIR /home/app/web

# Install build dependencies (optional, e.g. gcc, for some pip packages)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally (no --user)
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Final image
FROM python:3.11-slim

WORKDIR /home/app/web

# Create a non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy installed dependencies from builder (system site-packages)
COPY --from=builder /usr/local /usr/local

# Copy application code
COPY ./app ./app
COPY ./requirements.txt .

# Change ownership of the app directory
RUN chown -R appuser:appuser /home/app/web

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
