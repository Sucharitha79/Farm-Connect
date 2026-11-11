
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./farmer.css";

function MyProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(
      localStorage.getItem("farmerProducts") || "[]"
    );
    setProducts(saved);
  }, []);

  const deleteProduct = (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    const updated = products.filter((item) => item.id !== id);
    setProducts(updated);
    localStorage.setItem("farmerProducts", JSON.stringify(updated));
  };

  return (
    <div className="farmer-page">
      <div className="page-heading">
        <div>
          <h2>My Products</h2>
          <p className="page-description">Manage your listed crops.</p>
        </div>

        <button
          className="primary-btn"
          onClick={() => navigate("/farmer/add-product")}
        >
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <h3>No products added yet</h3>
          <p>Add your first crop to get started.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((item) => (
            <div className="product-card" key={item.id}>
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <div className="product-placeholder">🌾</div>
              )}

              <div className="product-card-content">
                <span className="category-tag">{item.category}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p>
                  Quantity: {item.quantity} {item.unit}
                </p>
                <h3 className="product-price">₹{item.price}</h3>

                <div className="product-actions">
                  <button
                    className="edit-btn"
                    onClick={() =>
                      navigate(`/farmer/edit-product/${item.id}`)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => deleteProduct(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyProducts;
