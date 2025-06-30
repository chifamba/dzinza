# Use the shared base image defined in ../base/Dockerfile
FROM python-base as builder

# Set working directory
WORKDIR /home/app/web

# Install dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /home/app/web/app

# Final stage
FROM python-base

WORKDIR /home/app/web

# Copy installed dependencies from builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /home/app/web/requirements.txt .

# Copy application code
COPY ./app /home/app/web/app

# Expose port (FastAPI default is 8000, matches docker-compose mapping for this service)
EXPOSE 8000

# Run the application using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
