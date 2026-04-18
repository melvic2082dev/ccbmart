FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN mkdir -p uploads logs

EXPOSE 4000

CMD ["node", "src/server.js"]
