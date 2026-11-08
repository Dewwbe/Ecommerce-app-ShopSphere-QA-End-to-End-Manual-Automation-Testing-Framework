const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true }, // smallest currency unit (cents)
    currency: { type: String, default: "usd" },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["requires_payment", "succeeded", "failed"],
      default: "requires_payment",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
