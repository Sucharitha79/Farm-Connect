import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./equipment.css";

function EquipmentLayout() {
  const navigate = useNavigate();

  return (
    <div className="equipment-layout">
      <aside className="equipment-sidebar">
        <h2>🚜 FarmConnect</h2>
        <p>Equipment Marketplace</p>

        <nav>
          <NavLink to="/equipment/dashboard">Dashboard</NavLink>
          <NavLink to="/equipment/available">Available Equipment</NavLink>
          <NavLink to="/equipment/add">Add Equipment</NavLink>
          <NavLink to="/equipment/my-equipment">My Listings</NavLink>
        </nav>

        <button
          className="equipment-home"
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>
      </aside>

      <main className="equipment-main">
        <header className="equipment-header">
          <h2>Equipment Marketplace</h2>
        </header>

        <div className="equipment-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default EquipmentLayout;