module.exports = {
  GATEWAY_URL: process.env.GATEWAY_URL || "http://localhost:4000",
  RABBITMQ_URL: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
  EXCHANGE: "ecommerce.events",
  PASSWORD: "StrongPass1",
};
