const Order = require("../models/Order");
const { subscribe } = require("../../../../shared/rabbitmq/messageBus");

/**
 * Order-service owns the order's lifecycle but never talks to Stripe
 * directly — payment-service does that and reports back over the bus.
 */
async function startPaymentEventsConsumer() {
  await subscribe(
    "order-service.payment-events",
    ["payment.succeeded", "payment.failed"],
    async (payload, routingKey) => {
      const { orderId, paymentIntentId } = payload;
      const order = await Order.findById(orderId);
      if (!order) {
        console.warn(`[order-service] Received ${routingKey} for unknown order ${orderId}`);
        return;
      }

      order.status = routingKey === "payment.succeeded" ? "PAID" : "PAYMENT_FAILED";
      if (paymentIntentId) order.paymentIntentId = paymentIntentId;
      await order.save();
      console.log(`[order-service] Order ${orderId} updated to ${order.status} via ${routingKey}`);
    }
  );
}

module.exports = { startPaymentEventsConsumer };
