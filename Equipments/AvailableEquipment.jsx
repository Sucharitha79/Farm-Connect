import { useEffect, useState } from "react";
import "./equipment.css";

function AvailableEquipment() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [requester, setRequester] = useState({
    name: "",
    phone: "",
    email: "",
    days: "1"
  });
  const [message, setMessage] = useState("");

  const fetchEquipment = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/equipment"
      );

      if (!response.ok) {
        throw new Error("Unable to load equipment");
      }

      setEquipment(await response.json());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const categories = [
    "All",
    ...new Set(equipment.map(item => item.category).filter(Boolean))
  ];

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name
      ?.toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || item.category === category;

    return (
      matchesSearch &&
      matchesCategory &&
      (item.status || "Available") === "Available"
    );
  });

  const submitRequest = async (e) => {
    e.preventDefault();

    try {
      const id = selected.id || selected._id;

      const response = await fetch(
        `http://localhost:5000/api/equipment/${id}/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...requester,
            days: Number(requester.days)
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      setMessage("Equipment request submitted successfully!");
      setSelected(null);
      setRequester({
        name: "",
        phone: "",
        email: "",
        days: "1"
      });

    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="equipment-page">
      <h1>Available Equipment</h1>
      <p className="equipment-subtitle">
        Browse farming equipment available for rent.
      </p>

      {message && <p className="equipment-message">{message}</p>}

      <div className="equipment-filters">
        <input
          placeholder="Search equipment..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          {categories.map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading equipment...</p>
      ) : filteredEquipment.length === 0 ? (
        <p className="equipment-empty">No available equipment found.</p>
      ) : (
        <div className="equipment-grid">
          {filteredEquipment.map(item => (
            <div
              className="equipment-card"
              key={item.id || item._id}
            >
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <div className="equipment-no-image">🚜</div>
              )}

              <div className="equipment-card-info">
                <h3>{item.name}</h3>
                <p><strong>Category:</strong> {item.category}</p>
                <p><strong>Owner:</strong> {item.ownerName}</p>
                <p><strong>Location:</strong> {item.location}</p>
                <p><strong>Price:</strong> ₹{item.pricePerDay} / day</p>
                <p>{item.description}</p>

                <button onClick={() => setSelected(item)}>
                  Request Equipment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="equipment-modal">
          <form className="equipment-request-form" onSubmit={submitRequest}>
            <button
              type="button"
              className="equipment-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>

            <h2>Request {selected.name}</h2>

            <label>Your Name</label>
            <input
              required
              value={requester.name}
              onChange={e => setRequester({
                ...requester,
                name: e.target.value
              })}
              placeholder="Enter your name"
            />

            <label>Contact Number</label>
            <input
              required
              type="tel"
              value={requester.phone}
              onChange={e => setRequester({
                ...requester,
                phone: e.target.value
              })}
              placeholder="Enter phone number"
            />

            <label>Email</label>
            <input
              type="email"
              value={requester.email}
              onChange={e => setRequester({
                ...requester,
                email: e.target.value
              })}
              placeholder="Enter email"
            />

            <label>Number of Days</label>
            <input
              type="number"
              min="1"
              required
              value={requester.days}
              onChange={e => setRequester({
                ...requester,
                days: e.target.value
              })}
            />

            <button type="submit">Submit Request</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default AvailableEquipment;