const Payment = require("../models/Payment");
const { getStripe } = require("../stripeClient");
const { subscribe } = require("../../../../shared/rabbitmq/messageBus");

/**
 * As soon as order-service confirms an order, payment-service creates a
 * Stripe PaymentIntent for it. The frontend later fetches that intent's
 * client secret (GET /api/payments/:orderId) and confirms it with Stripe.js.
 */
async function startOrderEventsConsumer() {
  await subscribe("payment-service.order-created", ["order.created"], async (payload) => {
    const { orderId, userId, total, currency } = payload;

    const existing = await Payment.findOne({ orderId });
    if (existing) {
      console.log(`[payment-service] PaymentIntent already exists for order ${orderId}, skipping`);
      return;
    }

    const stripe = getStripe();
    const amountInSmallestUnit = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency || "usd",
      metadata: { orderId, userId },
      automatic_payment_methods: { enabled: true },
    });

    await Payment.create({
      orderId,
      userId,
      amount: amountInSmallestUnit,
      currency: currency || "usd",
      stripePaymentIntentId: paymentIntent.id,
      status: "requires_payment",
    });

    console.log(`[payment-service] Created PaymentIntent ${paymentIntent.id} for order ${orderId}`);
  });
}

module.exports = { startOrderEventsConsumer };
