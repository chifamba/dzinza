# Dzinza v2 API image. The React frontend is built separately and copied
# into ./frontend-dist so the API can serve it as static files.
FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/

# Frontend production build (populated by the build script; absent in dev).
COPY frontend-dist/ ./frontend/dist/

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
