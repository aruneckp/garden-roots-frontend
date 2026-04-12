import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Hero() {
  const { setPage } = useApp();

  const [heroFading, setHeroFading] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false);

  useEffect(() => {
    if (window.innerWidth > 768) return;
    const fadeTimer = setTimeout(() => setHeroFading(true), 5000);
    const hideTimer = setTimeout(() => setHeroHidden(true), 5600);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (heroHidden) return null;

  return (
    <section className={`hero${heroFading ? ' hero-fade-out' : ''}`}>
      <div className="hero-inner">
        <div>
          <div className="hero-badge">
            <span className="hero-badge-ticker">✦ Season 2026 <span style={{color:'#EF4444'}}>Opening Soon</span> &nbsp;&nbsp;&nbsp; ✦ Season 2026 <span style={{color:'#EF4444'}}>Opening Soon</span> &nbsp;&nbsp;&nbsp;</span>
          </div>
          <h1>Home of Premium <em>Indian Mangoes</em></h1>
          <p>Experience the authentic taste of India's finest orchards, air-flown fresh straight to your door anywhere in Singapore.</p>
          <div className="hero-buttons">
            <button className="btn-hero" onClick={() => document.getElementById('varieties')?.scrollIntoView({ behavior: 'smooth' })}>
              Order Now
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
