const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");

jest.mock("axios");
jest.mock("../../../shared/rabbitmq/messageBus", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  connectWithRetry: jest.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = "test-secret";

let mongod;
let app;
const Order = require("../src/models/Order");

function tokenFor(sub = "user-1") {
  return jwt.sign({ sub, email: "u@example.com", role: "customer" }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

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

describe("Order service", () => {
  test("POST /api/orders rejects an empty cart with 400", async () => {
    axios.get.mockResolvedValue({ data: { items: [], total: 0 } });

    const res = await request(app).post("/api/orders").set("Authorization", `Bearer ${tokenFor()}`).send({});
    expect(res.status).toBe(400);
  });

  test("POST /api/orders creates an order from a non-empty cart", async () => {
    axios.get.mockResolvedValue({
      data: { items: [{ productId: "p1", name: "Widget", price: 10, quantity: 2 }], total: 20 },
    });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ shippingAddress: { line1: "1 Main St", city: "Colombo", postalCode: "00100", country: "LK" } });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe("PENDING_PAYMENT");
    expect(res.body.order.total).toBe(20);
  });

  test("POST /api/orders requires authentication", async () => {
    const res = await request(app).post("/api/orders").send({});
    expect(res.status).toBe(401);
  });

  test("GET /api/orders lists only the authenticated user's orders", async () => {
    axios.get.mockResolvedValue({
      data: { items: [{ productId: "p1", name: "Widget", price: 10, quantity: 1 }], total: 10 },
    });
    await request(app).post("/api/orders").set("Authorization", `Bearer ${tokenFor("user-1")}`).send({});
    await request(app).post("/api/orders").set("Authorization", `Bearer ${tokenFor("user-2")}`).send({});

    const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${tokenFor("user-1")}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });

  test("GET /api/orders/:id returns 404 for another user's order", async () => {
    axios.get.mockResolvedValue({
      data: { items: [{ productId: "p1", name: "Widget", price: 10, quantity: 1 }], total: 10 },
    });
    const create = await request(app).post("/api/orders").set("Authorization", `Bearer ${tokenFor("user-1")}`).send({});

    const res = await request(app)
      .get(`/api/orders/${create.body.order._id}`)
      .set("Authorization", `Bearer ${tokenFor("user-2")}`);
    expect(res.status).toBe(404);
  });

  test("POST /api/orders/:id/cancel cancels a pending order", async () => {
    axios.get.mockResolvedValue({
      data: { items: [{ productId: "p1", name: "Widget", price: 10, quantity: 1 }], total: 10 },
    });
    const token = tokenFor();
    const create = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({});

    const res = await request(app).post(`/api/orders/${create.body.order._id}/cancel`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("CANCELLED");
  });

  test("POST /api/orders/:id/cancel rejects cancelling a paid order", async () => {
    axios.get.mockResolvedValue({
      data: { items: [{ productId: "p1", name: "Widget", price: 10, quantity: 1 }], total: 10 },
    });
    const token = tokenFor();
    const create = await request(app).post("/api/orders").set("Authorization", `Bearer ${token}`).send({});
    await Order.findByIdAndUpdate(create.body.order._id, { status: "PAID" });

    const res = await request(app).post(`/api/orders/${create.body.order._id}/cancel`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(409);
  });
});
