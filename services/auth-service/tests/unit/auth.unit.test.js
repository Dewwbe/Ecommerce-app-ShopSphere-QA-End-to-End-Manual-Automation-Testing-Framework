const jwt = require("jsonwebtoken");
const { validateRegister, validateLogin } = require("../../src/middleware/validate");
const { requireAuth } = require("../../src/middleware/auth");
const { signToken, verifyToken } = require("../../src/utils/jwt");
const User = require("../../src/models/User");

process.env.JWT_SECRET = "unit-test-secret";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const validRegistration = { firstName: "Jane", lastName: "Doe", email: "jane@example.com", password: "StrongPass1" };

describe("validateRegister (unit)", () => {
  test("calls next() for valid input", () => {
    const next = jest.fn();
    validateRegister({ body: validRegistration }, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["short first name", { firstName: "J" }, "firstName"],
    ["missing last name", { lastName: "" }, "lastName"],
    ["malformed email", { email: "not-an-email" }, "email"],
    ["email without domain dot", { email: "a@b" }, "email"],
    ["password of 7 characters", { password: "1234567" }, "password"],
  ])("returns 400 for %s", (_label, override, field) => {
    const res = mockRes();
    const next = jest.fn();
    validateRegister({ body: { ...validRegistration, ...override } }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    const { errors } = res.json.mock.calls[0][0];
    expect(errors.some((e) => e.startsWith(field))).toBe(true);
  });

  test("accepts a password of exactly 8 characters (boundary)", () => {
    const next = jest.fn();
    validateRegister({ body: { ...validRegistration, password: "12345678" } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test("returns 400 and does not throw when the body is missing", () => {
    const res = mockRes();
    validateRegister({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors).toHaveLength(4);
  });
});

describe("validateLogin (unit)", () => {
  test("calls next() for valid input", () => {
    const next = jest.fn();
    validateLogin({ body: { email: "jane@example.com", password: "x" } }, mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  test("returns 400 when the password is missing", () => {
    const res = mockRes();
    validateLogin({ body: { email: "jane@example.com" } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 for an invalid email", () => {
    const res = mockRes();
    validateLogin({ body: { email: "nope", password: "x" } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("jwt utils (unit)", () => {
  const user = { _id: { toString: () => "abc123" }, email: "jane@example.com", role: "customer" };

  test("signToken embeds sub, email and role", () => {
    const decoded = jwt.decode(signToken(user));
    expect(decoded).toMatchObject({ sub: "abc123", email: "jane@example.com", role: "customer" });
  });

  test("verifyToken round-trips a signed token", () => {
    expect(verifyToken(signToken(user)).sub).toBe("abc123");
  });

  test("verifyToken throws for a token signed with a different secret", () => {
    const forged = jwt.sign({ sub: "abc123" }, "other-secret");
    expect(() => verifyToken(forged)).toThrow();
  });

  test("signToken honours JWT_EXPIRES_IN", () => {
    process.env.JWT_EXPIRES_IN = "2h";
    const { iat, exp } = jwt.decode(signToken(user));
    delete process.env.JWT_EXPIRES_IN;
    expect(exp - iat).toBe(2 * 60 * 60);
  });
});

describe("requireAuth (unit)", () => {
  test("401 without a Bearer token", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAuth({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("401 for an invalid token", () => {
    const res = mockRes();
    requireAuth({ headers: { authorization: "Bearer garbage" } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("attaches req.user for a valid token", () => {
    const req = { headers: { authorization: `Bearer ${jwt.sign({ sub: "u1" }, process.env.JWT_SECRET)}` } };
    const next = jest.fn();
    requireAuth(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.user.sub).toBe("u1");
  });
});

describe("User model validation (unit, no database)", () => {
  test("a complete user is valid and defaults the role to customer", () => {
    const user = new User({ ...validRegistration, passwordHash: "hash" });
    expect(user.validateSync()).toBeUndefined();
    expect(user.role).toBe("customer");
  });

  test("lower-cases and trims the email", () => {
    const user = new User({ ...validRegistration, email: "  Jane@Example.COM ", passwordHash: "hash" });
    expect(user.email).toBe("jane@example.com");
  });

  test("requires passwordHash", () => {
    const err = new User(validRegistration).validateSync();
    expect(err.errors.passwordHash).toBeDefined();
  });

  test("rejects an unknown role", () => {
    const err = new User({ ...validRegistration, passwordHash: "h", role: "superuser" }).validateSync();
    expect(err.errors.role).toBeDefined();
  });
});
