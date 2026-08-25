# ---- Etapa 1: build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Instalar pnpm global
RUN npm install -g pnpm@10

# Copiar manifests y lock para cachear deps
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma

# Instalar TODAS las deps (incluye dev para build)
RUN pnpm install --frozen-lockfile

# Generar el cliente Prisma y compilar NestJS
COPY . .
RUN pnpm exec prisma generate && pnpm run build

# ---- Etapa 2: produccion ----
FROM node:22-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production

# Instalar pnpm global
RUN npm install -g pnpm@10

# Instalar curl para el HEALTHCHECK
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Solo deps de produccion
COPY --chown=node:node package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

# Copiar el schema y el cliente Prisma generados desde etapa build
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copiar el build de NestJS
COPY --chown=node:node --from=build /app/dist ./dist

# Usuario no-root
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

CMD ["node", "dist/src/main"]
