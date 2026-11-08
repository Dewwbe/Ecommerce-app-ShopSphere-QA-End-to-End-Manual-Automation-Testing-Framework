const Cart = require("../models/Cart");
const { subscribe } = require("../../../../shared/rabbitmq/messageBus");

/**
 * When order-service confirms an order was created from a user's cart,
 * clear that cart so the UI doesn't show items that were just purchased.
 */
async function startOrderEventsConsumer() {
  await subscribe("cart-service.order-created", ["order.created"], async (payload) => {
    const { userId } = payload;
    if (!userId) return;
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
    console.log(`[cart-service] Cleared cart for user ${userId} after order.created`);
  });
}

module.exports = { startOrderEventsConsumer };
