# Stage 1: Build stage (if needed for compilation or asset building, not strictly necessary for pure Python)
# For now, we'll use a single stage for simplicity.

# Official Python runtime as a parent image
FROM python:3.11.3-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# ENV APP_HOME /app # Not strictly needed if using WORKDIR correctly

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (if any)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Create a non-root user and group
RUN groupadd -r appuser && useradd --no-log-init -r -g appuser appuser

# Install Poetry or PDM if using them, otherwise copy requirements.txt
# For requirements.txt:
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appuser /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on (FastAPI default is 8000 if not specified by Uvicorn)
# The original auth-service was on 3002. We can configure Uvicorn to use this.
EXPOSE 3002

# Command to run the application using Uvicorn
# The host 0.0.0.0 makes it accessible from outside the container.
# The port should match the EXPOSE instruction and what docker-compose expects.
# --reload is for development, remove for production.
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3002", "--reload"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3002"]

# Healthcheck (optional, but good practice)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
#   CMD curl -f http://localhost:3002/health || exit 1
# Note: curl might not be available in python-slim. Use wget or a Python script for healthcheck if needed.
# Example using Python's http.client for healthcheck (add to CMD or separate script):
# CMD python -m http.client localhost 3002 /health || exit 1
# For now, keeping CMD simple. Healthcheck can be added later or handled by orchestrator.
