// Unit tests for the Payment model and the order.created consumer. No database, broker or Stripe needed.
jest.mock("../../../../shared/rabbitmq/messageBus", () => ({ subscribe: jest.fn() }));

describe("Payment model validation (unit, no database)", () => {
  const Payment = jest.requireActual("../../src/models/Payment");
  const valid = { orderId: "o1", userId: "u1", amount: 2000, stripePaymentIntentId: "pi_1" };

  test("a valid payment defaults to requires_payment and usd", () => {
    const p = new Payment(valid);
    expect(p.validateSync()).toBeUndefined();
    expect(p.status).toBe("requires_payment");
    expect(p.currency).toBe("usd");
  });

  test.each(["orderId", "userId", "amount", "stripePaymentIntentId"])("requires %s", (field) => {
    const data = { ...valid };
    delete data[field];
    expect(new Payment(data).validateSync().errors[field]).toBeDefined();
  });

  test("rejects an unknown status", () => {
    expect(new Payment({ ...valid, status: "refunded" }).validateSync().errors.status).toBeDefined();
  });
});

describe("order.created consumer (unit)", () => {
  jest.mock("../../src/models/Payment", () => ({ findOne: jest.fn(), create: jest.fn() }));
  jest.mock("../../src/stripeClient", () => ({ getStripe: jest.fn() }));

  const { subscribe } = require("../../../../shared/rabbitmq/messageBus");
  const Payment = require("../../src/models/Payment");
  const { getStripe } = require("../../src/stripeClient");
  const { startOrderEventsConsumer } = require("../../src/events/orderEventsConsumer");

  let handler;
  let stripeCreate;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    stripeCreate = jest.fn().mockResolvedValue({ id: "pi_new" });
    getStripe.mockReturnValue({ paymentIntents: { create: stripeCreate } });
    Payment.findOne.mockResolvedValue(null);
    Payment.create.mockResolvedValue({});
    await startOrderEventsConsumer();
    handler = subscribe.mock.calls[0][2];
  });

  afterEach(() => jest.restoreAllMocks());

  test("subscribes to order.created", () => {
    expect(subscribe).toHaveBeenCalledWith("payment-service.order-created", ["order.created"], expect.any(Function));
  });

  test("creates a PaymentIntent in the smallest currency unit and stores a Payment", async () => {
    await handler({ orderId: "o1", userId: "u1", total: 19.99, currency: "usd" });

    expect(stripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1999, currency: "usd", metadata: { orderId: "o1", userId: "u1" } })
    );
    expect(Payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "o1", amount: 1999, stripePaymentIntentId: "pi_new", status: "requires_payment" })
    );
  });

  test("rounds floating point totals correctly (e.g. 0.1 + 0.2 style values)", async () => {
    await handler({ orderId: "o2", userId: "u1", total: 34.5 + 0.1 + 0.2 });
    expect(stripeCreate.mock.calls[0][0].amount).toBe(3480);
  });

  test("defaults the currency to usd", async () => {
    await handler({ orderId: "o1", userId: "u1", total: 5 });
    expect(stripeCreate.mock.calls[0][0].currency).toBe("usd");
  });

  test("is idempotent: does nothing if a payment already exists for the order", async () => {
    Payment.findOne.mockResolvedValue({ orderId: "o1" });
    await handler({ orderId: "o1", userId: "u1", total: 10 });
    expect(stripeCreate).not.toHaveBeenCalled();
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("propagates Stripe errors so the message is nacked, not silently dropped", async () => {
    stripeCreate.mockRejectedValue(new Error("stripe down"));
    await expect(handler({ orderId: "o1", userId: "u1", total: 10 })).rejects.toThrow("stripe down");
    expect(Payment.create).not.toHaveBeenCalled();
  });
});
