const jwt = require("jsonwebtoken");
const { requireAuth, requireAdmin } = require("../../src/middleware/auth");

process.env.JWT_SECRET = "unit-test-secret";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const sign = (payload, opts = { expiresIn: "1h" }) => jwt.sign(payload, process.env.JWT_SECRET, opts);

describe("requireAuth middleware (unit)", () => {
  test("rejects a request with no Authorization header", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAuth({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a non-Bearer scheme", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAuth({ headers: { authorization: "Basic abc123" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a Bearer header with no token", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAuth({ headers: { authorization: "Bearer" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("rejects a tampered token", () => {
    const res = mockRes();
    const next = jest.fn();
    const token = sign({ sub: "u1", role: "customer" });
    requireAuth({ headers: { authorization: `Bearer ${token}x` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("rejects a token signed with a different secret", () => {
    const res = mockRes();
    const next = jest.fn();
    const token = jwt.sign({ sub: "u1" }, "some-other-secret");
    requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("rejects an expired token", () => {
    const res = mockRes();
    const next = jest.fn();
    const token = sign({ sub: "u1" }, { expiresIn: -10 });
    requireAuth({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("accepts a valid token, attaches req.user and calls next()", () => {
    const res = mockRes();
    const next = jest.fn();
    const req = { headers: { authorization: `Bearer ${sign({ sub: "u1", role: "customer" })}` } };
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ sub: "u1", role: "customer" });
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("requireAdmin middleware (unit)", () => {
  test("returns 403 when there is no user", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAdmin({}, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("returns 403 for a customer", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAdmin({ user: { role: "customer" } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("calls next() for an admin", () => {
    const res = mockRes();
    const next = jest.fn();
    requireAdmin({ user: { role: "admin" } }, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
