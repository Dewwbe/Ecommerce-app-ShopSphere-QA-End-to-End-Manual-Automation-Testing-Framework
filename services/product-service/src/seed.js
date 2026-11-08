/**
 * Seeds the product catalog with demo data. Run with: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/product-service";

const SEED_PRODUCTS = [
  { name: "Wireless Mouse", category: "Electronics", price: 19.99, stock: 150, sku: "ELEC-MOUSE-001", description: "Ergonomic 2.4GHz wireless mouse." },
  { name: "Mechanical Keyboard", category: "Electronics", price: 59.99, stock: 80, sku: "ELEC-KEYB-002", description: "RGB backlit mechanical keyboard, blue switches." },
  { name: "USB-C Hub", category: "Electronics", price: 34.5, stock: 120, sku: "ELEC-HUB-003", description: "7-in-1 USB-C hub with HDMI and SD card reader." },
  { name: "Running Shoes", category: "Footwear", price: 79.99, stock: 60, sku: "SHOE-RUN-004", description: "Lightweight breathable running shoes." },
  { name: "Leather Wallet", category: "Accessories", price: 24.99, stock: 200, sku: "ACC-WALLET-005", description: "Slim genuine leather bifold wallet." },
  { name: "Stainless Steel Water Bottle", category: "Home", price: 15.0, stock: 300, sku: "HOME-BOTTLE-006", description: "Insulated 750ml water bottle, keeps cold 24h." },
  { name: "Yoga Mat", category: "Fitness", price: 22.5, stock: 90, sku: "FIT-MAT-007", description: "Non-slip 6mm thick yoga mat." },
  { name: "Noise Cancelling Headphones", category: "Electronics", price: 129.99, stock: 45, sku: "ELEC-HEAD-008", description: "Over-ear ANC headphones, 30h battery." },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("[seed] Connected to MongoDB");

  for (const product of SEED_PRODUCTS) {
    await Product.updateOne({ sku: product.sku }, { $set: product }, { upsert: true });
  }

  console.log(`[seed] Upserted ${SEED_PRODUCTS.length} products`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
