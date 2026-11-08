const express = require("express");
const Product = require("../models/Product");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function validateProduct(body, { partial = false } = {}) {
  const errors = [];
  const required = (field) => {
    if (!partial && (body[field] === undefined || body[field] === null || body[field] === "")) {
      errors.push(`${field} is required`);
    }
  };

  required("name");
  required("category");
  required("price");
  required("sku");

  if (body.price !== undefined && (typeof body.price !== "number" || body.price < 0)) {
    errors.push("price must be a non-negative number");
  }
  if (body.stock !== undefined && (typeof body.stock !== "number" || body.stock < 0)) {
    errors.push("stock must be a non-negative number");
  }
  return errors;
}

// GET /api/products?search=&category=&page=&limit=
router.get("/", async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) query.$text = { $search: search };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Product.find(query)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      Product.countDocuments(query),
    ]);

    res.json({ items, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("[product-service] list error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(400).json({ error: "Invalid product id" });
  }
});

// POST /api/products (admin only)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "SKU already exists" });
    console.error("[product-service] create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/products/:id (admin only)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const errors = validateProduct(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    res.status(400).json({ error: "Invalid product id or data" });
  }
});

// DELETE /api/products/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: "Invalid product id" });
  }
});

// Internal: used by cart/order services to validate price & stock atomically-ish
router.post("/internal/check-availability", async (req, res) => {
  const { items } = req.body; // [{ productId, quantity }]
  try {
    const results = await Promise.all(
      (items || []).map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) return { productId: item.productId, available: false, reason: "not_found" };
        if (product.stock < item.quantity) return { productId: item.productId, available: false, reason: "insufficient_stock" };
        return { productId: item.productId, available: true, price: product.price, name: product.name };
      })
    );
    res.json({ results });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

module.exports = router;
