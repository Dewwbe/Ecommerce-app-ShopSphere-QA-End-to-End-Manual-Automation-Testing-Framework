/**
 * Contract tests for payment-service.
 *  - Producer of  events/payment.succeeded and events/payment.failed (consumed by order-service)
 *  - Consumer of  events/order.created                                (produced by order-service)
 */
const mongoose = require("mongoose");
const request = require("supertest");
const Ajv = require("ajv");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "test-secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

const mockConstructEvent = jest.fn();
const mockCreate = jest.fn();

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    paymentIntents: { create: mockCreate },
    webhooks: { constructEvent: mockConstructEvent },
  }))
);

jest.mock("../../../shared/rabbitmq/messageBus", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  connectWithRetry: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = require("../src/app");
const Payment = require("../src/models/Payment");
const { publishEvent, subscribe } = require("../../../shared/rabbitmq/messageBus");
const { startOrderEventsConsumer } = require("../src/events/orderEventsConsumer");

const ajv = new Ajv({ strict: false });
const succeededSchema = require("../../../contracts/events/payment.succeeded.schema.json");
const failedSchema = require("../../../contracts/events/payment.failed.schema.json");
const orderCreatedSchema = require("../../../contracts/events/order.created.schema.json");

const check = (schema, data) => {
  const fn = ajv.compile(schema);
  return { ok: fn(data), errors: fn.errors };
};

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

afterEach(async () => {
  jest.clearAllMocks();
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const sendWebhook = () =>
  request(app)
    .post("/api/payments/webhook")
    .set("Stripe-Signature", "t=1,v1=fake")
    .set("Content-Type", "application/json")
    .send(Buffer.from(JSON.stringify({ any: "payload" })));

const makePayment = () =>
  Payment.create({ orderId: "order-1", userId: "user-1", amount: 2000, stripePaymentIntentId: "pi_123" });

describe("contract: payment events (payment-service is the producer)", () => {
  test("a succeeded webhook publishes a payment.succeeded event that matches the schema", async () => {
    await makePayment();
    mockConstructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: "pi_123" } } });

    const res = await sendWebhook();

    expect(res.status).toBe(200);
    const [routingKey, payload] = publishEvent.mock.calls[0];
    expect(routingKey).toBe("payment.succeeded");
    expect(check(succeededSchema, payload)).toEqual({ ok: true, errors: null });
    expect(payload).toMatchObject({ orderId: "order-1", userId: "user-1", paymentIntentId: "pi_123" });
  });

  test("a failed webhook publishes a payment.failed event that matches the schema", async () => {
    await makePayment();
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_123", last_payment_error: { message: "Your card was declined." } } },
    });

    const res = await sendWebhook();

    expect(res.status).toBe(200);
    const [routingKey, payload] = publishEvent.mock.calls[0];
    expect(routingKey).toBe("payment.failed");
    expect(check(failedSchema, payload)).toEqual({ ok: true, errors: null });
    expect(payload.reason).toBe("Your card was declined.");
  });

  test("a failed webhook without an error message still satisfies the contract (reason is required)", async () => {
    await makePayment();
    mockConstructEvent.mockReturnValue({ type: "payment_intent.payment_failed", data: { object: { id: "pi_123" } } });

    await sendWebhook();

    const [, payload] = publishEvent.mock.calls[0];
    expect(check(failedSchema, payload).ok).toBe(true);
    expect(payload.reason).toBe("unknown");
  });

  test("no event is published for a payment intent we do not know about", async () => {
    mockConstructEvent.mockReturnValue({ type: "payment_intent.succeeded", data: { object: { id: "pi_unknown" } } });

    const res = await sendWebhook();

    expect(res.status).toBe(200);
    expect(publishEvent).not.toHaveBeenCalled();
  });
});

describe("contract: order.created (payment-service is the consumer)", () => {
  test("the contract example produces a PaymentIntent and a stored Payment", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    mockCreate.mockResolvedValue({ id: "pi_from_example" });
    const event = orderCreatedSchema.examples[0];
    expect(check(orderCreatedSchema, event).ok).toBe(true);

    await startOrderEventsConsumer();
    const handler = subscribe.mock.calls[0][2];
    await handler(event, "order.created");

    const payment = await Payment.findOne({ orderId: event.orderId });
    expect(payment).not.toBeNull();
    expect(payment.amount).toBe(Math.round(event.total * 100));
    expect(payment.stripePaymentIntentId).toBe("pi_from_example");
    console.log.mockRestore();
  });
});
