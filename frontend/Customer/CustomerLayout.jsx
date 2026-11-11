
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./customer.css";

function CustomerLayout() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
      setCustomer(user);
    } catch {
      setCustomer({});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "13px",
    margin: "6px 0",
    borderRadius: "8px",
    textDecoration: "none",
    color: "white",
    backgroundColor: isActive ? "#15803d" : "transparent"
  });

  return (
    <div className="customer-layout">
      <aside className="customer-sidebar">
        <h2>🌱 FarmConnect</h2>
        <p>Welcome, {customer?.name || "Customer"}</p>

        <NavLink to="/customer/dashboard" style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/customer/products" style={linkStyle}>
          Browse Products
        </NavLink>

        <NavLink to="/customer/cart" style={linkStyle}>
          My Cart
        </NavLink>

        <NavLink to="/customer/orders" style={linkStyle}>
          My Orders
        </NavLink>

        <NavLink to="/customer/profile" style={linkStyle}>
          My Profile
        </NavLink>

        <button onClick={handleLogout} className="customer-logout">
          Logout
        </button>
      </aside>

      <main className="customer-main">
        <header className="customer-header">
          <h2>Customer Dashboard</h2>
        </header>

        <section className="customer-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default CustomerLayout;
