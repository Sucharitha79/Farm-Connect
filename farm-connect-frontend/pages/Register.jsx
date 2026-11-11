
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const handleSendOTP = () => {
    if (!email.trim()) {
      alert("Please enter your email");
      return;
    }

    setVerified(false);
    setOtp("");
    alert("Demo OTP is 123456");
  };

  const handleVerifyOTP = () => {
    if (otp === "123456") {
      setVerified(true);
      alert("Email verified successfully!");
    } else {
      setVerified(false);
      alert("Invalid OTP");
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();

    if (!role || !name.trim() || !email.trim() || !password) {
      alert("Please fill all fields");
      return;
    }

    if (!verified) {
      alert("Please verify your email");
      return;
    }

    if (!Object.values(rules).every(Boolean)) {
      alert("Please satisfy all password requirements");
      return;
    }

    alert("Registration successful!");
    navigate("/login");
  };

  const PasswordRule = ({ valid, children }) => (
    <p className={valid ? "rule-valid" : "rule-invalid"}>
      <span className="rule-circle">
        {valid ? "✓" : ""}
      </span>
      {children}
    </p>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1 className="auth-logo">
          🌱 FarmConnect
        </h1>

        <h2 className="auth-heading">
          Create Account
        </h2>

        <p className="auth-subtitle">
          Register to get started
        </p>

        <form onSubmit={handleRegister}>

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
            <label>Full Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>

            <div className="email-otp">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setVerified(false);
                  setOtp("");
                }}
                required
              />

              <button
                type="button"
                className="otp-send"
                onClick={handleSendOTP}
              >
                Send OTP
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Enter OTP</label>

            <div className="email-otp">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  setVerified(false);
                }}
              />

              <button
                type="button"
                className="otp-send"
                onClick={handleVerifyOTP}
              >
                Verify
              </button>
            </div>
          </div>

          {verified && (
            <p className="verified-message">
              ✓ Email verified successfully
            </p>
          )}

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setShowPasswordRules(e.target.value.length > 0);
              }}
              required
            />

            {showPasswordRules && (
              <div className="password-rules">

                <PasswordRule valid={rules.length}>
                  At least 8 characters
                </PasswordRule>

                <PasswordRule valid={rules.uppercase}>
                  One uppercase letter
                </PasswordRule>

                <PasswordRule valid={rules.lowercase}>
                  One lowercase letter
                </PasswordRule>

                <PasswordRule valid={rules.number}>
                  One number
                </PasswordRule>

                <PasswordRule valid={rules.special}>
                  One special character
                </PasswordRule>

              </div>
            )}
          </div>

          <button type="submit" className="auth-submit">
            Register
          </button>

        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>

      </div>
    </div>
  );
}

export default Register;
