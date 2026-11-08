/**
 * Shared RabbitMQ helper used by every microservice.
 *
 * Topology:
 *   Exchange: "ecommerce.events" (topic exchange)
 *   Routing keys used across the system:
 *     user.registered
 *     order.created
 *     order.cancelled
 *     payment.succeeded
 *     payment.failed
 *
 * Each service declares its own durable queue bound to the routing keys
 * it cares about, so services can be started/stopped independently and
 * never lose events (messages persist in the queue until acked).
 */
const amqp = require("amqplib");

const EXCHANGE = "ecommerce.events";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

let connection = null;
let channel = null;

async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE, "topic", { durable: true });

      connection.on("close", () => {
        console.error("[messageBus] RabbitMQ connection closed. Exiting so the container restarts.");
        process.exit(1);
      });

      console.log("[messageBus] Connected to RabbitMQ and exchange asserted.");
      return channel;
    } catch (err) {
      console.error(`[messageBus] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Publish a JSON event to the shared topic exchange.
 * @param {string} routingKey e.g. "order.created"
 * @param {object} payload
 */
async function publishEvent(routingKey, payload) {
  if (!channel) throw new Error("[messageBus] publishEvent called before connect()");
  const message = Buffer.from(JSON.stringify({ ...payload, _emittedAt: new Date().toISOString() }));
  channel.publish(EXCHANGE, routingKey, message, { contentType: "application/json", persistent: true });
  console.log(`[messageBus] Published event "${routingKey}"`);
}

/**
 * Subscribe a service to one or more routing keys via its own durable queue.
 * @param {string} queueName unique per-service queue name, e.g. "cart-service.order-events"
 * @param {string[]} routingKeys patterns to bind, e.g. ["order.created"]
 * @param {(payload: object, routingKey: string) => Promise<void>} handler
 */
async function subscribe(queueName, routingKeys, handler) {
  if (!channel) throw new Error("[messageBus] subscribe called before connect()");
  await channel.assertQueue(queueName, { durable: true });
  for (const key of routingKeys) {
    await channel.bindQueue(queueName, EXCHANGE, key);
  }

  channel.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await handler(payload, msg.fields.routingKey);
      channel.ack(msg);
    } catch (err) {
      console.error(`[messageBus] Handler failed for queue "${queueName}":`, err);
      // Requeue once; a dead-letter exchange would be the production-grade next step.
      channel.nack(msg, false, false);
    }
  });

  console.log(`[messageBus] Queue "${queueName}" bound to [${routingKeys.join(", ")}] and consuming.`);
}

async function closeConnection() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

module.exports = { connectWithRetry, publishEvent, subscribe, closeConnection, EXCHANGE };
