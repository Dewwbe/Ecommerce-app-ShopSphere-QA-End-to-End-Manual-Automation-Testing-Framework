const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

function createApp() {
  const app = express();
  app.use(cors());

  // IMPORTANT: Stripe webhook signature verification needs the raw body,
  // so this route is mounted BEFORE express.json() and parses raw itself.
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }), webhookRoutes);

  app.use(express.json());

  app.get("/health", (req, res) => res.json({ status: "ok", service: "payment-service" }));
  app.use("/api/payments", paymentRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[payment-service] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
