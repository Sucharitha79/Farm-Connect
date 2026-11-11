
import { useEffect, useState } from "react";
import "./farmer.css";

function MyProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    farmName: "",
    address: "",
    city: "",
    state: "",
    pincode: ""
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedProfile = JSON.parse(
      localStorage.getItem("farmerProfile") || "{}"
    );

    const currentUser = JSON.parse(
      localStorage.getItem("currentUser") || "{}"
    );

    setProfile((previous) => ({
      ...previous,
      ...savedProfile,
      name: savedProfile.name || currentUser.name || "",
      email: savedProfile.email || currentUser.email || ""
    }));
  }, []);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const saveProfile = (e) => {
    e.preventDefault();

    if (!/^\d{10}$/.test(profile.phone)) {
      setMessage("Enter a valid 10-digit phone number.");
      return;
    }

    if (profile.pincode && !/^\d{6}$/.test(profile.pincode)) {
      setMessage("Enter a valid 6-digit PIN code.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(profile.email)) {
      setMessage("Enter a valid email address.");
      return;
    }

    localStorage.setItem("farmerProfile", JSON.stringify(profile));

    const currentUser = JSON.parse(
      localStorage.getItem("currentUser") || "{}"
    );

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        ...currentUser,
        name: profile.name,
        email: profile.email
      })
    );

    setMessage("Profile updated successfully!");
  };

  return (
    <div className="farmer-page">
      <h2>My Profile</h2>
      <p className="page-description">
        Update your personal and farm information.
      </p>

      <form className="farmer-form" onSubmit={saveProfile}>
        <label>Farmer Name</label>
        <input
          name="name"
          value={profile.name}
          onChange={handleChange}
          required
          placeholder="Enter your name"
        />

        <label>Email Address</label>
        <input
          type="email"
          name="email"
          value={profile.email}
          onChange={handleChange}
          required
          placeholder="Enter email"
        />

        <label>Phone Number</label>
        <input
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          maxLength="10"
          required
          placeholder="10-digit phone number"
        />

        <label>Farm Name</label>
        <input
          name="farmName"
          value={profile.farmName}
          onChange={handleChange}
          placeholder="Enter farm name"
        />

        <label>Address</label>
        <textarea
          name="address"
          value={profile.address}
          onChange={handleChange}
          rows="3"
          placeholder="Enter address"
        />

        <label>City</label>
        <input
          name="city"
          value={profile.city}
          onChange={handleChange}
          placeholder="Enter city"
        />

        <label>State</label>
        <input
          name="state"
          value={profile.state}
          onChange={handleChange}
          placeholder="Enter state"
        />

        <label>PIN Code</label>
        <input
          name="pincode"
          value={profile.pincode}
          onChange={handleChange}
          maxLength="6"
          placeholder="6-digit PIN code"
        />

        {message && <p className="profile-message">{message}</p>}

        <button type="submit" className="primary-btn">
          Save Profile
        </button>
      </form>
    </div>
  );
}

export default MyProfile;
