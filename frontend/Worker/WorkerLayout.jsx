import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./worker.css";

function WorkerLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div className="worker-layout">
      <aside className="worker-sidebar">
        <h2>🌱 FarmConnect</h2>
        <p>Worker Panel</p>

        <nav>
          <NavLink to="/worker/dashboard">Dashboard</NavLink>
          <NavLink to="/worker/jobs">Available Jobs</NavLink>
          <NavLink to="/worker/tasks">My Tasks</NavLink>
          <NavLink to="/worker/profile">My Profile</NavLink>
        </nav>

        <button className="worker-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="worker-main">
        <header className="worker-header">
          <h2>Worker Dashboard</h2>
        </header>

        <div className="worker-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default WorkerLayout;