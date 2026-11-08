const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "usd" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, default: "" },
    sku: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Product", productSchema);
