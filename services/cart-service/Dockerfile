FROM node:18-alpine
WORKDIR /app/services/cart-service

COPY services/cart-service/package*.json ./
RUN npm install --omit=dev

COPY shared /app/shared
COPY services/cart-service/ ./

ENV NODE_ENV=production
EXPOSE 4003
CMD ["node", "src/index.js"]
