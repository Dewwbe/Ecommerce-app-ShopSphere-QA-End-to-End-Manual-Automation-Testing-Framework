// Unit tests for the Order model and the payment events consumer. No database or broker needed.
jest.mock("../../../../shared/rabbitmq/messageBus", () => ({ subscribe: jest.fn() }));

describe("Order model validation (unit, no database)", () => {
  const Order = jest.requireActual("../../src/models/Order");
  const item = { productId: "p1", name: "Widget", price: 10, quantity: 2 };

  test("a valid order defaults to PENDING_PAYMENT and usd", () => {
    const order = new Order({ userId: "u1", items: [item], total: 20 });
    expect(order.validateSync()).toBeUndefined();
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.currency).toBe("usd");
    expect(order.paymentIntentId).toBeNull();
  });

  test("rejects an order with no items", () => {
    const err = new Order({ userId: "u1", items: [], total: 0 }).validateSync();
    expect(err.errors.items).toBeDefined();
  });

  test("rejects a negative total", () => {
    expect(new Order({ userId: "u1", items: [item], total: -5 }).validateSync().errors.total).toBeDefined();
  });

  test("rejects an unknown status", () => {
    const err = new Order({ userId: "u1", items: [item], total: 1, status: "SHIPPED" }).validateSync();
    expect(err.errors.status).toBeDefined();
  });

  test.each(["PENDING_PAYMENT", "PAID", "PAYMENT_FAILED", "CANCELLED"])("accepts status %s", (status) => {
    expect(new Order({ userId: "u1", items: [item], total: 1, status }).validateSync()).toBeUndefined();
  });

  test("requires a userId", () => {
    expect(new Order({ items: [item], total: 1 }).validateSync().errors.userId).toBeDefined();
  });
});

describe("payment events consumer (unit)", () => {
  jest.mock("../../src/models/Order", () => ({ findById: jest.fn() }));

  const { subscribe } = require("../../../../shared/rabbitmq/messageBus");
  const Order = require("../../src/models/Order");
  const { startPaymentEventsConsumer } = require("../../src/events/paymentEventsConsumer");

  let handler;

  const makeOrder = () => ({ status: "PENDING_PAYMENT", paymentIntentId: null, save: jest.fn().mockResolvedValue(undefined) });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await startPaymentEventsConsumer();
    handler = subscribe.mock.calls[0][2];
  });

  afterEach(() => jest.restoreAllMocks());

  test("binds to payment.succeeded and payment.failed", () => {
    expect(subscribe).toHaveBeenCalledWith(
      "order-service.payment-events",
      ["payment.succeeded", "payment.failed"],
      expect.any(Function)
    );
  });

  test("payment.succeeded marks the order PAID and stores the payment intent id", async () => {
    const order = makeOrder();
    Order.findById.mockResolvedValue(order);

    await handler({ orderId: "o1", paymentIntentId: "pi_1" }, "payment.succeeded");

    expect(order.status).toBe("PAID");
    expect(order.paymentIntentId).toBe("pi_1");
    expect(order.save).toHaveBeenCalledTimes(1);
  });

  test("payment.failed marks the order PAYMENT_FAILED", async () => {
    const order = makeOrder();
    Order.findById.mockResolvedValue(order);

    await handler({ orderId: "o1", paymentIntentId: "pi_2" }, "payment.failed");

    expect(order.status).toBe("PAYMENT_FAILED");
    expect(order.save).toHaveBeenCalled();
  });

  test("leaves paymentIntentId unchanged when the event has none", async () => {
    const order = makeOrder();
    Order.findById.mockResolvedValue(order);

    await handler({ orderId: "o1" }, "payment.succeeded");

    expect(order.paymentIntentId).toBeNull();
  });

  test("ignores an event for an unknown order without throwing", async () => {
    Order.findById.mockResolvedValue(null);
    await expect(handler({ orderId: "missing" }, "payment.succeeded")).resolves.toBeUndefined();
  });
});
