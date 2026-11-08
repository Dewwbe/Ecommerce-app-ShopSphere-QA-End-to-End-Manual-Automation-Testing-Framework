/**
 * Contract tests for order-service.
 *  - Consumer of  http/cart.response            (cart-service -> order-service)
 *  - Producer of  events/order.created          (order-service -> cart/payment-service)
 *  - Consumer of  events/payment.succeeded|failed (payment-service -> order-service)
 * The schemas live in /contracts and are shared with the other service's tests.
 */
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const Ajv = require("ajv");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.mock("axios");
jest.mock("../../../shared/rabbitmq/messageBus", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  connectWithRetry: jest.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = "test-secret";

const { createApp } = require("../src/app");
const Order = require("../src/models/Order");
const { publishEvent, subscribe } = require("../../../shared/rabbitmq/messageBus");
const { startPaymentEventsConsumer } = require("../src/events/paymentEventsConsumer");

const ajv = new Ajv({ strict: false });
const cartSchema = require("../../../contracts/http/cart.response.schema.json");
const orderCreatedSchema = require("../../../contracts/events/order.created.schema.json");
const paymentSucceededSchema = require("../../../contracts/events/payment.succeeded.schema.json");
const paymentFailedSchema = require("../../../contracts/events/payment.failed.schema.json");

const validate = (schema, data) => {
  const fn = ajv.compile(schema);
  const ok = fn(data);
  return { ok, errors: fn.errors };
};

let mongod;
let app;

const token = (sub = "user-1") => jwt.sign({ sub, role: "customer" }, process.env.JWT_SECRET, { expiresIn: "1h" });

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

describe("contract: cart.response (order-service is the consumer)", () => {
  test("the cart example order-service is tested against is itself a valid cart.response", () => {
    // Guards against the mock drifting away from what cart-service really returns.
    expect(validate(cartSchema, cartSchema.examples[0]).ok).toBe(true);
  });

  test("order-service accepts a cart that satisfies the contract", async () => {
    axios.get.mockResolvedValue({ data: cartSchema.examples[0] });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token()}`)
      .send({ shippingAddress: { line1: "1 Main St", city: "Colombo", postalCode: "00100", country: "LK" } });

    expect(res.status).toBe(201);
    expect(res.body.order.total).toBe(cartSchema.examples[0].total);
  });
});

describe("contract: order.created (order-service is the producer)", () => {
  test("the published payload matches the order.created schema", async () => {
    axios.get.mockResolvedValue({ data: cartSchema.examples[0] });

    await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token()}`)
      .send({ shippingAddress: { line1: "1 Main St", city: "Colombo", postalCode: "00100", country: "LK" } });

    expect(publishEvent).toHaveBeenCalledTimes(1);
    const [routingKey, payload] = publishEvent.mock.calls[0];
    expect(routingKey).toBe("order.created");

    const { ok, errors } = validate(orderCreatedSchema, JSON.parse(JSON.stringify(payload)));
    expect({ ok, errors }).toEqual({ ok: true, errors: null });
  });
});

describe("contract: payment events (order-service is the consumer)", () => {
  let handler;

  beforeEach(async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    await startPaymentEventsConsumer();
    handler = subscribe.mock.calls[0][2];
  });

  afterEach(() => jest.restoreAllMocks());

  const makeOrder = () =>
    Order.create({
      userId: "user-1",
      items: [{ productId: "p1", name: "Widget", price: 10, quantity: 2 }],
      total: 20,
    });

  test("payment.succeeded example from the contract marks the order PAID", async () => {
    const order = await makeOrder();
    const payload = { ...paymentSucceededSchema.examples[0], orderId: order._id.toString() };
    expect(validate(paymentSucceededSchema, payload).ok).toBe(true);

    await handler(payload, "payment.succeeded");

    const updated = await Order.findById(order._id);
    expect(updated.status).toBe("PAID");
    expect(updated.paymentIntentId).toBe(payload.paymentIntentId);
  });

  test("payment.failed example from the contract marks the order PAYMENT_FAILED", async () => {
    const order = await makeOrder();
    const payload = { ...paymentFailedSchema.examples[0], orderId: order._id.toString() };
    expect(validate(paymentFailedSchema, payload).ok).toBe(true);

    await handler(payload, "payment.failed");

    expect((await Order.findById(order._id)).status).toBe("PAYMENT_FAILED");
  });
});
