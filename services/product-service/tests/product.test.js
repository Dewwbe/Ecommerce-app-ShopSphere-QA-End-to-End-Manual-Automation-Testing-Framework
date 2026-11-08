const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");

process.env.JWT_SECRET = "test-secret";

let mongod;
let app;

function tokenFor(role = "customer") {
  return jwt.sign({ sub: "u1", email: "u@example.com", role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const sampleProduct = {
  name: "Test Widget",
  description: "A widget for testing",
  category: "Tools",
  price: 9.99,
  stock: 10,
  sku: "TEST-WIDGET-001",
};

describe("Product catalog CRUD (smoke + regression)", () => {
  test("GET /api/products returns empty list initially", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  test("POST /api/products rejects non-admin users with 403", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("customer")}`)
      .send(sampleProduct);
    expect(res.status).toBe(403);
  });

  test("POST /api/products rejects unauthenticated requests with 401", async () => {
    const res = await request(app).post("/api/products").send(sampleProduct);
    expect(res.status).toBe(401);
  });

  test("POST /api/products creates a product as admin", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send(sampleProduct);
    expect(res.status).toBe(201);
    expect(res.body.product.sku).toBe(sampleProduct.sku);
  });

  test("POST /api/products rejects a duplicate SKU with 409", async () => {
    await request(app).post("/api/products").set("Authorization", `Bearer ${tokenFor("admin")}`).send(sampleProduct);
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send(sampleProduct);
    expect(res.status).toBe(409);
  });

  test("POST /api/products rejects negative price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ ...sampleProduct, sku: "TEST-002", price: -5 });
    expect(res.status).toBe(400);
  });

  test("GET /api/products/:id returns the created product", async () => {
    const create = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send(sampleProduct);
    const res = await request(app).get(`/api/products/${create.body.product._id}`);
    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe(sampleProduct.name);
  });

  test("GET /api/products/:id returns 404 for an unknown valid-looking id", async () => {
    const res = await request(app).get("/api/products/507f1f77bcf86cd799439011");
    expect(res.status).toBe(404);
  });

  test("PUT /api/products/:id updates stock as admin", async () => {
    const create = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send(sampleProduct);
    const res = await request(app)
      .put(`/api/products/${create.body.product._id}`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ stock: 5 });
    expect(res.status).toBe(200);
    expect(res.body.product.stock).toBe(5);
  });

  test("DELETE /api/products/:id removes the product as admin", async () => {
    const create = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send(sampleProduct);
    const del = await request(app)
      .delete(`/api/products/${create.body.product._id}`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`);
    expect(del.status).toBe(204);

    const getAfter = await request(app).get(`/api/products/${create.body.product._id}`);
    expect(getAfter.status).toBe(404);
  });

  test("POST /api/products/internal/check-availability reports insufficient stock", async () => {
    const create = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({ ...sampleProduct, stock: 2 });

    const res = await request(app)
      .post("/api/products/internal/check-availability")
      .send({ items: [{ productId: create.body.product._id, quantity: 5 }] });

    expect(res.status).toBe(200);
    expect(res.body.results[0].available).toBe(false);
    expect(res.body.results[0].reason).toBe("insufficient_stock");
  });
});
