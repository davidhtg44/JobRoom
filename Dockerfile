# Usa solo Python, niente più Node!
FROM python:3.9-slim
WORKDIR /app

# Installa le dipendenze del backend
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libffi-dev \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copia il codice backend
COPY backend/ ./backend/

# IL TOCCO MAGICO: Copia la cartella build che hai creato sul PC
# Assicurati che il percorso sia corretto rispetto alla posizione del Dockerfile
COPY frontend/build ./backend/static

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

CMD ["python", "backend/main.py"]