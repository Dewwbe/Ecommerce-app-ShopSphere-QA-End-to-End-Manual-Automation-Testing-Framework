import { useEffect, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedMessage, setAddedMessage] = useState(null);

  async function loadProducts(query = "") {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/api/products", { params: query ? { search: query } : {} });
      setProducts(res.data.items);
    } catch (err) {
      setError("Could not load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    loadProducts(search);
  }

  async function addToCart(productId) {
    setAddedMessage(null);
    try {
      await client.post("/api/cart/items", { productId, quantity: 1 });
      setAddedMessage("Added to cart");
    } catch (err) {
      setAddedMessage(err.response?.data?.error || "Could not add to cart");
    }
  }

  return (
    <div className="products-page">
      <h1>Products</h1>
      <form onSubmit={handleSearch} className="search-form" data-testid="search-form">
        <input
          data-testid="search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" data-testid="search-submit">Search</button>
      </form>

      {loading && <p>Loading products...</p>}
      {error && <p className="error">{error}</p>}
      {addedMessage && <p data-testid="add-to-cart-message">{addedMessage}</p>}

      <div className="product-grid" data-testid="product-grid">
        {products.map((p) => (
          <div className="product-card" key={p._id} data-testid="product-card">
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <p className="price" data-testid="product-price">${p.price.toFixed(2)}</p>
            <p className="stock">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
            {user && (
              <button
                data-testid="add-to-cart-button"
                disabled={p.stock === 0}
                onClick={() => addToCart(p._id)}
              >
                Add to cart
              </button>
            )}
          </div>
        ))}
      </div>
      {!loading && products.length === 0 && <p data-testid="no-products">No products found.</p>}
    </div>
  );
}
