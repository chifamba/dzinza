FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY services/help_support_service/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY services/help_support_service/ .
COPY services/shared/ ./shared/

# Set environment variables
ENV PYTHONPATH=/app:/app/shared
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
