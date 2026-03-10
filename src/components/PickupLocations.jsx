import { locations } from '../data/locations';

export default function PickupLocations() {
  return (
    <>
      <div className="pickup-hero">
        <div className="pickup-hero-inner">
          <div className="hero-badge" style={{ margin: '0 auto 20px' }}>📍 3 Locations Island-Wide</div>
          <h1>Pickup Locations</h1>
          <p>Prefer to collect in person? Visit any of our 3 pickup points across Singapore and take home your mangoes fresh.</p>
        </div>
      </div>

      <div className="pickup-body">
        <div className="section-label">Our Pickup Points</div>
        <h2 className="section-title">Find Your Nearest Location</h2>
        <div className="pickup-grid">
          {locations.map(loc => (
            <div className="pickup-card" key={loc.id}>
              <span className="pickup-area-badge">{loc.area}</span>
              <h4>📍 {loc.name}</h4>
              <p className="pickup-address">
                {loc.address.split('\t')[0]}<br />
                {loc.address.split('\t')[1]}
              </p>
              <p className="pickup-hours">🕐 {loc.hours}</p>
              <a
                className="pickup-wa-btn"
                href={`https://wa.me/6591555947?text=Hi! I'd like to pick up my order at your ${loc.name} location.`}
                target="_blank"
                rel="noreferrer"
              >
                💬 WhatsApp to Confirm Pickup
              </a>
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
