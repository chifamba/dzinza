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

# Expose port (FastAPI default is 8000, adjust if necessary via uvicorn command)
EXPOSE 8000

# Run the application using Uvicorn
# The command can be customized based on settings (e.g., port, workers)
# For development, --reload can be useful, but not for production images.
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# It's often better to use a shell script (e.g., entrypoint.sh) for more complex startup logic,
# like running database migrations before starting the app, or setting Uvicorn workers based on CPU.
# For now, a simple CMD:
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
