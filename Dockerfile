# 1. STAGE FRONTEND: Build di React
FROM node:18 AS build-frontend
WORKDIR /app/frontend
# Copia i file del package e installa
COPY frontend/package*.json ./
RUN npm install
# Copia il resto e builda
COPY frontend/ ./
RUN npm run build

# 2. STAGE BACKEND: Setup del server finale
FROM node:18-slim
WORKDIR /app

# Creiamo le cartelle esplicitamente per evitare errori di "cd"
RUN mkdir -p backend

# Copia i file delle dipendenze del backend nella sottocartella
COPY backend/package*.json ./backend/

# Entra nella cartella backend e installa le dipendenze
RUN cd backend && npm install

# Copia tutto il resto del progetto (incluso il codice del backend)
COPY . .

# Prende i file compilati dal frontend e li sposta nella cartella public del backend
# (Assicurati che il tuo server backend serva i file da questa cartella)
COPY --from=build-frontend /app/frontend/build ./backend/public

# Esponi la porta (Fly.io di solito usa la 8080)
EXPOSE 8080

# Avvia il server
# NOTA: Assicurati che il file si chiami davvero server.js e sia in backend/
CMD ["node", "backend/server.js"]
