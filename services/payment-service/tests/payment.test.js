const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.JWT_SECRET = "test-secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";

// Mock the Stripe SDK entirely so tests never call the real Stripe API.
const mockRetrieve = jest.fn();
const mockConfirm = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: "pi_test_123", client_secret: "secret_123" }),
      retrieve: mockRetrieve,
      confirm: mockConfirm,
    },
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }));
});

jest.mock("../../../shared/rabbitmq/messageBus", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined),
  connectWithRetry: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = require("../src/app");
const Payment = require("../src/models/Payment");

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

describe("Payment service", () => {
  test("GET /api/payments/:orderId returns 404 when no payment exists yet", async () => {
    const res = await request(app).get("/api/payments/order-1").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(404);
  });

  test("GET /api/payments/:orderId returns the client secret for an existing payment", async () => {
    await Payment.create({
      orderId: "order-1",
      userId: "user-1",
      amount: 2000,
      currency: "usd",
      stripePaymentIntentId: "pi_test_123",
      status: "requires_payment",
    });
    mockRetrieve.mockResolvedValue({ client_secret: "secret_123" });

    const res = await request(app).get("/api/payments/order-1").set("Authorization", `Bearer ${tokenFor()}`);
    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe("secret_123");
    expect(res.body.amount).toBe(2000);
  });

  test("GET /api/payments/:orderId does not leak another user's payment", async () => {
    await Payment.create({
      orderId: "order-1",
      userId: "user-2",
      amount: 2000,
      stripePaymentIntentId: "pi_test_123",
    });

    const res = await request(app).get("/api/payments/order-1").set("Authorization", `Bearer ${tokenFor("user-1")}`);
    expect(res.status).toBe(404);
  });

  test("POST /api/payments/:orderId/confirm requires a paymentMethodId", async () => {
    const res = await request(app)
      .post("/api/payments/order-1/confirm")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test("POST /api/payments/:orderId/confirm confirms the PaymentIntent via Stripe", async () => {
    await Payment.create({
      orderId: "order-1",
      userId: "user-1",
      amount: 2000,
      stripePaymentIntentId: "pi_test_123",
    });
    mockConfirm.mockResolvedValue({ status: "succeeded", client_secret: "secret_123" });

    const res = await request(app)
      .post("/api/payments/order-1/confirm")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ paymentMethodId: "pm_card_visa" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("succeeded");
    expect(mockConfirm).toHaveBeenCalledWith("pi_test_123", { payment_method: "pm_card_visa" });
  });

  test("POST /api/payments/webhook updates payment status to succeeded on payment_intent.succeeded", async () => {
    const payment = await Payment.create({
      orderId: "order-1",
      userId: "user-1",
      amount: 2000,
      stripePaymentIntentId: "pi_test_123",
      status: "requires_payment",
    });

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_test_123" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Stripe-Signature", "t=1,v1=fake")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ any: "payload" })));

    expect(res.status).toBe(200);
    const updated = await Payment.findById(payment._id);
    expect(updated.status).toBe("succeeded");
  });

  test("POST /api/payments/webhook rejects an invalid signature with 400", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Stripe-Signature", "bad")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ any: "payload" })));

    expect(res.status).toBe(400);
  });
});
