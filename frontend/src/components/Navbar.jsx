import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar" data-testid="navbar">
      <Link to="/" className="brand">ShopSphere</Link>
      <div className="nav-links">
        <Link to="/" data-testid="nav-products">Products</Link>
        {user && (
          <Link to="/cart" data-testid="nav-cart">
            Cart
          </Link>
        )}
        {user && (
          <Link to="/orders" data-testid="nav-orders">
            Orders
          </Link>
        )}
        {user ? (
          <>
            <span data-testid="nav-username">Hi, {user.firstName}</span>
            <button onClick={handleLogout} data-testid="logout-button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" data-testid="nav-login">Login</Link>
            <Link to="/register" data-testid="nav-register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
