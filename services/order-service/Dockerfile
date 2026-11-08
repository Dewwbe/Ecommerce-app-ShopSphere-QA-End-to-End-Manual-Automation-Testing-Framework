FROM node:18-alpine
WORKDIR /app/services/order-service

COPY services/order-service/package*.json ./
RUN npm install --omit=dev

COPY shared /app/shared
COPY services/order-service/ ./

ENV NODE_ENV=production
EXPOSE 4004
CMD ["node", "src/index.js"]
