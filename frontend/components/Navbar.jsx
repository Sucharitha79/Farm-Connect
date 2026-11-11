
import { Link } from "react-router-dom";


function Navbar() {
  return (
    <nav className="navbar">

      <Link to="/" className="logo">
        🌱 FarmConnect
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <a href="#about">About</a>
        <a href="#services">Services</a>
        <a href="#contact">Contact</a>
      </div>

      <div className="nav-buttons">

      

        <Link to="/login" className="btn-login">
          Login
        </Link>

        <Link to="/register" className="btn-register">
          Register
        </Link>

      </div>

    </nav>
  );
}

export default Navbar;
