FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY lib ./lib
COPY worker ./worker
RUN npm run build:parser-worker

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends util-linux libfontconfig1 fonts-dejavu-core poppler-utils tesseract-ocr tesseract-ocr-eng tesseract-ocr-rus \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /build/worker/dist ./compiled
USER 10001:10001
EXPOSE 8080
CMD ["node","--disable-sigusr1","--max-old-space-size=96","compiled/worker/server.cjs"]
