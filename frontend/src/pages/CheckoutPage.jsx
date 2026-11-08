import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import client from "../api/client";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function PaymentForm({ orderId, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message);
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      onPaid();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} data-testid="payment-form">
      <PaymentElement />
      {error && <p className="error" data-testid="payment-error">{error}</p>}
      <button type="submit" data-testid="pay-button" disabled={!stripe || submitting}>
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [status, setStatus] = useState("creating-order"); // creating-order | awaiting-payment | paid | error
  const [error, setError] = useState(null);
  const [address, setAddress] = useState({ line1: "", city: "", postalCode: "", country: "" });
  const [orderPlaced, setOrderPlaced] = useState(false);

  async function placeOrder(e) {
    e.preventDefault();
    setStatus("creating-order");
    setError(null);
    try {
      const res = await client.post("/api/orders", { shippingAddress: address });
      setOrder(res.data.order);
      setOrderPlaced(true);
      await pollForPaymentIntent(res.data.order._id);
    } catch (err) {
      setError(err.response?.data?.error || "Could not place order");
      setStatus("error");
    }
  }

  async function pollForPaymentIntent(orderId, attempts = 0) {
    try {
      const res = await client.get(`/api/payments/${orderId}`);
      setClientSecret(res.data.clientSecret);
      setStatus("awaiting-payment");
    } catch (err) {
      // The payment-service consumes order.created asynchronously over RabbitMQ,
      // so the PaymentIntent may not exist the instant the order is created.
      if (attempts < 10) {
        setTimeout(() => pollForPaymentIntent(orderId, attempts + 1), 1000);
      } else {
        setError("Payment is taking longer than expected to initialize. Please refresh and try again.");
        setStatus("error");
      }
    }
  }

  if (!orderPlaced) {
    return (
      <div className="checkout-page">
        <h1>Checkout</h1>
        <form onSubmit={placeOrder} data-testid="address-form">
          <label htmlFor="line1">Address line</label>
          <input id="line1" data-testid="address-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} required />

          <label htmlFor="city">City</label>
          <input id="city" data-testid="address-city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required />

          <label htmlFor="postalCode">Postal code</label>
          <input id="postalCode" data-testid="address-postal" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} required />

          <label htmlFor="country">Country</label>
          <input id="country" data-testid="address-country" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} required />

          {error && <p className="error" data-testid="order-error">{error}</p>}
          <button type="submit" data-testid="place-order-button">Place order</button>
        </form>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      {order && <p data-testid="order-total">Order total: ${order.total.toFixed(2)}</p>}

      {status === "creating-order" && <p>Preparing your order...</p>}
      {status === "error" && <p className="error" data-testid="checkout-error">{error}</p>}

      {status === "awaiting-payment" && clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm orderId={order._id} onPaid={() => setStatus("paid")} />
        </Elements>
      )}

      {status === "awaiting-payment" && !stripePromise && (
        <p data-testid="stripe-not-configured">
          Stripe publishable key is not configured. Set VITE_STRIPE_PUBLISHABLE_KEY to enable the payment form.
        </p>
      )}

      {status === "paid" && <p data-testid="payment-success">Payment successful! Your order is confirmed.</p>}
    </div>
  );
}
