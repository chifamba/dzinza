# Stage 1: Build stage (if using compiled extensions or multi-stage builds)
# For now, a single stage is sufficient for this Python service.

FROM python:3.11.3-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# ENV APP_HOME /app # Not strictly needed if using WORKDIR correctly

WORKDIR /app

# Install system dependencies if any (e.g., for certain Python packages)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port (original genealogy-service was on 3004)
EXPOSE 3004

# Command to run the application
# Uvicorn for FastAPI. --host 0.0.0.0 to be accessible externally.
# Port 3004 to match original service.
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3004", "--reload"] # For development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3004"]

# Healthcheck (optional, but good practice)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:3004/health || exit 1
# (Requires curl in image, or use Python http.client)
