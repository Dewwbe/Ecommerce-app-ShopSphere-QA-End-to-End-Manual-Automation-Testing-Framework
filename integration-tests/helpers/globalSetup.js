// Fails fast with a clear message when the stack is not running or not seeded.
const axios = require("axios");
const amqp = require("amqplib");
const { GATEWAY_URL, RABBITMQ_URL } = require("./config");

module.exports = async () => {
  try {
    await axios.get(`${GATEWAY_URL}/health`, { timeout: 5000 });
  } catch (err) {
    throw new Error(
      `API gateway is not reachable at ${GATEWAY_URL} (${err.code || err.message}).\n` +
        "Start the stack first: docker compose up -d --build"
    );
  }

  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    await conn.close();
  } catch (err) {
    throw new Error(`RabbitMQ is not reachable at ${RABBITMQ_URL} (${err.message}).`);
  }

  const { data } = await axios.get(`${GATEWAY_URL}/api/products`, { timeout: 5000 });
  if (!data.items || data.items.length === 0) {
    throw new Error("Product catalog is empty. Seed it: docker compose exec product-service npm run seed");
  }
};
