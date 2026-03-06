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

# Copia della build di React dentro la cartella del backend
# Nota: il tuo Python dovrà servire i file da qui
COPY --from=build-frontend /app/frontend/build ./backend/static

# Variabili d'ambiente
ENV PYTHONUNBUFFERED=1
PORT=8080

EXPOSE 8080

# Comando per avviare il server (Assumendo che usi main.py)
CMD ["python", "backend/main.py"]
