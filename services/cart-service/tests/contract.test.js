/**
 * Contract tests for cart-service.
 *  - Consumer of  http/check-availability.response (product-service -> cart-service)
 *  - Provider of  http/cart.response               (cart-service -> order-service)
 *  - Consumer of  events/order.created              (order-service -> cart-service)
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
const Cart = require("../src/models/Cart");
const { subscribe } = require("../../../shared/rabbitmq/messageBus");
const { startOrderEventsConsumer } = require("../src/events/orderEventsConsumer");

const ajv = new Ajv({ strict: false });
const availabilitySchema = require("../../../contracts/http/check-availability.response.schema.json");
const cartSchema = require("../../../contracts/http/cart.response.schema.json");
const orderCreatedSchema = require("../../../contracts/events/order.created.schema.json");

const check = (schema, data) => {
  const fn = ajv.compile(schema);
  return { ok: fn(data), errors: fn.errors };
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

describe("contract: check-availability.response (cart-service is the consumer)", () => {
  const [available, unavailable] = availabilitySchema.examples;

  test("both example responses are valid per the contract", () => {
    expect(check(availabilitySchema, available).ok).toBe(true);
    expect(check(availabilitySchema, unavailable).ok).toBe(true);
  });

  test("an 'available' response is turned into a cart line using price and name", async () => {
    axios.post.mockResolvedValue({ data: available });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token()}`)
      .send({ productId: "p1", quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.items[0]).toMatchObject({ productId: "p1", name: "Widget", price: 10, quantity: 2 });
  });

  test("an 'unavailable' response is surfaced as 409 with the reason", async () => {
    axios.post.mockResolvedValue({ data: unavailable });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token()}`)
      .send({ productId: "p2", quantity: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("insufficient_stock");
  });

  test("the request cart-service sends matches what product-service expects", async () => {
    axios.post.mockResolvedValue({ data: available });

    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token()}`)
      .send({ productId: "p1", quantity: 3 });

    const [url, body] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/api\/products\/internal\/check-availability$/);
    expect(body).toEqual({ items: [{ productId: "p1", quantity: 3 }] });
  });
});

describe("contract: cart.response (cart-service is the provider)", () => {
  test("an empty cart matches the contract", async () => {
    const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(check(cartSchema, res.body)).toEqual({ ok: true, errors: null });
  });

  test("a cart with items matches the contract", async () => {
    axios.post.mockResolvedValue({ data: availabilitySchema.examples[0] });
    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${token()}`)
      .send({ productId: "p1", quantity: 2 });

    const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${token()}`);
    expect(check(cartSchema, res.body)).toEqual({ ok: true, errors: null });
    expect(res.body.total).toBe(20);
  });
});

describe("contract: order.created (cart-service is the consumer)", () => {
  test("the contract example clears the cart of the named user", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    const event = orderCreatedSchema.examples[0];
    expect(check(orderCreatedSchema, event).ok).toBe(true);

    await Cart.create({
      userId: event.userId,
      items: [{ productId: "p1", name: "Widget", price: 10, quantity: 2 }],
    });

    await startOrderEventsConsumer();
    const handler = subscribe.mock.calls[0][2];
    await handler(event, "order.created");

    expect((await Cart.findOne({ userId: event.userId })).items).toHaveLength(0);
    console.log.mockRestore();
  });
});
