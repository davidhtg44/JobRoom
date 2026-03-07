# 1. COSTRUZIONE FRONTEND (Usa Node 16 per ARMv6)
FROM node:16-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Su Pi Zero, npm install è pesantissimo: usiamo questa opzione per risparmiare RAM
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2. SETUP BACKEND (Python)
FROM python:3.9-slim
WORKDIR /app

# Installa le dipendenze di sistema per SQLite e Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

# Copia la build di React dove Python può vederla
COPY --from=frontend-builder /app/frontend/build ./backend/static

# Variabili d'ambiente
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

# Comando per avviare il server
CMD ["python", "backend/main.py"]