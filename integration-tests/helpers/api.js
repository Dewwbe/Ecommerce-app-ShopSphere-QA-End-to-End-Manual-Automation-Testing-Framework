const axios = require("axios");
const { randomUUID } = require("crypto");
const { GATEWAY_URL, PASSWORD } = require("./config");

// validateStatus: never throw, so tests can assert on error status codes.
const http = axios.create({ baseURL: GATEWAY_URL, validateStatus: () => true, timeout: 10000 });
const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

async function registerUser() {
  const email = `it+${randomUUID().slice(0, 8)}@shopsphere-tests.local`;
  const res = await http.post("/api/auth/register", { firstName: "Integ", lastName: "Tester", email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.data)}`);
  return { email, token: res.data.token, user: res.data.user };
}

async function firstProduct() {
  const res = await http.get("/api/products");
  const product = res.data.items.find((p) => p.stock > 0);
  if (!product) throw new Error("No in-stock product found; seed the catalog");
  return product;
}

const addToCart = (token, productId, quantity = 1) => http.post("/api/cart/items", { productId, quantity }, auth(token));
const getCart = (token) => http.get("/api/cart", auth(token));
const createOrder = (token) =>
  http.post(
    "/api/orders",
    { shippingAddress: { line1: "123 Galle Road", city: "Colombo", postalCode: "00300", country: "LK" } },
    auth(token)
  );
const getOrder = (token, id) => http.get(`/api/orders/${id}`, auth(token));

/** register -> add product -> place order; returns everything a test needs. */
async function placeOrderAsNewUser() {
  const session = await registerUser();
  const product = await firstProduct();
  const add = await addToCart(session.token, product._id, 1);
  if (add.status !== 201) throw new Error(`add to cart failed: ${add.status} ${JSON.stringify(add.data)}`);
  const order = await createOrder(session.token);
  if (order.status !== 201) throw new Error(`create order failed: ${order.status} ${JSON.stringify(order.data)}`);
  return { ...session, product, order: order.data.order };
}

module.exports = { http, auth, registerUser, firstProduct, addToCart, getCart, createOrder, getOrder, placeOrderAsNewUser };
