import { useApp } from '../context/AppContext';

export default function Hero() {
  const { setPage, setFocusLocationId, pickupLocations } = useApp();

  const goToLocation = (id) => {
    setFocusLocationId(id);
    setPage('pickup-locations');
  };

  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          <h1>Home of Premium <em>Indian Mangoes</em></h1>
          <p>Experience the authentic taste of India's finest orchards, air-flown fresh straight to your door anywhere in Singapore.</p>
          <div className="hero-buttons">
            <button className="btn-hero" onClick={() => document.getElementById('varieties')?.scrollIntoView({ behavior: 'smooth' })}>
              Order Now
            </button>
            <button className="btn-hero-ghost" onClick={() => setPage('about-us')}>Our Story →</button>
          </div>
          <div className="hero-locations-box">
            <div className="hero-locations-heading">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{flexShrink:0}}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(255,255,255,0.9)"/>
                <circle cx="12" cy="9" r="2.5" fill="rgba(52,211,153,1)"/>
              </svg>
              Self-collection points
            </div>
            <div className="hero-locations-chips">
              {pickupLocations.map(loc => (
                <button key={loc.id} className="hero-loc-chip" onClick={() => goToLocation(loc.id)}>
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="mango-circle">🥭</div>
          <div className="hero-stats">
            <div className="stat-pill"><strong>100%</strong><span>Natural</span></div>
            <div className="stat-pill"><strong>48hr</strong><span>Delivery</span></div>
            <div className="stat-pill"><strong>5★</strong><span>Rated</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
