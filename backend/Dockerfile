FROM node:20-alpine AS build
WORKDIR /app

# Skip Chromium no build (não precisa aqui)
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json tsconfig*.json ./
COPY src ./src

RUN npm ci
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Dependências do Chromium para Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer usa o Chromium do sistema
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]
