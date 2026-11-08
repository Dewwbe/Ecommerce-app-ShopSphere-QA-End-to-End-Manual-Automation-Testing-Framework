const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");

jest.mock("axios");

process.env.JWT_SECRET = "test-secret";

let mongod;
let app;

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

describe("Cart service", () => {
  test("GET /api/cart returns an empty cart for a new user", async () => {
    const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  test("GET /api/cart requires authentication", async () => {
    const res = await request(app).get("/api/cart");
    expect(res.status).toBe(401);
  });

  test("POST /api/cart/items adds an available product", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: true, price: 10, name: "Widget" }] },
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ productId: "p1", quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(20);
  });

  test("POST /api/cart/items rejects when product-service reports insufficient stock", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: false, reason: "insufficient_stock" }] },
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ productId: "p1", quantity: 100 });

    expect(res.status).toBe(409);
  });

  test("POST /api/cart/items rejects missing quantity", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ productId: "p1" });
    expect(res.status).toBe(400);
  });

  test("adding the same product twice increments quantity instead of duplicating", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: true, price: 10, name: "Widget" }] },
    });
    const token = tokenFor();
    await request(app).post("/api/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: "p1", quantity: 1 });
    const res = await request(app).post("/api/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: "p1", quantity: 2 });

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
  });

  test("PUT /api/cart/items/:productId updates quantity", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: true, price: 10, name: "Widget" }] },
    });
    const token = tokenFor();
    await request(app).post("/api/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: "p1", quantity: 1 });

    const res = await request(app)
      .put("/api/cart/items/p1")
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(5);
  });

  test("PUT /api/cart/items/:productId returns 404 for an item not in the cart", async () => {
    const res = await request(app)
      .put("/api/cart/items/does-not-exist")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ quantity: 5 });
    expect(res.status).toBe(404);
  });

  test("DELETE /api/cart/items/:productId removes an item", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: true, price: 10, name: "Widget" }] },
    });
    const token = tokenFor();
    await request(app).post("/api/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: "p1", quantity: 1 });

    const res = await request(app).delete("/api/cart/items/p1").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  test("DELETE /api/cart clears the whole cart", async () => {
    axios.post.mockResolvedValue({
      data: { results: [{ productId: "p1", available: true, price: 10, name: "Widget" }] },
    });
    const token = tokenFor();
    await request(app).post("/api/cart/items").set("Authorization", `Bearer ${token}`).send({ productId: "p1", quantity: 3 });

    const res = await request(app).delete("/api/cart").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
