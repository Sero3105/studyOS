# syntax=docker/dockerfile:1

# Frontend StudyOS: build Vite una sola volta, poi file statici serviti da
# nginx (utente non root) che fa anche da reverse proxy verso il backend.
#
# Stage 1: Node + dipendenze dal lockfile (`npm ci`), type-check e build.
# Stage finale: solo nginx e la cartella `dist`; niente Node, node_modules
# o TypeScript. Tag minor fissati; per riproducibilità totale fissare il digest.

FROM node:24-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Il browser chiama l'API sullo stesso host, sotto /api (vedi nginx.conf):
# niente URL di servizi Docker nel bundle, niente CORS.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build


FROM nginxinc/nginx-unprivileged:1.30-alpine-slim
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
