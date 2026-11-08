const Stripe = require("stripe");

// A single lazily-created Stripe client, so tests can run without a real key present.
let stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set. Add it to services/payment-service/.env");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return stripeInstance;
}

module.exports = { getStripe };
