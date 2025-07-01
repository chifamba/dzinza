# Use an official Python image as a builder
FROM python:3.11-slim AS builder

WORKDIR /home/app/web

# Install build dependencies (optional, e.g. gcc, for some pip packages)
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY ./requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Final image
FROM python:3.11-slim

WORKDIR /home/app/web

# Copy installed dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY ./app ./app
COPY ./requirements.txt .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
