const express = require("express");
const axios = require("axios");
const Cart = require("../models/Cart");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:4002";

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

function serializeCart(cart) {
  return { userId: cart.userId, items: cart.items, total: Number(cart.total().toFixed(2)) };
}

// GET /api/cart — the authenticated user's cart
router.get("/", requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.sub);
  res.json(serializeCart(cart));
});

// POST /api/cart/items — add an item (validated against product-service for price/stock)
router.post("/items", requireAuth, async (req, res) => {
  const { productId, quantity } = req.body || {};
  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: "productId and a positive quantity are required" });
  }

  try {
    const { data } = await axios.post(`${PRODUCT_SERVICE_URL}/api/products/internal/check-availability`, {
      items: [{ productId, quantity }],
    });
    const result = data.results[0];
    if (!result.available) {
      return res.status(409).json({ error: `Product unavailable: ${result.reason}` });
    }

    const cart = await getOrCreateCart(req.user.sub);
    const existing = cart.items.find((item) => item.productId === productId);
    if (existing) {
      existing.quantity += quantity;
      existing.price = result.price; // keep price fresh
    } else {
      cart.items.push({ productId, name: result.name, price: result.price, quantity });
    }
    await cart.save();
    res.status(201).json(serializeCart(cart));
  } catch (err) {
    if (err.response) return res.status(502).json({ error: "Could not reach product service" });
    console.error("[cart-service] add item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/cart/items/:productId — update quantity
router.put("/items/:productId", requireAuth, async (req, res) => {
  const { quantity } = req.body || {};
  if (!quantity || quantity < 1) return res.status(400).json({ error: "quantity must be a positive integer" });

  const cart = await getOrCreateCart(req.user.sub);
  const item = cart.items.find((i) => i.productId === req.params.productId);
  if (!item) return res.status(404).json({ error: "Item not in cart" });

  item.quantity = quantity;
  await cart.save();
  res.json(serializeCart(cart));
});

// DELETE /api/cart/items/:productId
router.delete("/items/:productId", requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.sub);
  const before = cart.items.length;
  cart.items = cart.items.filter((i) => i.productId !== req.params.productId);
  if (cart.items.length === before) return res.status(404).json({ error: "Item not in cart" });

  await cart.save();
  res.json(serializeCart(cart));
});

// DELETE /api/cart — clear cart (also called internally once an order is placed)
router.delete("/", requireAuth, async (req, res) => {
  const cart = await getOrCreateCart(req.user.sub);
  cart.items = [];
  await cart.save();
  res.json(serializeCart(cart));
});

module.exports = router;
