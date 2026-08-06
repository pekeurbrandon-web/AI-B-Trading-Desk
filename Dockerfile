# Lightweight Dockerfile for AI-B Trading Desk
FROM node:18-alpine

# Create app dir
WORKDIR /app

# Install dependencies first (cache-friendly)
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy app
COPY . .

# Ensure data dir exists for runtime keys/data persistence
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
