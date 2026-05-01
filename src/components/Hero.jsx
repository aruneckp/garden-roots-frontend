import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import IMAGE_SLIDES from 'virtual:banners';

function OriginalHeroBanner({ setPage, pickupLocations, setFocusLocationId }) {
  const goToLocation = (id) => {
    setFocusLocationId(id);
    setPage('pickup-locations');
  };

  return (
    <div className="hero">
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(255,255,255,0.9)" />
                <circle cx="12" cy="9" r="2.5" fill="rgba(52,211,153,1)" />
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
    </div>
  );
}

export default function Hero() {
  const { setPage, setFocusLocationId, pickupLocations } = useApp();
  const [current, setCurrent] = useState(0);
  const [failedSrcs, setFailedSrcs] = useState(new Set());
  const timerRef = useRef(null);

  const activeImages = IMAGE_SLIDES.filter(s => !failedSrcs.has(s.src));
  const total = 1 + activeImages.length; // slide 0 = original banner, 1+ = images

  const startTimer = (count) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % count), 6000);
  };

  useEffect(() => {
    startTimer(total);
    return () => clearInterval(timerRef.current);
  }, [total]);

  const go = (idx) => {
    setCurrent((idx + total) % total);
    startTimer(total);
  };

  const imgSlide = current > 0 ? activeImages[current - 1] : null;

  return (
    <section className="hero-carousel">
      <div className="hero-carousel-slide" key={current}>
        {current === 0 ? (
          <OriginalHeroBanner
            setPage={setPage}
            pickupLocations={pickupLocations}
            setFocusLocationId={setFocusLocationId}
          />
        ) : (
          imgSlide && (
            <div className="hero-slide-image">
              <img
                src={imgSlide.src}
                alt={imgSlide.alt}
                className="hero-carousel-img"
                onError={() => setFailedSrcs(prev => new Set([...prev, imgSlide.src]))}
              />
            </div>
          )
        )}
      </div>

      {total > 1 && (
        <>
          <button className="carousel-arrow carousel-prev" onClick={() => go(current - 1)} aria-label="Previous slide">&#8249;</button>
          <button className="carousel-arrow carousel-next" onClick={() => go(current + 1)} aria-label="Next slide">&#8250;</button>
          <div className="hero-carousel-dots">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                className={`carousel-dot${i === current ? ' active' : ''}`}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
