const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { createApp } = require("../src/app");

// Mock the shared message bus so tests never require a real RabbitMQ broker.
jest.mock("../../../shared/rabbitmq/messageBus", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
  connectWithRetry: jest.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const validUser = {
  firstName: "Dewmini",
  lastName: "Perera",
  email: "dewmini@example.com",
  password: "StrongPass1",
};

describe("POST /api/auth/register", () => {
  test("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(409);
  });

  test.each([
    [{ ...validUser, email: "not-an-email" }, "invalid email"],
    [{ ...validUser, password: "short" }, "short password"],
    [{ ...validUser, firstName: "D" }, "short first name"],
  ])("rejects invalid input: %#", async (payload) => {
    const res = await request(app).post("/api/auth/register").send(payload);
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(validUser);
  });

  test("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: validUser.email, password: "WrongPassword1" });
    expect(res.status).toBe(401);
  });

  test("rejects unknown email with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: validUser.password });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  test("returns the authenticated user's profile", async () => {
    const register = await request(app).post("/api/auth/register").send(validUser);
    const token = register.body.token;

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
  });

  test("rejects a request with no token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  test("rejects a request with a malformed token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
