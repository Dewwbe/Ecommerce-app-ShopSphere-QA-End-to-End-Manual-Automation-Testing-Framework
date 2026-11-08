const express = require("express");
const cors = require("cors");
const orderRoutes = require("./routes/orderRoutes");

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (req, res) => res.json({ status: "ok", service: "order-service" }));
  app.use("/api/orders", orderRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[order-service] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
