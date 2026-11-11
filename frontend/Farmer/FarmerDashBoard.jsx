
import { useNavigate } from "react-router-dom";

function FarmerDashboard() {
  const navigate = useNavigate();

  let farmerName = "Farmer";

  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    farmerName = user.name || "Farmer";
  } catch {
    farmerName = "Farmer";
  }

  const orders = [
    {
      id: "#FC1001",
      product: "Fresh Tomatoes",
      customer: "Rahul Kumar",
      date: "10 Nov 2026",
      amount: "₹1,500",
      status: "Delivered"
    },
    {
      id: "#FC1002",
      product: "Organic Rice",
      customer: "Priya Sharma",
      date: "09 Nov 2026",
      amount: "₹2,800",
      status: "Processing"
    },
    {
      id: "#FC1003",
      product: "Fresh Onions",
      customer: "Arun Reddy",
      date: "08 Nov 2026",
      amount: "₹950",
      status: "Pending"
    }
  ];

  return (
    <div className="dashboard-content">

      {/* Top Bar */}
      <header className="farmer-topbar">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome back! Here's what's happening with your farm.</p>
        </div>

        <div className="farmer-top-actions">
          <button
            className="notification-button"
            aria-label="Notifications"
            title="Notifications"
          >
            ♧
            <span></span>
          </button>

          <div className="farmer-user">
            <div className="farmer-avatar">
              {farmerName.charAt(0).toUpperCase()}
            </div>

            <div>
              <h4>{farmerName}</h4>
              <p>Farmer Account</p>
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner */}
      <section className="farmer-welcome-banner">
        <div>
          <span className="welcome-label">FARMER OVERVIEW</span>

          <h1>Good day, {farmerName}! 👋</h1>

          <p>
            Manage your products, track your orders and grow your
            agricultural business with Farm Connect.
          </p>

          <button
            onClick={() => navigate("/farmer/add-product")}
            className="welcome-add-button"
          >
            + Add New Product
          </button>
        </div>

        <div className="welcome-illustration">🌾</div>
      </section>

      {/* Statistics */}
      <section className="farmer-statistics">

        <div className="farmer-stat">
          <div className="stat-top">
            <span>Total Products</span>
            <div className="stat-icon green">🌾</div>
          </div>
          <h2>25</h2>
          <p><strong>+5</strong> added this month</p>
        </div>

        <div className="farmer-stat">
          <div className="stat-top">
            <span>Total Orders</span>
            <div className="stat-icon blue">📦</div>
          </div>
          <h2>48</h2>
          <p><strong>+12%</strong> compared to last month</p>
        </div>

        <div className="farmer-stat">
          <div className="stat-top">
            <span>Total Earnings</span>
            <div className="stat-icon orange">₹</div>
          </div>
          <h2>₹32,500</h2>
          <p><strong>+8%</strong> compared to last month</p>
        </div>

        <div className="farmer-stat">
          <div className="stat-top">
            <span>Total Customers</span>
            <div className="stat-icon purple">👥</div>
          </div>
          <h2>36</h2>
          <p><strong>+4</strong> new customers this month</p>
        </div>

      </section>

      {/* Sales and Product Summary */}
      <section className="farmer-dashboard-grid">

        {/* Sales Overview */}
        <div className="farmer-panel sales-panel">

          <div className="panel-heading">
            <div>
              <h3>Sales Overview</h3>
              <p>Your sales performance this week</p>
            </div>

            <span className="period-label">This Week</span>
          </div>

          <div className="sales-total">
            <h2>₹12,800</h2>
            <span>↑ 12.5%</span>
          </div>

          <div className="sales-chart">
            {[
              { day: "Mon", height: "45%" },
              { day: "Tue", height: "65%" },
              { day: "Wed", height: "50%" },
              { day: "Thu", height: "85%" },
              { day: "Fri", height: "60%" },
              { day: "Sat", height: "100%" },
              { day: "Sun", height: "75%" }
            ].map((item) => (
              <div className="chart-column" key={item.day}>
                <div className="chart-bar-area">
                  <div
                    className="chart-bar"
                    style={{ height: item.height }}
                  ></div>
                </div>
                <span>{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Summary */}
        <div className="farmer-panel product-panel">

          <div className="panel-heading">
            <div>
              <h3>Product Summary</h3>
              <p>Overview of your listed products</p>
            </div>

            <button
              className="text-link"
              onClick={() => navigate("/farmer/products")}
            >
              View All
            </button>
          </div>

          <div className="product-summary-row">
            <div className="product-summary-icon">🍅</div>

            <div className="product-summary-info">
              <div>
                <strong>Tomatoes</strong>
                <span>12 products</span>
              </div>

              <div className="summary-progress">
                <div style={{ width: "75%" }}></div>
              </div>
            </div>
          </div>

          <div className="product-summary-row">
            <div className="product-summary-icon">🌾</div>

            <div className="product-summary-info">
              <div>
                <strong>Rice</strong>
                <span>8 products</span>
              </div>

              <div className="summary-progress">
                <div style={{ width: "55%" }}></div>
              </div>
            </div>
          </div>

          <div className="product-summary-row">
            <div className="product-summary-icon">🧅</div>

            <div className="product-summary-info">
              <div>
                <strong>Onions</strong>
                <span>5 products</span>
              </div>

              <div className="summary-progress">
                <div style={{ width: "35%" }}></div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Recent Orders */}
      <section className="farmer-panel recent-orders">

        <div className="panel-heading">
          <div>
            <h3>Recent Orders</h3>
            <p>Keep track of your latest customer orders</p>
          </div>

          <button
            className="text-link"
            onClick={() => navigate("/farmer/orders")}
          >
            View All Orders →
          </button>
        </div>

        <div className="orders-table-wrapper">
          <table className="farmer-orders-table">

            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Customer</th>
                <th>Order Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.product}</td>
                  <td>{order.customer}</td>
                  <td>{order.date}</td>
                  <td><strong>{order.amount}</strong></td>

                  <td>
                    <span
                      className={`order-status ${order.status.toLowerCase()}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </section>

      <footer className="farmer-footer">
        © 2026 Farm Connect. Empowering Farmers, Connecting Markets.
      </footer>

    </div>
  );
}

export default FarmerDashboard;
