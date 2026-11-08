const express = require("express");
const Payment = require("../models/Payment");
const { getStripe } = require("../stripeClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/payments/:orderId — frontend fetches the client secret to confirm with Stripe.js
router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId: req.user.sub });
    if (!payment) return res.status(404).json({ error: "No payment found for this order yet. It may still be initializing." });

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);

    res.json({
      orderId: payment.orderId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      clientSecret: intent.client_secret,
    });
  } catch (err) {
    console.error("[payment-service] get payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/payments/:orderId/confirm — manual confirm using a test payment method (for local/dev testing without full Stripe.js UI)
router.post("/:orderId/confirm", requireAuth, async (req, res) => {
  const { paymentMethodId } = req.body || {};
  if (!paymentMethodId) return res.status(400).json({ error: "paymentMethodId is required" });

  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId, userId: req.user.sub });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.confirm(payment.stripePaymentIntentId, {
      payment_method: paymentMethodId,
    });

    // The authoritative status transition happens via the Stripe webhook below,
    // so this response just reflects Stripe's immediate reply for the UI.
    res.json({ status: intent.status, clientSecret: intent.client_secret });
  } catch (err) {
    console.error("[payment-service] confirm error:", err);
    res.status(400).json({ error: err.message || "Payment confirmation failed" });
  }
});

module.exports = router;
