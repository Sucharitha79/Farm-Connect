
import { useEffect, useState } from "react";
import "./customer.css";

function BrowseProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/products");

        if (!response.ok) {
          throw new Error("Unable to fetch products");
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const addToCart = async (product) => {
    try {
      const response = await fetch("http://localhost:5000/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      });

      if (!response.ok) {
        throw new Error("Unable to add product");
      }

      alert("Product added to cart successfully!");
    } catch (error) {
      console.error(error);
      alert("Unable to add product. Please try again.");
    }
  };

  const categories = [
    "All",
    ...new Set(products.map(product => product.category).filter(Boolean))
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="browse-container">

      <div className="browse-header">
        <div>
          <h1>Browse Products</h1>
          <p>Fresh products directly from farmers 🌱</p>
        </div>

        <span className="product-count">
          {filteredProducts.length} Products
        </span>
      </div>

      <div className="browse-filters">
        <input
          type="text"
          placeholder="Search crops..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {categories.map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="browse-message">Loading products...</p>
      ) : (
        <div className="browse-product-grid">

          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <span>🌾</span>
              <h2>No Products Found</h2>
              <p>Products will appear here when farmers add them.</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div className="browse-product-card" key={product.id}>

                <div className="browse-image">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="no-image">🌱</div>
                  )}
                </div>

                <div className="browse-product-info">

                  <span className="product-category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>

                  <p className="product-description">
                    {product.description}
                  </p>

                  <p className="product-quantity">
                    Available Quantity: {product.quantity}
                  </p>

                  <div className="browse-product-bottom">
                    <h3>₹{product.price}</h3>

                    <button
                      onClick={() => addToCart(product)}
                      disabled={Number(product.quantity) <= 0}
                    >
                      {Number(product.quantity) <= 0
                        ? "Out of Stock"
                        : "Add to Cart"}
                    </button>
                  </div>

                </div>
              </div>
            ))
          )}

        </div>
      )}
    </div>
  );
}

export default BrowseProducts;
