
import { useNavigate } from "react-router-dom";

function CustomerDashboard() {
  const navigate = useNavigate();

  let customerName = "Customer";

  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    customerName = user.name || "Customer";
  } catch {
    customerName = "Customer";
  }

  return (
    <div className="customer-dashboard">
      <div className="customer-welcome">
        <h1>Welcome, {customerName}! 👋</h1>
        <p>Discover fresh products directly from farmers.</p>

        <button onClick={() => navigate("/customer/products")}>
          Explore Products
        </button>
      </div>

      <div className="customer-stats">
        <div className="customer-stat-card">
          <h3>🛒</h3>
          <h2>0</h2>
          <p>Cart Items</p>
        </div>

        <div className="customer-stat-card">
          <h3>📦</h3>
          <h2>0</h2>
          <p>Total Orders</p>
        </div>

        <div className="customer-stat-card">
          <h3>❤️</h3>
          <h2>0</h2>
          <p>Favorite Products</p>
        </div>
      </div>

      <div className="customer-section">
        <h2>Why Choose Farm Connect?</h2>
        <p>Buy fresh agricultural products directly from farmers.</p>
        <p>Support local farmers and enjoy quality products.</p>
      </div>
    </div>
  );
}

export default CustomerDashboard;
