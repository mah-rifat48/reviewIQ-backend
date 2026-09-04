# ──────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────
FROM node:22-bullseye AS builder

RUN apt-get update && apt-get install -y \
  python3 make g++ gcc postgresql-client \
  && ln -sf python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app
WORKDIR /usr/src/app
USER node

# Copy configuration and package files first for caching
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts tsconfig*.json ./

RUN npm install --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# Copy the rest
COPY --chown=node:node . .

RUN npx prisma generate
# CI=true disables chokidar file watchers (prevents ENOSPC inside Docker)
ENV CI=true CHOKIDAR_USEPOLLING=false
RUN npm run build

# ──────────────────────────────────────────
# Stage 2: Runtime (lean production image)
# ──────────────────────────────────────────
FROM node:22-bullseye AS runtime

RUN apt-get update && apt-get install -y \
  postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Ensure correct permissions
RUN mkdir -p uploads/profile-images uploads-file/png \
  && chown -R node:node /usr/src/app

USER node

# Copy build artifacts and necessary configs from builder
COPY --from=builder --chown=node:node /usr/src/app/dist          ./dist
COPY --from=builder --chown=node:node /usr/src/app/node_modules  ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/prisma        ./prisma
COPY --from=builder --chown=node:node /usr/src/app/package*.json ./
COPY --from=builder --chown=node:node /usr/src/app/prisma.config.ts ./
COPY --from=builder --chown=node:node /usr/src/app/tsconfig.json ./

ENV NODE_ENV=production

EXPOSE 3000

# The startup script runs migrations, then seeds, then the server.
# Note: dist path changed to dist/src/main.js due to multi-root compilation.
CMD ["bash", "-c", "\
  set -e; \
  echo '⏳ Waiting for PostgreSQL...'; \
  until pg_isready -h db -p 5432 -U \"$POSTGRES_USER\"; do sleep 2; done; \
  echo '📦 Running Prisma Migrations...'; \
  npx prisma migrate deploy; \
  echo '📤 Pushing Schema Changes...'; \
  npx prisma db push --accept-data-loss; \
  echo '🌱 Running Database Seeds...'; \
  npx prisma db seed; \
  echo '🚀 Starting API...'; \
  exec node dist/src/main.js \
"]
