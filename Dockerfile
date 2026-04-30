FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV STATIC_DIR=/app/dist
ENV MIHOMO_BIN=/usr/local/bin/mihomo

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl gzip \
  && rm -rf /var/lib/apt/lists/*

ARG TARGETARCH
COPY scripts/select-mihomo-asset.mjs ./scripts/select-mihomo-asset.mjs
RUN set -eux; \
  case "${TARGETARCH:-amd64}" in \
    amd64) MIHOMO_ARCH="amd64" ;; \
    arm64) MIHOMO_ARCH="arm64" ;; \
    *) echo "Unsupported TARGETARCH=${TARGETARCH:-}" >&2; exit 1 ;; \
  esac; \
  ASSET_URL="$(MIHOMO_ARCH="$MIHOMO_ARCH" node scripts/select-mihomo-asset.mjs)" \
  && curl -fsSL "$ASSET_URL" -o /tmp/mihomo.gz \
  && gunzip -c /tmp/mihomo.gz > /usr/local/bin/mihomo \
  && chmod +x /usr/local/bin/mihomo \
  && rm /tmp/mihomo.gz

COPY package*.json ./
RUN npm ci --omit=dev

COPY proxy-server.js ./
COPY src/server ./src/server
COPY --from=build /app/dist ./dist

EXPOSE 8787

CMD ["node", "proxy-server.js"]
