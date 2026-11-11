
import { Link } from "react-router-dom";

function Home() {
  const services = [
    {
      icon: "👨‍🌾",
      title: "Farmers",
      description:
        "Sell crops directly to customers and get better market opportunities."
    },
    {
      icon: "🛒",
      title: "Customers",
      description:
        "Purchase fresh agricultural products directly from farmers."
    },
    {
      icon: "👷",
      title: "Workers",
      description:
        "Discover agricultural jobs and connect with local farmers."
    },
    {
      icon: "🚜",
      title: "Equipment Owners",
      description:
        "Rent agricultural machinery and earn additional income."
    }
  ];

  return (
    <div className="home-page">

      {/* HERO SECTION */}
      <section className="hero">

        <div className="hero-content">

          <h1>
            Connecting Farmers, Customers and Workers
          </h1>

          <p>
            Farm Connect is a digital agricultural marketplace
            that brings farmers, customers, agricultural workers
            and equipment owners together on one platform.
          </p>

          <div className="hero-buttons">

            <Link to="/register" className="primary-btn">
              Get Started
            </Link>

            <Link to="/login" className="secondary-btn">
              Login
            </Link>

          </div>

        </div>

        <div className="hero-image">

          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1000"
            alt="Agricultural farmland"
          />

        </div>

      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="about-section">

        <h2 className="section-title">
          About FarmConnect
        </h2>

        <p>
          FarmConnect brings the agricultural community together.
          It helps farmers sell crops, customers purchase fresh
          products, workers find agricultural jobs and equipment
          owners rent their machinery. Our goal is to make
          agricultural services easily accessible through one
          simple digital platform.
        </p>

      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="services-section">

        <h2 className="section-title">
          Our Services
        </h2>

        <p>
          One platform, multiple opportunities for the agricultural community.
        </p>

        <div className="services-grid">

          {services.map((service, index) => (

            <div className="service-card" key={index}>

              <div className="service-icon">
                {service.icon}
              </div>

              <h3>{service.title}</h3>

              <p>{service.description}</p>

            </div>

          ))}

        </div>

      </section>

      {/* FOOTER */}
      <footer id="contact" className="footer">

        <h2>🌱 FarmConnect</h2>

        <p>
          Connecting Agriculture, Empowering Farmers.
        </p>

        <p>
          © 2026 FarmConnect. All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default Home;
