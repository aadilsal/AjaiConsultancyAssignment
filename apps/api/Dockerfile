# syntax=docker/dockerfile:1.7
# Build: docker build --build-context scripts=scripts apps/api (compose passes this automatically)

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# All dependencies (dev included) for building.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Compile TypeScript and generate the Prisma client.
FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

# Production-only node_modules, keeping the Prisma CLI for `migrate deploy`.
FROM build AS prod-deps
RUN PRISMA_VERSION="$(node -p "require('prisma/package.json').version")" \
 && npm prune --omit=dev --no-audit --no-fund \
 && if [ ! -f node_modules/prisma/package.json ]; then \
      npm install --no-save --omit=dev --no-audit --no-fund "prisma@${PRISMA_VERSION}"; \
    fi \
 && npx prisma generate \
 && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=192
COPY --from=scripts --chmod=0755 api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/api-entrypoint.sh
COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/prisma ./prisma
COPY --from=prod-deps --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
