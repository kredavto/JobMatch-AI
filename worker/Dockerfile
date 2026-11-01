# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -s /run/secrets/proxy_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --ignore-scripts --strict-ssl=true --no-audit --no-fund; \
    else npm ci --ignore-scripts --strict-ssl=true --no-audit --no-fund; fi
COPY lib ./lib
COPY worker ./worker
RUN npm run build:parser-worker

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends util-linux libfontconfig1 fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -s /run/secrets/proxy_ca ]; then NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --omit=dev --ignore-scripts --strict-ssl=true --no-audit --no-fund; \
    else npm ci --omit=dev --ignore-scripts --strict-ssl=true --no-audit --no-fund; fi \
 && npm cache clean --force && rm -rf /root/.npm
COPY --from=build /build/worker/dist ./compiled
USER 10001:10001
EXPOSE 8080
CMD ["node","--disable-sigusr1","--max-old-space-size=96","compiled/worker/server.cjs"]
