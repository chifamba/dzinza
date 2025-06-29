# storage-service/Dockerfile
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN addgroup --system app && adduser --system --group app

WORKDIR /home/app/web

RUN python -m venv /home/app/venv
ENV PATH=/home/app/venv/bin:/home/jules/.nvm/versions/node/v22.16.0/bin:/home/jules/.pyenv/shims:/home/jules/.pyenv/bin:/home/jules/.local/bin:/go/bin:/usr/local/go/bin:/usr/share/gradle/bin:/usr/share/maven/bin:/home/jules/.local/bin:/home/jules/.cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /home/app/web/app

RUN chown -R app:app /home/app/web /home/app/venv
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

