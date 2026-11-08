require("dotenv").config();
const { createApp } = require("./app");

const PORT = process.env.PORT || 4000;

const app = createApp({
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL,
  PRODUCT_SERVICE_URL: process.env.PRODUCT_SERVICE_URL,
  CART_SERVICE_URL: process.env.CART_SERVICE_URL,
  ORDER_SERVICE_URL: process.env.ORDER_SERVICE_URL,
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL,
});

app.listen(PORT, () => console.log(`[api-gateway] Listening on port ${PORT}`));
