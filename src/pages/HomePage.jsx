import { useBooking } from '../context/BookingContext';
import { VEHICLE_TYPES } from '../data/services';
import { CUSTOMER_REVIEWS } from '../data/reviews';
import { getRandomCities, MAJOR_CITIES, POPULAR_ROUTES } from '../data/locations';
import { MOCK_USERS } from '../data/mockData';
import { useState, useRef } from 'react';

export default function HomePage() {
  const { setPage, isAuthenticated, showToast } = useBooking();
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const fromBlurTimer = useRef(null);
  const toBlurTimer = useRef(null);

  const filterCities = (query) => {
    if (query.length < 2) return [];
    return MAJOR_CITIES.filter((city) =>
      city.name.toLowerCase().startsWith(query.toLowerCase()) ||
      city.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  };

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromLocation(val);
    const suggestions = filterCities(val);
    setFromSuggestions(suggestions);
    setShowFromDropdown(suggestions.length > 0);
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToLocation(val);
    const suggestions = filterCities(val);
    setToSuggestions(suggestions);
    setShowToDropdown(suggestions.length > 0);
  };

  const selectFromCity = (city) => {
    setFromLocation(city.name);
    setShowFromDropdown(false);
  };

  const selectToCity = (city) => {
    setToLocation(city.name);
    setShowToDropdown(false);
  };

  const handleQuickBook = () => {
    if (!fromLocation || !toLocation || !date) {
      showToast('Please enter all booking details', 'error');
      return;
    }
    if (!isAuthenticated) {
      setPage('login');
      return;
    }
    setPage('booking');
  };

  const randomCities = getRandomCities(6);

  return (
    <div className="page-container">
      {/* Demo Credentials Banner */}
      {!isAuthenticated && (
        <div style={{
          background: 'linear-gradient(90deg, #004E89, #FF6B35)',
          color: 'white',
          padding: '10px 20px',
          textAlign: 'center',
          fontSize: '13px',
          position: 'fixed',
          top: '60px',
          left: 0, right: 0,
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 700 }}>🔑 Demo Login Ready:</span>
          {MOCK_USERS.filter(u => u.role !== 'driver').map(u => (
            <span key={u.id} style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '12px' }}>
              📱 {u.phone} &nbsp;|&nbsp; 🔒 {u.password}
            </span>
          ))}
          <button
            onClick={() => setPage('login')}
            style={{ background: 'white', color: '#FF6B35', border: 'none', borderRadius: '12px', padding: '4px 14px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
          >
            Login Now →
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero" style={!isAuthenticated ? { marginTop: '36px' } : {}}>
        <h1>Fast & Reliable Lorry Booking Service Across India</h1>
        <p>
          Book lorries, autos, and trucks instantly. Track in real-time. Deliver safely.
        </p>

        <div className="quick-booking">
          <div className="booking-form">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="📍 From Location"
                value={fromLocation}
                onChange={handleFromChange}
                onFocus={() => fromSuggestions.length > 0 && setShowFromDropdown(true)}
                onBlur={() => { fromBlurTimer.current = setTimeout(() => setShowFromDropdown(false), 150); }}
                autoComplete="off"
              />
              {showFromDropdown && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: '8px', boxShadow: 'var(--shadow)',
                  listStyle: 'none', margin: 0, padding: 0,
                  zIndex: 100, maxHeight: '220px', overflowY: 'auto',
                }}>
                  {fromSuggestions.map((city) => (
                    <li
                      key={city.id}
                      onMouseDown={() => selectFromCity(city)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontWeight: 500 }}>{city.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{city.state}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="📍 To Location"
                value={toLocation}
                onChange={handleToChange}
                onFocus={() => toSuggestions.length > 0 && setShowToDropdown(true)}
                onBlur={() => { toBlurTimer.current = setTimeout(() => setShowToDropdown(false), 150); }}
                autoComplete="off"
              />
              {showToDropdown && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'white', border: '1px solid var(--border)',
                  borderRadius: '8px', boxShadow: 'var(--shadow)',
                  listStyle: 'none', margin: 0, padding: 0,
                  zIndex: 100, maxHeight: '220px', overflowY: 'auto',
                }}>
                  {toSuggestions.map((city) => (
                    <li
                      key={city.id}
                      onMouseDown={() => selectToCity(city)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontWeight: 500 }}>{city.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{city.state}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleQuickBook}>
              Get Quote & Book 🚀
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ background: '#004E89', padding: '20px' }}>
        <div style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: '40px', maxWidth: '900px', margin: '0 auto',
        }}>
          {[
            { value: '12,000+', label: 'Deliveries Done' },
            { value: '800+', label: 'Verified Drivers' },
            { value: '20+', label: 'Cities Covered' },
            { value: '4.8 ★', label: 'Average Rating' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#FF6B35' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: '60px 20px',
          background: 'white',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginBottom: '40px' }}>How It Works</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          {[
            { num: 1, title: 'Enter Location', desc: 'Tell us pickup & dropoff' },
            { num: 2, title: 'Select Vehicle', desc: 'Choose the right size' },
            { num: 3, title: 'Confirm & Pay', desc: 'Secure payment options' },
            { num: 4, title: 'Track Live', desc: 'Monitor delivery in real-time' },
          ].map((step) => (
            <div
              key={step.num}
              style={{
                padding: '24px',
                border: '2px solid var(--border)',
                borderRadius: '12px',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-8px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: 'var(--primary)',
                  marginBottom: '8px',
                }}
              >
                {step.num}
              </div>
              <h3 style={{ marginBottom: '8px' }}>{step.title}</h3>
              <p style={{ color: 'var(--text-light)', marginBottom: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="services-section">
        <div className="section-title">
          <h2>Our Services</h2>
          <p>Choose the right vehicle for your needs</p>
        </div>
        <div className="services-grid">
          {VEHICLE_TYPES.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-icon">{service.emoji}</div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-specs">
                <div className="spec">
                  <span>📦</span> Capacity: {service.capacity}
                </div>
                <div className="spec">
                  <span>📏</span> Volume: {service.maxVolume}
                </div>
              </div>
              <div className="service-price">
                ₹{service.basePrice} + ₹{service.perKmPrice}/km
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setPage(isAuthenticated ? 'booking' : 'login')}
              >
                Book {service.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Coverage */}
      {/* Popular Routes */}
      <section style={{ padding: '50px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Popular Routes</h2>
          <p style={{ textAlign: 'center', marginBottom: '36px' }}>Most booked city pairs this week</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {POPULAR_ROUTES.map((route) => (
              <div
                key={route.id}
                style={{
                  background: 'linear-gradient(135deg, #f0f4ff, #fff)',
                  border: '1.5px solid var(--border)',
                  borderRadius: '12px', padding: '18px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                onClick={() => setPage(isAuthenticated ? 'booking' : 'login')}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>
                    {route.from} <span style={{ color: 'var(--primary)' }}>→</span> {route.to}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                    {route.distance} km &nbsp;·&nbsp; {route.duration}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ padding: '6px 14px', fontSize: '12px' }}>
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section style={{ padding: '60px 20px', background: '#f9f9f9' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>
            We Cover Major Indian Cities
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {randomCities.map((city) => (
              <div
                key={city.id}
                style={{
                  padding: '20px',
                  background: 'white',
                  borderRadius: '8px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <h4 style={{ marginBottom: '4px' }}>{city.name}</h4>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-light)',
                    marginBottom: '12px',
                  }}
                >
                  {city.state}
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setPage(isAuthenticated ? 'booking' : 'login')}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section style={{ padding: '60px 20px', background: 'white' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px' }}>
          Trusted by Thousands
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {CUSTOMER_REVIEWS.slice(0, 3).map((review) => (
            <div
              key={review.id}
              style={{
                padding: '20px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    fontSize: '32px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {review.avatar}
                </div>
                <div>
                  <strong>{review.name}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: 0 }}>
                    {review.city}
                  </p>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                {'⭐'.repeat(review.rating)}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                {review.review}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '60px 20px',
          background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: 'white', marginBottom: '16px' }}>
          Ready to Ship?
        </h2>
        <p style={{ marginBottom: '24px', fontSize: '18px' }}>
          Join thousands of satisfied customers using LorryHub
        </p>
        <button
          className="btn btn-secondary"
          style={{ background: 'white', color: 'var(--primary)', fontWeight: '700' }}
          onClick={() => setPage(isAuthenticated ? 'booking' : 'login')}
        >
          Book Your Lorry Now
        </button>
      </section>
    </div>
  );
}
