# --- Build the React frontend ---
FROM node:22-slim AS frontend
WORKDIR /fe
COPY fe/package.json fe/package-lock.json ./
RUN npm ci
COPY fe/ ./
RUN npm run build

# --- Python runtime ---
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/crawlytics.db \
    CRAWLYTICS_PATTERNS_PATH=/data/crawler_patterns.json \
    CRAWLYTICS_ALLOWED_HOSTS=localhost,127.0.0.1

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
RUN rm -rf react venv tests *.db* *.log
COPY --from=frontend /fe/dist ./react

RUN useradd --create-home crawlytics && mkdir /data && chown crawlytics /data /app
USER crawlytics
VOLUME /data
EXPOSE 8000

HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
