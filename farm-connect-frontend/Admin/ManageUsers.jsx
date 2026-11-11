
import { useEffect, useState } from "react";
import "./admin.css";

function ManageUsers() {
  const [users, setUsers] = useState([]);

  const loadUsers = () => {
    fetch("http://localhost:5000/api/admin/users", {
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) throw new Error("Unable to load users");
        return res.json();
      })
      .then(data => setUsers(data))
      .catch(error => console.error(error));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    const response = await fetch(
      `http://localhost:5000/api/admin/users/${id}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    if (response.ok) {
      loadUsers();
    } else {
      alert("Unable to delete user");
    }
  };

  return (
    <div>
      <h1>Manage Users</h1>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map(user => (
              <tr key={user._id || user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button
                    onClick={() => deleteUser(user._id || user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan="4">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageUsers;
