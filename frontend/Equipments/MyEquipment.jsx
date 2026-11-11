import { useState } from "react";
import "./equipment.css";

function MyEquipment() {
  const [phone, setPhone] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMyEquipment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/equipment/owner?phone=${encodeURIComponent(phone)}`
      );

      if (!response.ok) {
        throw new Error("Unable to find your equipment");
      }

      setEquipment(await response.json());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    setEditItem({
      ...editItem,
      [e.target.name]: e.target.value
    });
  };

  const updateEquipment = async (e) => {
    e.preventDefault();

    try {
      const id = editItem.id || editItem._id;

      const response = await fetch(
        `http://localhost:5000/api/equipment/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...editItem,
            pricePerDay: Number(editItem.pricePerDay),
            ownerPhone: phone
          })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update equipment");
      }

      setEquipment(previous =>
        previous.map(item =>
          (item.id || item._id) === id ? editItem : item
        )
      );

      setEditItem(null);
      setMessage("Equipment updated successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteEquipment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this equipment?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/equipment/${id}?phone=${encodeURIComponent(phone)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Unable to delete equipment");
      }

      setEquipment(previous =>
        previous.filter(item => (item.id || item._id) !== id)
      );

      setMessage("Equipment deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="equipment-page">
      <h1>My Equipment Listings</h1>
      <p className="equipment-subtitle">
        Find and manage equipment you have listed.
      </p>

      {message && <p className="equipment-message">{message}</p>}

      <form className="equipment-search-owner" onSubmit={fetchMyEquipment}>
        <input
          type="tel"
          placeholder="Enter the contact number used when listing"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Find My Equipment"}
        </button>
      </form>

      {editItem && (
        <form className="equipment-form" onSubmit={updateEquipment}>
          <h2>Edit Equipment</h2>

          <label>Equipment Name</label>
          <input
            name="name"
            value={editItem.name || ""}
            onChange={handleEditChange}
            required
          />

          <label>Category</label>
          <select
            name="category"
            value={editItem.category || ""}
            onChange={handleEditChange}
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
            value={editItem.description || ""}
            onChange={handleEditChange}
            required
          />

          <label>Price Per Day</label>
          <input
            type="number"
            min="0"
            name="pricePerDay"
            value={editItem.pricePerDay ?? ""}
            onChange={handleEditChange}
            required
          />

          <label>Location</label>
          <input
            name="location"
            value={editItem.location || ""}
            onChange={handleEditChange}
            required
          />

          <label>Image URL</label>
          <input
            type="url"
            name="image"
            value={editItem.image || ""}
            onChange={handleEditChange}
          />

          <button type="submit">Save Changes</button>
          <button
            type="button"
            className="equipment-secondary-button"
            onClick={() => setEditItem(null)}
          >
            Cancel
          </button>
        </form>
      )}

      {equipment.length > 0 && (
        <div className="equipment-grid">
          {equipment.map(item => {
            const id = item.id || item._id;

            return (
              <div className="equipment-card" key={id}>
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="equipment-no-image">🚜</div>
                )}

                <div className="equipment-card-info">
                  <h3>{item.name}</h3>
                  <p><strong>Category:</strong> {item.category}</p>
                  <p><strong>Price:</strong> ₹{item.pricePerDay} / day</p>
                  <p><strong>Location:</strong> {item.location}</p>

                  <button onClick={() => setEditItem({ ...item })}>
                    Edit
                  </button>

                  <button
                    className="equipment-delete"
                    onClick={() => deleteEquipment(id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyEquipment;