
import { useEffect, useState } from "react";
import "./admin.css";

function AdminManager({ title, endpoint }) {
  const [items, setItems] = useState([]);

  const loadItems = () => {
    fetch(`http://localhost:5000/api/admin/${endpoint}`, {
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) throw new Error("Unable to load data");
        return res.json();
      })
      .then(data => setItems(data))
      .catch(error => console.error(error));
  };

  useEffect(() => {
    loadItems();
  }, [endpoint]);

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    const response = await fetch(
      `http://localhost:5000/api/admin/${endpoint}/${id}`,
      {
        method: "DELETE",
        credentials: "include"
      }
    );

    if (response.ok) {
      loadItems();
    } else {
      alert("Unable to delete item");
    }
  };

  return (
    <div>
      <h1>{title}</h1>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Details</th>
              <th>Information</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item._id || item.id || index}>
                <td>{item.name || item.title || item.productName || "Item"}</td>
                <td>{item.status || item.email || item.price || "Available"}</td>
                <td>
                  <button onClick={() => deleteItem(item._id || item.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="3">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminManager;
