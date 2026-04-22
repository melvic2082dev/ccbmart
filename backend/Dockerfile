FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
# bust cache when dependencies change
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN mkdir -p uploads logs && chown -R node:node /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/api/ping || exit 1

CMD ["sh", "-c", "echo '[STARTUP] running migrate' && (npx prisma migrate deploy || echo '[STARTUP] migrate failed, continuing') && echo '[STARTUP] launching node' && exec node src/server.js"]
