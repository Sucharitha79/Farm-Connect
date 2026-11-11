
import { useEffect, useState } from "react";
import "./admin.css";

function AdminDashboard() {
  const [stats, setStats] = useState({
    farmers: 0,
    customers: 0,
    workers: 0,
    products: 0,
    orders: 0,
    equipment: 0
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/dashboard", {
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) throw new Error("Unable to load dashboard");
        return res.json();
      })
      .then(data => setStats(data))
      .catch(error => console.error(error));
  }, []);

  const cards = [
    ["Farmers", stats.farmers, "👨‍🌾"],
    ["Customers", stats.customers, "🛒"],
    ["Workers", stats.workers, "👷"],
    ["Products", stats.products, "🌾"],
    ["Orders", stats.orders, "📦"],
    ["Equipment", stats.equipment, "🚜"]
  ];

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to FarmConnect Super Admin Dashboard!</p>

      <div className="admin-stats">
        {cards.map((card, index) => (
          <div className="admin-stat-card" key={index}>
            <span>{card[2]}</span>
            <h3>{card[0]}</h3>
            <h2>{card[1]}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminDashboard;
