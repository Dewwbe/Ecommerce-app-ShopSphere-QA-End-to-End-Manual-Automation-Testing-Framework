const express = require("express");
const axios = require("axios");
const Order = require("../models/Order");
const { requireAuth } = require("../middleware/auth");
const { publishEvent } = require("../../../../shared/rabbitmq/messageBus");

const router = express.Router();
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:4003";

// POST /api/orders — create an order from the user's current cart
router.post("/", requireAuth, async (req, res) => {
  try {
    const { shippingAddress } = req.body || {};
    const authHeader = req.headers.authorization;

    const { data: cart } = await axios.get(`${CART_SERVICE_URL}/api/cart`, {
      headers: { Authorization: authHeader },
    });

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: "Cannot place an order with an empty cart" });
    }

    const order = await Order.create({
      userId: req.user.sub,
      items: cart.items,
      total: cart.total,
      shippingAddress,
      status: "PENDING_PAYMENT",
    });

    await publishEvent("order.created", {
      orderId: order._id.toString(),
      userId: order.userId,
      items: order.items,
      total: order.total,
      currency: order.currency,
    });

    res.status(201).json({ order });
  } catch (err) {
    if (err.response) return res.status(502).json({ error: "Could not reach cart service" });
    console.error("[order-service] create order error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders — list the authenticated user's orders
router.get("/", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.sub }).sort({ createdAt: -1 });
  res.json({ orders });
});

// GET /api/orders/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch {
    res.status(400).json({ error: "Invalid order id" });
  }
});

// POST /api/orders/:id/cancel
router.post("/:id/cancel", requireAuth, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "PENDING_PAYMENT") {
      return res.status(409).json({ error: `Cannot cancel an order in status ${order.status}` });
    }
    order.status = "CANCELLED";
    await order.save();
    await publishEvent("order.cancelled", { orderId: order._id.toString(), userId: order.userId });
    res.json({ order });
  } catch {
    res.status(400).json({ error: "Invalid order id" });
  }
});

module.exports = router;
