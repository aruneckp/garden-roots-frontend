import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function PickupLocations() {
  const { focusLocationId, setFocusLocationId, setPage, setCheckoutPickupName, cart, setToast, pickupLocations } = useApp();

  useEffect(() => {
    if (!focusLocationId) return;
    const el = document.getElementById(`loc-${focusLocationId}`);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('pickup-card--highlight');
        setTimeout(() => el.classList.remove('pickup-card--highlight'), 2000);
      }, 100);
    }
    setFocusLocationId(null);
  }, [focusLocationId]);

  function handleOrderNow(locName) {
    setCheckoutPickupName(locName);
    if (cart.length === 0) {
      setToast(`📍 ${locName} pickup saved — add items then checkout!`);
      setTimeout(() => setToast(null), 3000);
      setPage('home');
    } else {
      setPage('checkout');
    }
  }

  return (
    <>
      <div className="pickup-hero">
        <div className="pickup-hero-inner">
          <div className="hero-badge" style={{ margin: '0 auto 20px' }}>
            📍 {pickupLocations.length} Location{pickupLocations.length !== 1 ? 's' : ''} Island-Wide
          </div>
          <h1>Pickup Locations</h1>
          <p>Prefer to collect in person? Visit any of our pickup points across Singapore and take home your mangoes fresh.</p>
        </div>
      </div>

      <div className="pickup-body">
        <div className="section-label">Our Pickup Points</div>
        <h2 className="section-title">Find Your Nearest Location</h2>
        <div className="pickup-grid">
          {pickupLocations.map(loc => (
            <div className="pickup-card" key={loc.id} id={`loc-${loc.id}`}>
              <h4>📍 {loc.name}</h4>
              {loc.collection_hours && (
                <p className="pickup-hours">🕐 {loc.collection_hours}</p>
              )}
              <p className="pickup-address">{loc.address}</p>
              {loc.phone && (
                <p className="pickup-phone">📞 {loc.phone}</p>
              )}
              <button
                className="pickup-order-btn"
                onClick={() => handleOrderNow(loc.name)}
              >
                🛒 Order Now
              </button>
              {loc.whatsapp_phone && (
                <a
                  className="pickup-wa-btn"
                  href={`https://wa.me/${loc.whatsapp_phone.replace(/\D/g, '')}?text=Hi! I'd like to pick up my order at your ${loc.name} location.`}
                  target="_blank"
                  rel="noreferrer"
                >
                  💬 WhatsApp to Confirm Pickup
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="pickup-note">
          <span style={{ fontSize: 28 }}>📦</span>
          <p>
            <strong>How pickup works:</strong> Place your order online, then WhatsApp us to confirm your preferred pickup slot.
            Orders are ready within 24 hours. Bring your order reference number when collecting.
            For same-day pickup, orders must be placed before <strong>10am SGT</strong>.
          </p>
        </div>
      </div>
    </>
  );
}
