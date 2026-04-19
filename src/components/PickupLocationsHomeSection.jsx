import { useApp } from '../context/AppContext';

export default function PickupLocationsHomeSection() {
  const { setPage, pickupLocations, loadingPickupLocations } = useApp();

  return (
    <section className="home-pickup-section">
      <div className="home-pickup-inner">
        <div className="section-label" style={{ textAlign: 'center' }}>Self-Collection</div>
        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: 8 }}>
          Pick Up Near You
        </h2>
        <p className="home-pickup-sub">
          Skip the delivery wait — collect your mangoes fresh from any of our island-wide locations.
        </p>

        <div className="pickup-grid" style={{ marginTop: 36 }}>
          {loadingPickupLocations ? (
            [1, 2, 3].map(n => (
              <div className="pickup-card pickup-card-skeleton" key={n} aria-hidden="true">
                <div className="skeleton-line" style={{ width: '70%', height: 20, marginBottom: 10 }} />
                <div className="skeleton-line" style={{ width: '50%', height: 14, marginBottom: 8 }} />
                <div className="skeleton-line" style={{ width: '90%', height: 14, marginBottom: 8 }} />
                <div className="skeleton-line" style={{ width: '40%', height: 14 }} />
              </div>
            ))
          ) : (
            pickupLocations.map(loc => (
              <div className="pickup-card" key={loc.id}>
                <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--dark)', marginBottom: 8 }}>
                  📍 {loc.name}
                </h4>
                {loc.collection_hours && (
                  <p className="pickup-hours">🕐 {loc.collection_hours}</p>
                )}
                <p className="pickup-address">{loc.address}</p>
                {loc.phone && (
                  <p className="pickup-phone">📞 {loc.phone}</p>
                )}
                {loc.whatsapp_phone && (
                  <a
                    className="pickup-wa-btn"
                    href={`https://wa.me/${loc.whatsapp_phone.replace(/\D/g, '')}?text=Hi! I'd like to pick up my order at your ${loc.name} location.`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 WhatsApp to Confirm
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button
            className="home-pickup-all-btn"
            onClick={() => setPage('pickup-locations')}
          >
            View All Pickup Locations →
          </button>
        </div>
      </div>
    </section>
  );
}
