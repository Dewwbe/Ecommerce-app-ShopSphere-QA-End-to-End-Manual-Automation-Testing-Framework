// Publishes real events onto the stack's RabbitMQ topic exchange, exactly as payment-service would.
const amqp = require("amqplib");
const { RABBITMQ_URL, EXCHANGE } = require("./config");

async function publishEvent(routingKey, payload) {
  const conn = await amqp.connect(RABBITMQ_URL);
  try {
    const channel = await conn.createChannel();
    await channel.assertExchange(EXCHANGE, "topic", { durable: true });
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify({ ...payload, _emittedAt: new Date().toISOString() })), {
      contentType: "application/json",
      persistent: true,
    });
    await channel.close();
  } finally {
    await conn.close();
  }
}

module.exports = { publishEvent };
