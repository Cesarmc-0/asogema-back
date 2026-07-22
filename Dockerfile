# ---- Etapa 1: build ----
FROM node:20.11-bookworm-slim AS build
WORKDIR /app

# Copiar manifests para cache de deps
COPY package*.json ./
COPY prisma ./prisma

# Timeouts npm mas tolerantes + instalar TODAS las deps (incluye dev para build)
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm install --no-audit --no-fund

# Generar el cliente Prisma (necesita el schema.prisma) y compilar NestJS
COPY . .
RUN npx prisma generate && npm run build

# ---- Etapa 2: produccion ----
FROM node:20.11-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production

# Instalar curl para el HEALTHCHECK (version pinneada para reproducibilidad)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl=7.88.1-10+deb12u8 && \
    rm -rf /var/lib/apt/lists/*

# Timeouts npm mas tolerantes + deps de produccion
COPY package*.json ./
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm install --omit=dev --no-audit --no-fund

# Copiar el schema y el cliente Prisma generados desde etapa build
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copiar el build de NestJS
COPY --from=build /app/dist ./dist

# Usuario no-root (principio de menor privilegio)
USER node

EXPOSE 3000

# Healthcheck: cada 30s chequea /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]
