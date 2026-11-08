import { useEffect, useState } from "react";
import client from "../api/client";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/api/orders").then((res) => {
      setOrders(res.data.orders);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div className="orders-page">
      <h1>Your orders</h1>
      {orders.length === 0 && <p data-testid="no-orders">You haven't placed any orders yet.</p>}
      <ul data-testid="orders-list">
        {orders.map((order) => (
          <li key={order._id} data-testid="order-row">
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
            <span data-testid="order-status">{order.status}</span>
            <span>${order.total.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
