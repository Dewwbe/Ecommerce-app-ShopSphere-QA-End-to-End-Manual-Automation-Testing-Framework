/**
 * Contract test for product-service as the PROVIDER of http/check-availability.response,
 * which cart-service consumes.
 */
const mongoose = require("mongoose");
const request = require("supertest");
const Ajv = require("ajv");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");
const Product = require("../src/models/Product");

process.env.JWT_SECRET = "test-secret";

const ajv = new Ajv({ strict: false });
const availabilitySchema = require("../../../contracts/http/check-availability.response.schema.json");
const validate = ajv.compile(availabilitySchema);

let mongod;
let app;
let product;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

beforeEach(async () => {
  product = await Product.create({ name: "Widget", category: "Tools", price: 10, stock: 3, sku: "W-1" });
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const check = (items) => request(app).post("/api/products/internal/check-availability").send({ items });

describe("contract: check-availability.response (product-service is the provider)", () => {
  test("an in-stock product returns available with price and name", async () => {
    const res = await check([{ productId: product._id.toString(), quantity: 2 }]);

    expect(res.status).toBe(200);
    expect(validate(res.body)).toBe(true);
    expect(res.body.results[0]).toMatchObject({ available: true, price: 10, name: "Widget" });
  });

  test("requesting more than the stock returns insufficient_stock", async () => {
    const res = await check([{ productId: product._id.toString(), quantity: 99 }]);

    expect(validate(res.body)).toBe(true);
    expect(res.body.results[0]).toMatchObject({ available: false, reason: "insufficient_stock" });
  });

  test("requesting exactly the available stock is allowed (boundary)", async () => {
    const res = await check([{ productId: product._id.toString(), quantity: 3 }]);
    expect(res.body.results[0].available).toBe(true);
  });

  test("an unknown product returns not_found", async () => {
    const res = await check([{ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 }]);

    expect(validate(res.body)).toBe(true);
    expect(res.body.results[0]).toMatchObject({ available: false, reason: "not_found" });
  });

  test("the response echoes the productId so the consumer can correlate results", async () => {
    const id = product._id.toString();
    const res = await check([{ productId: id, quantity: 1 }]);
    expect(res.body.results[0].productId).toBe(id);
  });
});
