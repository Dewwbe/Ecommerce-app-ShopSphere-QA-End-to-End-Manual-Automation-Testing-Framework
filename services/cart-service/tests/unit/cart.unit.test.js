// Unit tests for the Cart model and the order.created consumer. No database or broker needed.
jest.mock("../../../../shared/rabbitmq/messageBus", () => ({ subscribe: jest.fn() }));
jest.mock("../../src/models/Cart", () => ({ findOneAndUpdate: jest.fn() }));

describe("Cart model (unit, no database)", () => {
  // Use the real model here, bypassing the mock used for the consumer tests below.
  const RealCart = jest.requireActual("../../src/models/Cart");

  test("total() sums price x quantity across items", () => {
    const cart = new RealCart({
      userId: "u1",
      items: [
        { productId: "a", name: "A", price: 10, quantity: 2 },
        { productId: "b", name: "B", price: 2.5, quantity: 4 },
      ],
    });
    expect(cart.total()).toBe(30);
  });

  test("total() is 0 for an empty cart", () => {
    expect(new RealCart({ userId: "u1" }).total()).toBe(0);
  });

  test("rejects an item with quantity below 1", () => {
    const cart = new RealCart({ userId: "u1", items: [{ productId: "a", name: "A", price: 1, quantity: 0 }] });
    expect(cart.validateSync()).toBeDefined();
  });

  test("rejects an item with a negative price", () => {
    const cart = new RealCart({ userId: "u1", items: [{ productId: "a", name: "A", price: -1, quantity: 1 }] });
    expect(cart.validateSync()).toBeDefined();
  });

  test("requires a userId", () => {
    expect(new RealCart({}).validateSync().errors.userId).toBeDefined();
  });
});

describe("order.created consumer (unit)", () => {
  const { subscribe } = require("../../../../shared/rabbitmq/messageBus");
  const Cart = require("../../src/models/Cart");
  const { startOrderEventsConsumer } = require("../../src/events/orderEventsConsumer");

  let handler;

  beforeEach(async () => {
    jest.clearAllMocks();
    await startOrderEventsConsumer();
    handler = subscribe.mock.calls[0][2];
  });

  test("subscribes its own durable queue to order.created", () => {
    expect(subscribe).toHaveBeenCalledWith("cart-service.order-created", ["order.created"], expect.any(Function));
  });

  test("clears the cart of the user who placed the order", async () => {
    await handler({ orderId: "o1", userId: "user-9" });
    expect(Cart.findOneAndUpdate).toHaveBeenCalledWith({ userId: "user-9" }, { $set: { items: [] } });
  });

  test("ignores an event with no userId", async () => {
    await handler({ orderId: "o1" });
    expect(Cart.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
