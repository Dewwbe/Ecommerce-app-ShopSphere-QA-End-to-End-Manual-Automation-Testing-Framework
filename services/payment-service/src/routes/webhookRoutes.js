const express = require("express");
const Payment = require("../models/Payment");
const { getStripe } = require("../stripeClient");
const { publishEvent } = require("../../../../shared/rabbitmq/messageBus");

const router = express.Router();

/**
 * Stripe webhook endpoint. Must receive the RAW request body (not JSON-parsed)
 * so the signature in the Stripe-Signature header can be verified — see
 * app.js, where express.raw() is mounted for this exact path.
 *
 * This is the single source of truth for payment state: we never trust the
 * client-side confirm() response alone, only this signed server-to-server event.
 */
router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[payment-service] Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        const payment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: intent.id },
          { status: "succeeded" },
          { new: true }
        );
        if (payment) {
          await publishEvent("payment.succeeded", {
            orderId: payment.orderId,
            userId: payment.userId,
            paymentIntentId: intent.id,
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        const payment = await Payment.findOneAndUpdate(
          { stripePaymentIntentId: intent.id },
          { status: "failed" },
          { new: true }
        );
        if (payment) {
          await publishEvent("payment.failed", {
            orderId: payment.orderId,
            userId: payment.userId,
            paymentIntentId: intent.id,
            reason: intent.last_payment_error?.message || "unknown",
          });
        }
        break;
      }
      default:
        console.log(`[payment-service] Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[payment-service] Webhook handling error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
