import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./equipment.css";

function AddEquipment() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    name: "",
    category: "",
    description: "",
    pricePerDay: "",
    location: "",
    image: ""
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/equipment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...formData,
            pricePerDay: Number(formData.pricePerDay)
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to add equipment");
      }

      setMessage("Equipment added successfully!");

      setTimeout(() => {
        navigate("/equipment/available");
      }, 1000);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="equipment-page">
      <h1>Add Equipment</h1>
      <p className="equipment-subtitle">
        Anyone can list their farming equipment here.
      </p>

      {message && <p className="equipment-message">{message}</p>}

      <form className="equipment-form" onSubmit={handleSubmit}>
        <h3>Owner Details</h3>

        <label>Your Name</label>
        <input
          name="ownerName"
          value={formData.ownerName}
          onChange={handleChange}
          placeholder="Enter your name"
          required
        />

        <label>Contact Number</label>
        <input
          type="tel"
          name="ownerPhone"
          value={formData.ownerPhone}
          onChange={handleChange}
          placeholder="Enter contact number"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          name="ownerEmail"
          value={formData.ownerEmail}
          onChange={handleChange}
          placeholder="Enter email address"
        />

        <h3>Equipment Details</h3>

        <label>Equipment Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Example: Tractor"
          required
        />

        <label>Category</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
        >
          <option value="">Select Category</option>
          <option value="Tractor">Tractor</option>
          <option value="Harvester">Harvester</option>
          <option value="Sprayer">Sprayer</option>
          <option value="Plough">Plough</option>
          <option value="Seeder">Seeder</option>
          <option value="Water Pump">Water Pump</option>
          <option value="Other">Other</option>
        </select>

        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your equipment"
          required
        />

        <label>Rental Price Per Day (₹)</label>
        <input
          type="number"
          name="pricePerDay"
          min="0"
          value={formData.pricePerDay}
          onChange={handleChange}
          placeholder="Enter price"
          required
        />

        <label>Location</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Enter equipment location"
          required
        />

        <label>Equipment Image URL</label>
        <input
          type="url"
          name="image"
          value={formData.image}
          onChange={handleChange}
          placeholder="Paste image URL"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "Add Equipment"}
        </button>
      </form>
    </div>
  );
}

export default AddEquipment;