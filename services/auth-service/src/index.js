require("dotenv").config();
const mongoose = require("mongoose");
const { createApp } = require("./app");
const { connectWithRetry } = require("../../../shared/rabbitmq/messageBus");

const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/auth-service";

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log("[auth-service] Connected to MongoDB");

  await connectWithRetry();

  const app = createApp();
  app.listen(PORT, () => console.log(`[auth-service] Listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("[auth-service] Fatal startup error:", err);
  process.exit(1);
});
