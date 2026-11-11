
import { useState } from "react";

function CustomerProfile() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "{}");
    } catch {
      return {};
    }
  });

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("currentUser", JSON.stringify(user));
    alert("Profile updated successfully!");
  };

  return (
    <div className="customer-page">
      <h1>My Profile</h1>

      <form className="customer-profile-form" onSubmit={handleSave}>
        <label>Name</label>
        <input
          name="name"
          value={user.name || ""}
          onChange={handleChange}
        />

        <label>Email</label>
        <input
          name="email"
          type="email"
          value={user.email || ""}
          onChange={handleChange}
        />

        <label>Phone</label>
        <input
          name="phone"
          value={user.phone || ""}
          onChange={handleChange}
        />

        <label>Address</label>
        <textarea
          name="address"
          value={user.address || ""}
          onChange={handleChange}
        />

        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
}

export default CustomerProfile;
