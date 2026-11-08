require("dotenv").config();
const mongoose = require("mongoose");
const { createApp } = require("./app");
const { connectWithRetry } = require("../../../shared/rabbitmq/messageBus");
const { startPaymentEventsConsumer } = require("./events/paymentEventsConsumer");

const PORT = process.env.PORT || 4004;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/order-service";

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log("[order-service] Connected to MongoDB");

  await connectWithRetry();
  await startPaymentEventsConsumer();

  const app = createApp();
  app.listen(PORT, () => console.log(`[order-service] Listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("[order-service] Fatal startup error:", err);
  process.exit(1);
});
