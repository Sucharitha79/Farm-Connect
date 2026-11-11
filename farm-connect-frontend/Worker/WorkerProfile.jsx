import { useEffect, useState } from "react";
import "./worker.css";

function WorkerProfile() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    skills: ""
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/workers/profile",
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Unable to fetch profile");
        }

        const data = await response.json();

        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          skills: data.skills || ""
        });
      } catch (error) {
        console.error(error);
        setMessage("Unable to load profile.");
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5000/api/workers/profile",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(profile)
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update profile");
      }

      setMessage("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Unable to update profile.");
    }
  };

  return (
    <div className="worker-page">
      <h1>My Profile</h1>
      <p className="worker-subtitle">View and update your details.</p>

      {message && <p className="worker-message">{message}</p>}

      <form className="worker-profile-form" onSubmit={handleSubmit}>
        <label>Full Name</label>
        <input
          name="name"
          value={profile.name}
          onChange={handleChange}
          placeholder="Enter your name"
          required
        />

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={profile.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />

        <label>Phone Number</label>
        <input
          name="phone"
          value={profile.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
        />

        <label>Address</label>
        <textarea
          name="address"
          value={profile.address}
          onChange={handleChange}
          placeholder="Enter your address"
        />

        <label>Skills</label>
        <input
          name="skills"
          value={profile.skills}
          onChange={handleChange}
          placeholder="Example: Harvesting, planting"
        />

        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
}

export default WorkerProfile;