
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!role || !email.trim() || !password) {
      alert("Please fill all fields");
      return;
    }

    if (role === "farmer") {
      navigate("/farmer/dashboard");
    } else if (role === "customer") {
      navigate("/customer/dashboard");
    } else if (role === "worker") {
      navigate("/worker/dashboard");
    } else if (role === "equipment") {
      navigate("/equipment/dashboard");
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-card">

        <h1 className="auth-logo">
          🌱 FarmConnect
        </h1>

        <h2 className="auth-heading">
          Welcome Back!
        </h2>

        <p className="auth-subtitle">
          Login to your account
        </p>

        <form onSubmit={handleLogin}>

          <div className="form-group">
            <label>Select Your Role</label>

            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="">Choose your role</option>
              <option value="farmer">Farmer</option>
              <option value="customer">Customer</option>
              <option value="worker">Worker</option>
              <option value="equipment">Equipment Owner</option>
            </select>
          </div>

          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit">
            Login
          </button>

        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>

      </div>

    </div>
  );
}

export default Login;
