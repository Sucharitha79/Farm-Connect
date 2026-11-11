import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./equipment.css";

function EquipmentDashboard() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/equipment"
        );

        if (!response.ok) {
          throw new Error("Unable to fetch equipment");
        }

        const data = await response.json();
        setEquipment(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

  const available = equipment.filter(
    item => item.status === "Available"
  ).length;

  return (
    <div className="equipment-page">
      <section className="equipment-welcome">
        <h1>Welcome to FarmConnect Equipment Marketplace! 🚜</h1>
        <p>
          Buy, rent, list and discover farming equipment in one place.
          Everyone is welcome!
        </p>

        <div className="equipment-welcome-buttons">
          <button onClick={() => navigate("/equipment/available")}>
            Explore Equipment
          </button>

          <button onClick={() => navigate("/equipment/add")}>
            Add Your Equipment
          </button>
        </div>
      </section>

      <div className="equipment-stats">
        <div className="equipment-stat-card">
          <h3>{loading ? "..." : equipment.length}</h3>
          <p>Total Listings</p>
        </div>

        <div className="equipment-stat-card">
          <h3>{loading ? "..." : available}</h3>
          <p>Available Equipment</p>
        </div>
      </div>

      <section className="equipment-section">
        <h2>What Can You Do?</h2>

        <div className="equipment-actions">
          <button onClick={() => navigate("/equipment/available")}>
            Browse Equipment
          </button>

          <button onClick={() => navigate("/equipment/add")}>
            List Equipment
          </button>

          <button onClick={() => navigate("/equipment/my-equipment")}>
            My Listings
          </button>
        </div>
      </section>
    </div>
  );
}

export default EquipmentDashboard;