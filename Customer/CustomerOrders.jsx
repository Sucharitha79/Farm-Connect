
function CustomerOrders() {
  const orders = JSON.parse(localStorage.getItem("orders") || "[]");

  return (
    <div className="customer-page">
      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <p>You have not placed any orders yet.</p>
      ) : (
        orders.map(order => (
          <div className="order-card" key={order.id}>
            <h3>Order ID: {order.id}</h3>
            <p>Date: {order.date}</p>
            <p>Total: ₹{order.total}</p>
            <p>Status: {order.status}</p>

            {order.items.map((item, index) => (
              <p key={index}>
                {item.name} × {item.quantity}
              </p>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default CustomerOrders;
