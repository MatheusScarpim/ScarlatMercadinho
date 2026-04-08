FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_LOCATION_PASSWORD
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_LOCATION_PASSWORD=${VITE_LOCATION_PASSWORD}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Injeta o script de reload no index.html depois do build
RUN sed -i "s|</head>|<script src=\"${VITE_API_BASE_URL}/kiosks/reload.js\"></script></head>|" /app/dist/index.html

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
