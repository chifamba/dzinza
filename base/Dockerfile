# Base Dockerfile for Python services

# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create a non-root user and group
RUN addgroup --system app && adduser --system --group app

# Create working directory
WORKDIR /home/app/web
RUN chown app:app /home/app/web

# Switch to non-root user
USER app

# Install common dependencies if any (example, can be expanded)
# RUN pip install --upgrade pip
# RUN pip install common-package1 common-package2

# Default command (can be overridden by services)
# CMD ["python", "main.py"]

# Expose a common port (can be overridden by services)
# EXPOSE 8000
