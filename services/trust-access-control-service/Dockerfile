FROM python:3.11-slim

WORKDIR /app

COPY services/trust-access-control-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/trust-access-control-service/main.py .
COPY shared ./shared

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
