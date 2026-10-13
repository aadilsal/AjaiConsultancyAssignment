# syntax=docker/dockerfile:1.7
# Requires `output: "standalone"` in next.config.ts.

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
# Next resolves rewrites at build time, so the API URL is baked in here.
ARG API_INTERNAL_URL=http://api:4000
ENV API_INTERNAL_URL=${API_INTERNAL_URL} \
    NODE_ENV=production
COPY . .
RUN npm run build
RUN test -f .next/standalone/server.js || { echo "ERROR: set output: 'standalone' in next.config.ts" >&2; exit 1; }

FROM base AS runtime
ARG API_INTERNAL_URL=http://api:4000
ENV NODE_ENV=production \
    API_INTERNAL_URL=${API_INTERNAL_URL} \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NODE_OPTIONS=--max-old-space-size=160
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
