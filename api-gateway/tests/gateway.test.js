const express = require("express");
const request = require("supertest");
const { createApp } = require("../src/app");

/**
 * Spins up a tiny fake backend service on an ephemeral port so we can test
 * that the gateway actually forwards requests and responses correctly,
 * without needing the real microservices running.
 */
function startFakeService(responseBody) {
  const fake = express();
  fake.use(express.json());
  fake.get("/api/products", (req, res) => res.json(responseBody));
  fake.get("/api/products/health-echo", (req, res) => res.json({ ok: true }));
  return new Promise((resolve) => {
    const server = fake.listen(0, () => resolve(server));
  });
}

describe("API gateway", () => {
  let fakeProductService;
  let app;

  beforeAll(async () => {
    fakeProductService = await startFakeService({ items: [{ name: "Widget" }], total: 1 });
    const port = fakeProductService.address().port;
    app = createApp({ PRODUCT_SERVICE_URL: `http://localhost:${port}` });
  });

  afterAll((done) => {
    fakeProductService.close(done);
  });

  test("GET /health responds without proxying", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("api-gateway");
  });

  test("GET /api/products is proxied to product-service", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  test("an unmapped route returns 404", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });

  test("a proxied request to a dead service returns 502, not a crash", async () => {
    const deadApp = createApp({ PRODUCT_SERVICE_URL: "http://localhost:1" });
    const res = await request(deadApp).get("/api/products");
    expect(res.status).toBe(502);
  });
});
