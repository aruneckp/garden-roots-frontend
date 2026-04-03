import { useApp } from '../context/AppContext';

export default function Footer() {
  const { setPage } = useApp();

  const infoLinks = ['Home', 'Mango Varieties', 'Pickup Locations', 'About Us', 'Contact', 'Terms & Conditions'];

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo" style={{ color: '#22C55E' }} onClick={() => setPage('home')}>
            🌿 Garden<span style={{ color: '#F59E0B' }}>Roots</span>
          </div>
          <p>Your premier destination for authentic premium Indian mangoes in Singapore. Farm to doorstep, every season.</p>
          <div className="social-links">
            <a className="social-link fb" href="https://facebook.com" target="_blank" rel="noreferrer" title="Facebook">f</a>
            <a className="social-link ig" href="https://instagram.com" target="_blank" rel="noreferrer" title="Instagram">📸</a>
            <a className="social-link li" href="https://linkedin.com" target="_blank" rel="noreferrer" title="LinkedIn">in</a>
            <a className="social-link wa" href="https://wa.me/6581601289" target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
          </div>
        </div>

        <div>
          <h4>Information</h4>
          <ul>
            {infoLinks.map(l => (
              <li key={l} onClick={() => setPage(l.toLowerCase().replace(/ /g, '-'))}>{l}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Get in Touch</h4>
          <ul>
            <li>info@gardenroots.com.sg</li>
            <li>+65 8160 1289</li>
            <li>Mon–Sat: 9am–6pm SGT</li>
          </ul>
        </div>

        <div>
          <h4>Connect With Us</h4>
          <ul>
            <li><a href="https://wa.me/6581601289" target="_blank" rel="noreferrer" style={{ color: '#25D366', textDecoration: 'none' }}>💬 WhatsApp Us</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>📸 Instagram</a></li>
            <li><a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>👍 Facebook</a></li>
            <li><a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>💼 LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-copy">© 2026 Garden Roots · All Rights Reserved</div>
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <a href="/admin" style={{ color: 'rgba(255,255,255,0.08)', fontSize: '10px', textDecoration: 'none', margin: '0 8px' }}>Admin</a>
        <a href="/delivery" style={{ color: 'rgba(255,255,255,0.08)', fontSize: '10px', textDecoration: 'none', margin: '0 8px' }}>Delivery</a>
      </div>
    </footer>
  );
}
