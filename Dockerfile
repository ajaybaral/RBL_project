# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production
COPY backend ./backend
COPY artifacts ./artifacts
COPY .env ./.env
EXPOSE 3001
CMD ["node", "backend/index.js"]
