const { http, auth, registerUser, firstProduct, addToCart, createOrder, getCart, getOrder, placeOrderAsNewUser } = require("../helpers/api");

describe("Service-to-service REST behaviour through the gateway", () => {
  let session;
  beforeAll(async () => {
    session = await registerUser();
  });

  test("cart -> product: adding an in-stock product succeeds with price and name from product-service", async () => {
    const product = await firstProduct();
    const res = await addToCart(session.token, product._id, 2);
    expect(res.status).toBe(201);
    expect(res.data.items[0]).toMatchObject({ productId: product._id, name: product.name, price: product.price, quantity: 2 });
  });

  test("cart -> product: quantity above available stock is rejected with 409", async () => {
    const product = await firstProduct();
    const res = await addToCart(session.token, product._id, product.stock + 1);
    expect(res.status).toBe(409);
    expect(res.data.error).toMatch(/insufficient_stock/);
  });

  test("cart -> product: a well-formed but unknown product id is rejected with 409 not_found", async () => {
    const res = await addToCart(session.token, "64b7f0f0f0f0f0f0f0f0f0f0", 1);
    expect(res.status).toBe(409);
    expect(res.data.error).toMatch(/not_found/);
  });

  test("cart -> product: a malformed product id is rejected with a 4xx client error", async () => {
    const res = await addToCart(session.token, "not-an-object-id", 1);
    // Expected behaviour is a client error. The cart-service currently maps the product-service 400 to 502.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  test("cart: missing or non-positive quantity is rejected with 400", async () => {
    const product = await firstProduct();
    expect((await addToCart(session.token, product._id, 0)).status).toBe(400);
    expect((await addToCart(session.token, product._id, -3)).status).toBe(400);
  });

  test("order -> cart: creating an order with an empty cart is rejected with 400", async () => {
    const fresh = await registerUser();
    const res = await createOrder(fresh.token);
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(/empty cart/i);
  });

  test("carts are isolated between users", async () => {
    const other = await registerUser();
    const cart = await getCart(other.token);
    expect(cart.data.items).toEqual([]);
  });

  test("users cannot read each other's orders (404)", async () => {
    const owner = await placeOrderAsNewUser();
    const intruder = await registerUser();
    const res = await getOrder(intruder.token, owner.order._id);
    expect(res.status).toBe(404);
  });
});

describe("API gateway routing and authentication", () => {
  test.each([
    ["GET", "/api/cart"],
    ["GET", "/api/orders"],
    ["GET", "/api/auth/me"],
  ])("%s %s without a token returns 401", async (method, path) => {
    const res = await http.request({ method, url: path });
    expect(res.status).toBe(401);
  });

  test("a tampered token is rejected with 401", async () => {
    const fake = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.invalidsignature";
    const res = await http.get("/api/cart", auth(fake));
    expect(res.status).toBe(401);
  });

  test("public product catalog is reachable without a token", async () => {
    const res = await http.get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.items)).toBe(true);
  });

  test("auth routing: register then /me round-trips through the gateway", async () => {
    const s = await registerUser();
    const me = await http.get("/api/auth/me", auth(s.token));
    expect(me.status).toBe(200);
  });

  test("unknown gateway route returns 404", async () => {
    const res = await http.get("/api/does-not-exist");
    expect(res.status).toBe(404);
  });

  test("a customer cannot create products (403 from product-service)", async () => {
    const s = await registerUser();
    const res = await http.post(
      "/api/products",
      { name: "x", category: "y", price: 1, sku: `SKU-${Date.now()}`, stock: 1 },
      auth(s.token)
    );
    expect(res.status).toBe(403);
  });
});
