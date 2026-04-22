FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN mkdir -p uploads logs && chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4000}/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
