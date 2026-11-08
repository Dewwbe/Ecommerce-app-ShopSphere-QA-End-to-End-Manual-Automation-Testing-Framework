import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function loadCart() {
    setLoading(true);
    const res = await client.get("/api/cart");
    setCart(res.data);
    setLoading(false);
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(productId, quantity) {
    if (quantity < 1) return;
    await client.put(`/api/cart/items/${productId}`, { quantity });
    loadCart();
  }

  async function removeItem(productId) {
    await client.delete(`/api/cart/items/${productId}`);
    loadCart();
  }

  if (loading) return <p>Loading cart...</p>;

  return (
    <div className="cart-page">
      <h1>Your cart</h1>
      {cart.items.length === 0 && <p data-testid="empty-cart">Your cart is empty.</p>}

      <ul data-testid="cart-items">
        {cart.items.map((item) => (
          <li key={item.productId} data-testid="cart-item">
            <span>{item.name}</span>
            <input
              type="number"
              min="1"
              value={item.quantity}
              data-testid="cart-item-quantity"
              onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value, 10))}
            />
            <span>${(item.price * item.quantity).toFixed(2)}</span>
            <button data-testid="cart-item-remove" onClick={() => removeItem(item.productId)}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <p className="cart-total" data-testid="cart-total">
        Total: ${cart.total.toFixed(2)}
      </p>

      <button
        data-testid="checkout-button"
        disabled={cart.items.length === 0}
        onClick={() => navigate("/checkout")}
      >
        Proceed to checkout
      </button>
    </div>
  );
}
