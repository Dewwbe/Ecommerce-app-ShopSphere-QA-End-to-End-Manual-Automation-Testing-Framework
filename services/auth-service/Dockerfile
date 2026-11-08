FROM node:18-alpine
WORKDIR /app/services/auth-service

COPY services/auth-service/package*.json ./
RUN npm install --omit=dev

COPY shared /app/shared
COPY services/auth-service/ ./

ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "src/index.js"]
