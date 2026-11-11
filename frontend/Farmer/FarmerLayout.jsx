import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./farmer.css";

function FarmerLayout() {
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("currentUser"));
    setFarmer(user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/login");
  };

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "12px",
    margin: "5px 0",
    borderRadius: "6px",
    textDecoration: "none",
    color: "white",
    backgroundColor: isActive ? "#15803d" : "transparent",
  });

  return (
    <div className="farmer-layout">
      <aside className="farmer-sidebar">
        <h2>🌱 FarmConnect</h2>

        <p>Welcome, {farmer?.name || "Farmer"}</p>

        <NavLink to="/farmer/dashboard" style={linkStyle}>
          Dashboard
        </NavLink>

        <NavLink to="/farmer/add-product" style={linkStyle}>
          Add Product
        </NavLink>

        <NavLink to="/farmer/products" style={linkStyle}>
          My Products
        </NavLink>

        <NavLink to="/farmer/orders" style={linkStyle}>
          Orders
        </NavLink>

        <NavLink to="/farmer/profile" style={linkStyle}>
          My Profile
        </NavLink>

        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </aside>

      <main className="farmer-main">
        <header className="farmer-header">
          <h2>Farmer Dashboard</h2>
        </header>

        <section className="farmer-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default FarmerLayout;