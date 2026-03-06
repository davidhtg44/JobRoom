# 1. STAGE FRONTEND: Build di React
FROM node:18 AS build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. STAGE BACKEND: Setup del server
FROM node:18-slim
WORKDIR /app
# Copia le dipendenze del backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
# Copia tutto il codice (incluso il backend)
COPY . .
# Prende i file pronti del frontend e li mette nel backend (se il tuo server serve file statici)
COPY --from=build-frontend /app/frontend/build ./backend/public

EXPOSE 8080
CMD ["node", "backend/server.js"]
