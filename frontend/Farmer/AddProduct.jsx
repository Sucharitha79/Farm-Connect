
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./farmer.css";

function AddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "Kg",
    price: "",
    description: "",
    image: ""
  });

  useEffect(() => {
    if (id) {
      const products = JSON.parse(
        localStorage.getItem("farmerProducts") || "[]"
      );
      const selected = products.find((item) => item.id === Number(id));

      if (selected) {
        setProduct(selected);
      }
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
  };

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setProduct({ ...product, image: reader.result });
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !product.name.trim() ||
      !product.category ||
      !product.quantity ||
      !product.price ||
      !product.description.trim()
    ) {
      alert("Please fill all required fields.");
      return;
    }

    if (Number(product.quantity) <= 0 || Number(product.price) <= 0) {
      alert("Quantity and price must be greater than zero.");
      return;
    }

    const products = JSON.parse(
      localStorage.getItem("farmerProducts") || "[]"
    );

    if (id) {
      const updated = products.map((item) =>
        item.id === Number(id) ? { ...product, id: Number(id) } : item
      );

      localStorage.setItem("farmerProducts", JSON.stringify(updated));
      alert("Product updated successfully!");
    } else {
      const newProduct = {
        ...product,
        id: Date.now(),
        quantity: Number(product.quantity),
        price: Number(product.price)
      };

      localStorage.setItem(
        "farmerProducts",
        JSON.stringify([...products, newProduct])
      );

      alert("Product added successfully!");
    }

    navigate("/farmer/products");
  };

  return (
    <div className="farmer-page">
      <h2>{id ? "Edit Product" : "Add New Product"}</h2>
      <p className="page-description">
        Enter your crop details below.
      </p>

      <form className="farmer-form" onSubmit={handleSubmit}>
        <label>Crop Name</label>
        <input
          name="name"
          value={product.name}
          onChange={handleChange}
          placeholder="Enter crop name"
          required
        />

        <label>Category</label>
        <select
          name="category"
          value={product.category}
          onChange={handleChange}
          required
        >
          <option value="">Select category</option>
          <option value="Vegetables">Vegetables</option>
          <option value="Fruits">Fruits</option>
          <option value="Grains">Grains</option>
          <option value="Pulses">Pulses</option>
          <option value="Other">Other</option>
        </select>

        <label>Quantity</label>
        <div className="quantity-row">
          <input
            type="number"
            name="quantity"
            value={product.quantity}
            onChange={handleChange}
            placeholder="Enter quantity"
            min="0.01"
            step="any"
            required
          />

          <select name="unit" value={product.unit} onChange={handleChange}>
            <option>Kg</option>
            <option>Quintal</option>
            <option>Ton</option>
            <option>Piece</option>
            <option>Dozen</option>
          </select>
        </div>

        <label>Price (₹)</label>
        <input
          type="number"
          name="price"
          value={product.price}
          onChange={handleChange}
          placeholder="Enter price"
          min="0.01"
          step="any"
          required
        />

        <label>Description</label>
        <textarea
          name="description"
          value={product.description}
          onChange={handleChange}
          placeholder="Describe your crop"
          rows="4"
          required
        />

        <label>Upload Crop Image</label>
        <input type="file" accept="image/*" onChange={handleImage} />

        {product.image && (
          <img
            src={product.image}
            alt="Crop preview"
            className="product-preview"
          />
        )}

        <button type="submit" className="primary-btn">
          {id ? "Update Product" : "Add Product"}
        </button>
      </form>
    </div>
  );
}

export default AddProduct;
