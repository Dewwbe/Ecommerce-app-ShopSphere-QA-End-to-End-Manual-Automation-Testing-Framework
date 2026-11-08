FROM node:18-alpine
WORKDIR /app/api-gateway

COPY api-gateway/package*.json ./
RUN npm install --omit=dev

COPY api-gateway/ ./

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
