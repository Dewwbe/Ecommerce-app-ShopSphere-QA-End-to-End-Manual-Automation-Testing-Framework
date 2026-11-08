FROM node:18-alpine
WORKDIR /app/services/product-service

COPY services/product-service/package*.json ./
RUN npm install --omit=dev

COPY shared /app/shared
COPY services/product-service/ ./

ENV NODE_ENV=production
EXPOSE 4002
CMD ["node", "src/index.js"]
