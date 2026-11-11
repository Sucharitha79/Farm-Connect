
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./admin.css";

function AdminLayout() {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await fetch("http://localhost:5000/api/admin/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    navigate("/admin/login");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2>🌱 FarmConnect</h2>
        <p>Super Admin</p>

        <nav>
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/users">Manage Users</NavLink>
          <NavLink to="/admin/products">Manage Products</NavLink>
          <NavLink to="/admin/orders">Manage Orders</NavLink>
          <NavLink to="/admin/equipment">Manage Equipment</NavLink>
          <NavLink to="/admin/jobs">Manage Jobs</NavLink>
        </nav>

        <button onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2>Super Admin Panel</h2>
          <span>Administrator</span>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AdminLayout;
