require("dotenv").config();
const mongoose = require("mongoose");
const { createApp } = require("./app");

const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/product-service";

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log("[product-service] Connected to MongoDB");

  const app = createApp();
  app.listen(PORT, () => console.log(`[product-service] Listening on port ${PORT}`));
}

start().catch((err) => {
  console.error("[product-service] Fatal startup error:", err);
  process.exit(1);
});
