    FROM node:20-alpine AS build
WORKDIR /app

# Avoid downloading Chromium for puppeteer during install (saves space in CI/builders)
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json tsconfig*.json ./
COPY src ./src

RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Keep the same flag in runtime layer to avoid attempts if scripts run
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Install Chromium + fonts so puppeteer can run in Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD ["node", "dist/server.js"]
