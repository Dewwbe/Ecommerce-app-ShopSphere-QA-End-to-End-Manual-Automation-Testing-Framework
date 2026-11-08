const { placeOrderAsNewUser, getCart, getOrder } = require("../helpers/api");
const { publishEvent } = require("../helpers/bus");
const { waitFor } = require("../helpers/waitFor");

describe("Event flow across order, cart and payment (real RabbitMQ)", () => {
  test("order.created: placing an order clears the cart via the cart-service consumer", async () => {
    const { token } = await placeOrderAsNewUser();

    const cart = await waitFor(
      async () => {
        const res = await getCart(token);
        return res.status === 200 && res.data.items.length === 0 ? res.data : null;
      },
      { description: "cart to be emptied after order.created" }
    );
    expect(cart.items).toEqual([]);
  });

  test("new order starts as PENDING_PAYMENT and snapshots the cart contents and total", async () => {
    const { order, product } = await placeOrderAsNewUser();
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ productId: product._id, quantity: 1, price: product.price });
    expect(order.total).toBeCloseTo(product.price, 2);
    expect(order.shippingAddress).toMatchObject({ city: "Colombo", country: "LK" });
  });

  test("payment.succeeded: order-service marks the order PAID and stores the payment intent id", async () => {
    const { token, order } = await placeOrderAsNewUser();

    await publishEvent("payment.succeeded", { orderId: order._id, userId: order.userId, paymentIntentId: "pi_integration_test_ok" });

    const paid = await waitFor(
      async () => {
        const res = await getOrder(token, order._id);
        return res.data.order.status === "PAID" ? res.data.order : null;
      },
      { description: "order to become PAID" }
    );
    expect(paid.paymentIntentId).toBe("pi_integration_test_ok");
  });

  test("payment.failed: order-service marks the order PAYMENT_FAILED", async () => {
    const { token, order } = await placeOrderAsNewUser();

    await publishEvent("payment.failed", { orderId: order._id, userId: order.userId, paymentIntentId: "pi_integration_test_fail" });

    const failed = await waitFor(
      async () => {
        const res = await getOrder(token, order._id);
        return res.data.order.status === "PAYMENT_FAILED" ? res.data.order : null;
      },
      { description: "order to become PAYMENT_FAILED" }
    );
    expect(failed.status).toBe("PAYMENT_FAILED");
  });

  test("a payment event for an unknown order is ignored and the consumer keeps working", async () => {
    await publishEvent("payment.succeeded", { orderId: "64b7f0f0f0f0f0f0f0f0f0f0", paymentIntentId: "pi_unknown" });

    // The consumer must still process a valid event afterwards.
    const { token, order } = await placeOrderAsNewUser();
    await publishEvent("payment.succeeded", { orderId: order._id, paymentIntentId: "pi_after_unknown" });
    await waitFor(async () => (await getOrder(token, order._id)).data.order.status === "PAID", {
      description: "order to become PAID after an unknown-order event",
    });
  });
});
