import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { page, setPage, cartCount } = useApp();

  const navLinks = ['Home', 'Varieties', 'Pickup Locations', 'About Us', 'Contact Us'];

  const handleAdminAccess = () => {
    const currentToken = localStorage.getItem('admin_token');
    if (currentToken) {
      window.location.href = '/admin';
    } else {
      // Store intention to go to admin after login
      localStorage.setItem('admin_redirect', 'true');
      window.location.href = '/admin';
    }
  };

  return (
    <>
      <div className="topbar">🥭 Fresh Indian Mangoes Air-Flown to Singapore — Free delivery over $120</div>

<nav className="nav">
        <div className="nav-inner">
          <div className="logo" onClick={() => setPage('home')}>{'🌿 Garden'}<span>{'Roots'}</span></div>
          <ul className="nav-links">
            {navLinks.map(l => (
              <li key={l}>
                <a href="#" onClick={e => { e.preventDefault(); setPage(l.toLowerCase().replace(/ /g, '-')); }}>
                  {l}
                </a>
              </li>
            ))}
          </ul>
          <div className="nav-actions">
            <button className="cart-btn" onClick={() => setPage('cart')}>
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            <button className="btn-outline" onClick={handleAdminAccess}>Admin</button>
            <button className="btn-primary">Sign Up</button>
          </div>
        </div>
      </nav>
    </>
  );
}
