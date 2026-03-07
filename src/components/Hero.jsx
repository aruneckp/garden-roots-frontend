import { useApp } from '../context/AppContext';

export default function Hero() {
  const { setPage } = useApp();

  return (
    <section className="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-badge">✦ Season 2026 Now Open</div>
          <h1>Home of Premium <em>Indian Mangoes</em></h1>
          <p>Experience the authentic taste of India's finest orchards, air-flown fresh straight to your door anywhere in Singapore.</p>
          <div className="hero-buttons">
            <button className="btn-hero" onClick={() => document.getElementById('varieties')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Varieties
            </button>
            <button className="btn-hero-ghost" onClick={() => setPage('about-us')}>Our Story →</button>
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
