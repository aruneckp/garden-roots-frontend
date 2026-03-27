import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { setPage, cartCount } = useApp();

  const navLinks = ['Home', 'Varieties', 'Pickup Locations', 'About Us', 'Contact Us'];

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
            <button className="btn-outline">Login</button>
            <button className="btn-primary">Sign Up</button>
          </div>
        </div>
      </nav>
    </>
  );
}
