FROM node:18-alpine
WORKDIR /app/services/payment-service

COPY services/payment-service/package*.json ./
RUN npm install --omit=dev

COPY shared /app/shared
COPY services/payment-service/ ./

ENV NODE_ENV=production
EXPOSE 4005
CMD ["node", "src/index.js"]
