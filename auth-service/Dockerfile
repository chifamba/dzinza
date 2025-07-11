# auth-service/Dockerfile
FROM python:3.11-slim AS base

# Set environment variables from base
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create a non-root user and group (copied from base/Dockerfile logic)
RUN addgroup --system app && adduser --system --group app

# Install curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/app/web

# Create a virtual environment
RUN python -m venv /home/app/venv
ENV PATH=/home/app/venv/bin:/home/jules/.nvm/versions/node/v22.16.0/bin:/home/jules/.pyenv/shims:/home/jules/.pyenv/bin:/home/jules/.local/bin:/go/bin:/usr/local/go/bin:/usr/share/gradle/bin:/usr/share/maven/bin:/home/jules/.local/bin:/home/jules/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /home/app/web/app

# Chown the directories to the app user
RUN chown -R app:app /home/app/web /home/app/venv

# Switch to non-root user
USER app

# Expose port and command (can be overridden in docker-compose)
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

