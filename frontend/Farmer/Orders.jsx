
import { useEffect, useState } from "react";
import "./farmer.css";

const sampleOrders = [
  {
    id: "FC1001",
    customer: "Rahul Kumar",
    product: "Fresh Tomatoes",
    quantity: "20 Kg",
    amount: 1000,
    date: "10 Nov 2026",
    status: "Pending"
  },
  {
    id: "FC1002",
    customer: "Priya Sharma",
    product: "Organic Rice",
    quantity: "50 Kg",
    amount: 2500,
    date: "09 Nov 2026",
    status: "Processing"
  },
  {
    id: "FC1003",
    customer: "Arun Reddy",
    product: "Fresh Onions",
    quantity: "15 Kg",
    amount: 750,
    date: "08 Nov 2026",
    status: "Delivered"
  }
];

function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("farmerOrders");

    if (saved) {
      setOrders(JSON.parse(saved));
    } else {
      localStorage.setItem("farmerOrders", JSON.stringify(sampleOrders));
      setOrders(sampleOrders);
    }
  }, []);

  const updateStatus = (id, status) => {
    const updated = orders.map((order) =>
      order.id === id ? { ...order, status } : order
    );

    setOrders(updated);
    localStorage.setItem("farmerOrders", JSON.stringify(updated));
  };

  const pending = orders.filter((o) => o.status === "Pending").length;
  const processing = orders.filter((o) => o.status === "Processing").length;
  const delivered = orders.filter((o) => o.status === "Delivered").length;

  return (
    <div className="farmer-page">
      <h2>Customer Orders</h2>
      <p className="page-description">View and manage customer orders.</p>

      <div className="order-stats">
        <div className="order-stat">
          <h3>{orders.length}</h3>
          <p>Total Orders</p>
        </div>
        <div className="order-stat">
          <h3>{pending}</h3>
          <p>Pending</p>
        </div>
        <div className="order-stat">
          <h3>{processing}</h3>
          <p>Processing</p>
        </div>
        <div className="order-stat">
          <h3>{delivered}</h3>
          <p>Delivered</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.product}</td>
                <td>{order.quantity}</td>
                <td>₹{order.amount}</td>
                <td>{order.date}</td>
                <td>
                  <select
                    className="status-select"
                    value={order.status}
                    onChange={(e) =>
                      updateStatus(order.id, e.target.value)
                    }
                  >
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Orders;
