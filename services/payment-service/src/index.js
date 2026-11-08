require("dotenv").config();
const mongoose = require("mongoose");
const { createApp } = require("./app");
const { connectWithRetry } = require("../../../shared/rabbitmq/messageBus");
const { startOrderEventsConsumer } = require("./events/orderEventsConsumer");

const PORT = process.env.PORT || 4005;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/payment-service";

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log("[payment-service] Connected to MongoDB");

  await connectWithRetry();
  await startOrderEventsConsumer();

  const app = createApp();
  app.listen(PORT, () => console.log(`[payment-service] Listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("[payment-service] Fatal startup error:", err);
  process.exit(1);
});
