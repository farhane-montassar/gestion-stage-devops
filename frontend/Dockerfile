# ---------- Build ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Configuration de build Angular.
#  - "production" (défaut) -> apiUrl = URL Render  => CI/CD Render inchangée
#  - "docker"              -> apiUrl = /api        => reverse proxy Nginx local
ARG BUILD_CONFIGURATION=production

RUN npm run build -- --configuration=$BUILD_CONFIGURATION

# ---------- Runtime ----------
FROM nginx:alpine

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]