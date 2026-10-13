import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Auth from "./Auth";
import AdminDashboard from "./AdminDashboard";

const API_URL = "http://localhost:8080";
const PLACEHOLDER_IMAGE =
  "https://placehold.co/600x400/202328/c6a77b?text=VELORA+Vehicle";
const categories = ["All Vehicles", "Sedan", "SUV", "Hatchback", "Other"];

function mapApiVehicle(vehicle) {
  const type = vehicle.vehicleType || "Other";
  return {
    ...vehicle,
    name: vehicle.name || `${vehicle.brand || "VELORA"} Vehicle`,
    type,
    category: type,
    price: Number(vehicle.pricePerDay || 0),
    seats: vehicle.seats ?? "Not specified",
    transmission: vehicle.transmission || "Not specified",
    fuel: vehicle.fuel || "Not specified",
    image: vehicle.imageUrl?.trim() || PLACEHOLDER_IMAGE,
    tag: vehicle.available ? "AVAILABLE" : "UNAVAILABLE",
  };
}

function formatPrice(price) {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function getToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function VehicleImage({ src, alt, className }) {
  const [imageSrc, setImageSrc] = useState(src || PLACEHOLDER_IMAGE);
  useEffect(() => setImageSrc(src || PLACEHOLDER_IMAGE), [src]);
  return (
    <img
      className={className}
      src={imageSrc}
      alt={alt || "VELORA vehicle"}
      loading="lazy"
      onError={() => {
        if (imageSrc !== PLACEHOLDER_IMAGE) setImageSrc(PLACEHOLDER_IMAGE);
      }}
    />
  );
}

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState("");
  const [vehicleRefreshKey, setVehicleRefreshKey] = useState(0);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Vehicles");
  const [searchText, setSearchText] = useState("");
  const [pickupDate, setPickupDate] = useState(getToday());
  const [returnDate, setReturnDate] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function checkSession() {
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (response.ok) setLoggedInUser(await response.json());
        else if (response.status === 401) setLoggedInUser(null);
        else setAuthMessage("Unable to verify your session. Please try again.");
      } catch (error) {
        if (error.name !== "AbortError") {
          setAuthMessage("Cannot verify your login. Make sure Spring Boot is running.");
        }
      } finally {
        if (!controller.signal.aborted) setSessionChecking(false);
      }
    }
    checkSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/hello`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Backend request failed");
        setBackendStatus("online");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setBackendStatus("offline");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadVehicles() {
      setVehiclesLoading(true);
      setVehiclesError("");
      try {
        const response = await fetch(`${API_URL}/api/vehicles`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load vehicles from the backend.");
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error("The vehicle API returned an unexpected response.");
        setVehicles(data.map(mapApiVehicle));
      } catch (error) {
        if (error.name !== "AbortError") {
          setVehiclesError(error.message || "Unable to load vehicles. Check your backend.");
        }
      } finally {
        if (!controller.signal.aborted) setVehiclesLoading(false);
      }
    }
    loadVehicles();
    return () => controller.abort();
  }, [vehicleRefreshKey]);

  const filteredVehicles = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesCategory =
        activeCategory === "All Vehicles" ||
        vehicle.type === activeCategory ||
        vehicle.category === activeCategory;
      const matchesSearch =
        !query ||
        String(vehicle.name || "").toLowerCase().includes(query) ||
        String(vehicle.brand || "").toLowerCase().includes(query) ||
        String(vehicle.type || "").toLowerCase().includes(query) ||
        String(vehicle.fuel || "").toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [vehicles, activeCategory, searchText]);

  const rentalDays =
    pickupDate && returnDate
      ? Math.max(
        1,
        Math.ceil(
          (new Date(`${returnDate}T12:00:00`) -
            new Date(`${pickupDate}T12:00:00`)) /
          (1000 * 60 * 60 * 24)
        )
      )
      : 1;
  const estimatedTotal = selectedVehicle ? selectedVehicle.price * rentalDays : 0;

  function handleSearch(event) {
    event.preventDefault();
    document.getElementById("fleet")?.scrollIntoView({ behavior: "smooth" });
  }

  function handleLogin(user) {
    setLoggedInUser(user);
    setShowAuth(false);
    setAuthMessage("");
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setAuthMessage("");
    try {
      const response = await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed. Please try again.");
      setLoggedInUser(null);
      setShowAuth(false);
      setShowAdminDashboard(false);
      setSelectedVehicle(null);
      setBookingMessage("");
      setBookingName("");
      setBookingEmail("");
      setMobileMenuOpen(false);
      setAuthMessage("You have been logged out successfully.");
    } catch (error) {
      setAuthMessage(error.message || "Could not log out. Check your backend connection.");
    } finally {
      setLoggingOut(false);
    }
  }

  function openBooking(vehicle) {
    if (!vehicle.available) {
      setBookingMessage("This vehicle is currently unavailable.");
      return;
    }
    setSelectedVehicle(vehicle);
    setBookingMessage("");
    setBookingName(loggedInUser?.email?.split("@")[0] || "");
    setBookingEmail(loggedInUser?.email || "");
  }

  function handleBooking(event) {
    event.preventDefault();
    if (!selectedVehicle) return;
    if (!pickupDate || !returnDate || returnDate <= pickupDate) {
      setBookingMessage("Please select a return date after your pickup date.");
      return;
    }
    if (!bookingName.trim() || !bookingEmail.trim()) {
      setBookingMessage("Please enter your name and email.");
      return;
    }
    setBookingMessage(
      `Booking preview created for ${selectedVehicle.name}. Estimated total: ${formatPrice(estimatedTotal)}. This is only a preview; no booking has been saved.`
    );
  }

  function closeBooking() {
    setSelectedVehicle(null);
    setBookingMessage("");
  }

  if (showAuth) return <Auth onLogin={handleLogin} onBack={() => setShowAuth(false)} />;

  const isAdmin = ["ADMIN", "ROLE_ADMIN"].includes(loggedInUser?.role);
  if (showAdminDashboard && isAdmin) {
    return (
      <AdminDashboard
        onBack={() => setShowAdminDashboard(false)}
        onVehiclesChanged={() => setVehicleRefreshKey((current) => current + 1)}
      />
    );
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span className="announcement-dot" /> YOUR NEXT JOURNEY STARTS HERE
        <span className="announcement-divider">/</span> PREMIUM CAR RENTALS
      </div>

      <header className="navbar">
        <a className="brand" href="#home" aria-label="Velora home">
          <span className="brand-mark">V</span>
          <span className="brand-copy"><strong>VELORA</strong><small>DRIVE DIFFERENT.</small></span>
        </a>
        <button
          className="mobile-menu-button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={mobileMenuOpen}
          type="button"
        >{mobileMenuOpen ? "✕" : "☰"}</button>
        <nav className={mobileMenuOpen ? "nav-links nav-open" : "nav-links"}>
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#fleet" onClick={() => setMobileMenuOpen(false)}>Our Fleet</a>
          <a href="#experience" onClick={() => setMobileMenuOpen(false)}>Experience</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        </nav>
        <div className="nav-auth-actions">
          {sessionChecking ? <span className="welcome-user">Checking session...</span> :
            loggedInUser ? <>
              <span className="welcome-user">Hi, {loggedInUser.email?.split("@")[0]}{isAdmin ? " · ADMIN" : ""}</span>
              {isAdmin && <button className="nav-login-button" type="button" onClick={() => { setShowAdminDashboard(true); setMobileMenuOpen(false); }}>Admin Dashboard</button>}
              <button className="nav-login-button" type="button" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Logout"}</button>
            </> : <button className="nav-login-button" type="button" onClick={() => { setShowAuth(true); setMobileMenuOpen(false); }}>Sign In</button>}
          <a className="nav-cta" href="#fleet">Explore Cars <span>↗</span></a>
        </div>
      </header>

      {authMessage && <div className="connection-notice" role="status">
        {authMessage}
        <button type="button" onClick={() => setAuthMessage("")} aria-label="Dismiss message" style={{ marginLeft: 12, background: "transparent", color: "inherit", border: 0, cursor: "pointer" }}>×</button>
      </div>}

      <main>
        <section className="hero" id="home">
          <div className="hero-overlay" />
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line" /> THE ART OF THE DRIVE</div>
            <h1>Not just a ride.<br /><span>An experience.</span></h1>
            <p className="hero-description">Discover a curated collection of exceptional cars. Wherever you're headed, arrive in a way that feels different.</p>
            <div className="hero-actions">
              <a className="button button-gold" href="#fleet">Discover the fleet <span>↗</span></a>
              <a className="text-link" href="#experience">Why Velora <span>→</span></a>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars"><span>D</span><span>A</span><span>R</span><span>+</span></div>
              <div><strong>Made for the journey</strong><small>A premium rental experience</small></div>
            </div>
          </div>
          <div className="hero-side-note"><span>01 — THE COLLECTION</span><span>DESIGNED TO MOVE YOU</span></div>
          <a className="scroll-indicator" href="#search"><span className="scroll-line" /> SCROLL TO EXPLORE</a>
        </section>

        <section className="search-section" id="search">
          <form className="search-panel" onSubmit={handleSearch}>
            <div className="search-heading"><span className="search-icon">⌕</span><div><strong>Find your drive</strong><small>Your next chapter starts with a search.</small></div></div>
            <label className="search-field"><span>VEHICLE OR CATEGORY</span><input type="search" placeholder="Try BMW, SUV, Electric..." value={searchText} onChange={(event) => setSearchText(event.target.value)} /></label>
            <label className="search-field"><span>PICKUP DATE</span><input type="date" value={pickupDate} min={getToday()} onChange={(event) => setPickupDate(event.target.value)} required /></label>
            <label className="search-field"><span>RETURN DATE</span><input type="date" value={returnDate} min={pickupDate || getToday()} onChange={(event) => setReturnDate(event.target.value)} required /></label>
            <button className="button button-gold search-button" type="submit">Find a car <span>↗</span></button>
          </form>
          <p className="search-hint">Choose your dates to prepare a rental estimate. Availability will be connected to the database in a later step.</p>
        </section>

        <section className="fleet-section section-wrap" id="fleet">
          <div className="section-heading">
            <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR DRIVE, YOUR RULES</div><h2>Meet your <span>match.</span></h2><p>Carefully selected machines. Unforgettable journeys.</p></div>
            <a className="view-all-link" href="#fleet">Explore the collection <span>↗</span></a>
          </div>
          <div className="category-tabs" aria-label="Filter vehicles">
            {categories.map((category) => <button key={category} className={activeCategory === category ? "category-tab active" : "category-tab"} onClick={() => setActiveCategory(category)} type="button">{category}</button>)}
            <span className="fleet-count">{filteredVehicles.length.toString().padStart(2, "0")} VEHICLES</span>
          </div>

          {vehiclesLoading && <div className="empty-state" role="status"><h3>Loading the VELORA fleet...</h3><p>Connecting to your live vehicle inventory.</p></div>}
          {!vehiclesLoading && vehiclesError && <div className="empty-state" role="alert"><h3>We couldn't load the fleet</h3><p>{vehiclesError}</p><button className="button button-outline" type="button" onClick={() => setVehicleRefreshKey((key) => key + 1)}>Try again</button></div>}

          {!vehiclesLoading && !vehiclesError && <div className="vehicle-grid">
            {filteredVehicles.map((vehicle) => <article className="vehicle-card" key={vehicle.id}>
              <div className="vehicle-image-wrap">
                <VehicleImage className="vehicle-image" src={vehicle.image} alt={vehicle.name} />
                <span className="vehicle-tag">{vehicle.tag}</span>
                <span className="vehicle-number">V / {String(vehicle.id).padStart(2, "0")}</span>
              </div>
              <div className="vehicle-info">
                <div className="vehicle-title-row"><div><span className="vehicle-category">{vehicle.type}</span><h3>{vehicle.name}</h3></div><div className="vehicle-price"><strong>{formatPrice(vehicle.price)}</strong><small>/ day</small></div></div>
                <div className="vehicle-specs"><span><span className="spec-icon">♙</span> {vehicle.seats} Seats</span><span><span className="spec-icon">⚙</span> {vehicle.transmission}</span><span><span className="spec-icon">◈</span> {vehicle.fuel}</span></div>
                <button className="vehicle-book-button" onClick={() => openBooking(vehicle)} type="button" disabled={!vehicle.available}>{vehicle.available ? "Reserve this vehicle" : "Currently unavailable"} <span>↗</span></button>
              </div>
            </article>)}
          </div>}

          {!vehiclesLoading && !vehiclesError && filteredVehicles.length === 0 && <div className="empty-state"><span>⌕</span><h3>{vehicles.length ? "No matching vehicles" : "Your fleet is ready to grow"}</h3><p>{vehicles.length ? "Try another search term or select a different category." : "Add vehicles from the Admin Dashboard and they will appear here."}</p><button className="button button-outline" onClick={() => { setSearchText(""); setActiveCategory("All Vehicles"); }} type="button">Clear filters</button></div>}
          <p className="demo-note">Vehicle listings and daily prices are loaded from the VELORA backend. Vehicle specifications such as seats, transmission, and fuel show “Not specified” until those fields are added to the database.</p>
        </section>

        <section className="experience-section" id="experience">
          <div className="experience-image"><div className="experience-image-label"><span>THE VELORA STANDARD</span><span>EST. FOR THE JOURNEY</span></div></div>
          <div className="experience-content">
            <div className="eyebrow"><span className="eyebrow-line" /> MORE THAN MOBILITY</div>
            <h2>The journey<br />should feel <span>exceptional.</span></h2>
            <p>From the moment you choose your car to the moment you arrive, we're creating a rental experience built around freedom, comfort, and confidence.</p>
            <div className="benefit-list">
              <div className="benefit-item"><span className="benefit-number">01</span><div><strong>A car for every occasion</strong><small>From everyday comfort to extraordinary drives.</small></div></div>
              <div className="benefit-item"><span className="benefit-number">02</span><div><strong>A simpler way to book</strong><small>Choose your vehicle and review your rental details.</small></div></div>
              <div className="benefit-item"><span className="benefit-number">03</span><div><strong>Designed around you</strong><small>A considered experience from start to finish.</small></div></div>
            </div>
            <a className="button button-outline" href="#fleet">Find your vehicle <span>↗</span></a>
          </div>
        </section>

        <section className="cta-section" id="contact">
          <div className="cta-decoration">V.</div><div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT CHAPTER AWAITS</div>
          <h2>Where will<br /><span>you go next?</span></h2><p>Choose the car. Set the dates. Make the journey yours.</p>
          <a className="button button-gold" href="#search">Start your search <span>↗</span></a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#home"><span className="brand-mark">V</span><span className="brand-copy"><strong>VELORA</strong><small>DRIVE DIFFERENT.</small></span></a>
        <p>Every journey deserves a better beginning.</p>
        <div className="footer-right"><span className={`status-dot ${backendStatus}`} /><span>{backendStatus === "online" ? "API CONNECTED" : backendStatus === "offline" ? "API OFFLINE" : "CHECKING API"}</span><span className="footer-divider">|</span><span>© {new Date().getFullYear()} VELORA</span></div>
      </footer>

      {backendStatus === "offline" && <div className="connection-notice" role="status"><span className="status-dot offline" /> Backend is unavailable. Start Spring Boot on port 8080 to reconnect.</div>}

      {selectedVehicle && <div className="modal-backdrop" onClick={closeBooking}>
        <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onClick={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={closeBooking} aria-label="Close booking form" type="button">×</button>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT JOURNEY</div><h2 id="booking-title">Reserve your drive.</h2><p className="modal-intro">Review your vehicle and enter your details for a booking preview.</p>
          <div className="modal-vehicle"><VehicleImage src={selectedVehicle.image} alt={selectedVehicle.name} /><div><span className="vehicle-category">{selectedVehicle.type}</span><strong>{selectedVehicle.name}</strong><small>{formatPrice(selectedVehicle.price)} / day</small></div></div>
          <form className="booking-form" onSubmit={handleBooking}>
            <div className="modal-date-grid">
              <label>Pickup date<input type="date" value={pickupDate} min={getToday()} onChange={(event) => setPickupDate(event.target.value)} required /></label>
              <label>Return date<input type="date" value={returnDate} min={pickupDate || getToday()} onChange={(event) => setReturnDate(event.target.value)} required /></label>
            </div>
            <label>Full name<input type="text" placeholder="Enter your name" value={bookingName} onChange={(event) => setBookingName(event.target.value)} required /></label>
            <label>Email address<input type="email" placeholder="you@example.com" value={bookingEmail} onChange={(event) => setBookingEmail(event.target.value)} required /></label>
            <div className="estimate-row"><div><small>ESTIMATED RENTAL TOTAL</small><strong>{formatPrice(estimatedTotal)}</strong><small>{rentalDays} rental day(s)</small></div><span>Taxes and fees not included</span></div>
            <button className="button button-gold modal-submit" type="submit">Create booking preview <span>↗</span></button>
            {bookingMessage && <p className={bookingMessage.startsWith("Booking preview") ? "booking-feedback success" : "booking-feedback"} role="status">{bookingMessage}</p>}
            <p className="modal-disclaimer">Demo only: this form does not save personal details or create a confirmed reservation in the database.</p>
          </form>
        </section>
      </div>}
    </div>
  );
}

export default App;
