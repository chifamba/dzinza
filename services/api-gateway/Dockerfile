# Base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy app
COPY . .

# Expose port and run app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
