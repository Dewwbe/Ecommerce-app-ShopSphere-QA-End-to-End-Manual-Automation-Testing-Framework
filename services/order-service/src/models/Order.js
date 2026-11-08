const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "PAID", "PAYMENT_FAILED", "CANCELLED"],
      default: "PENDING_PAYMENT",
      index: true,
    },
    shippingAddress: {
      line1: String,
      city: String,
      postalCode: String,
      country: String,
    },
    paymentIntentId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
