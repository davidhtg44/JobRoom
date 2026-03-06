# 1. COSTRUZIONE FRONTEND (React)
FROM node:18 AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. SETUP BACKEND (Python)
FROM python:3.9-slim
WORKDIR /app

# Installazione dipendenze Python
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copia del codice backend
COPY backend/ ./backend/

# Copia della build di React
# Questa riga sposta i file di React dove Python può vederli
COPY --from=build-frontend /app/frontend/build ./backend/static

# Variabili d'ambiente (CORRETTE)
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

# Comando per avviare il server
CMD ["python", "backend/main.py"]
