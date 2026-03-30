import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const { page, setPage, cartCount, user, logoutUser, setShowAuthModal } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navLinks = ['Home', 'Varieties', 'Pickup Locations', 'About Us', 'Contact Us'];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

            {/* Admin button — disabled in UI; access /admin manually via URL */}
            <button className="btn-outline" disabled style={{ opacity: 0.35, cursor: 'not-allowed' }}>
              Admin
            </button>

            {user ? (
              <div className="user-menu" ref={menuRef}>
                <img
                  src={user.picture || ''}
                  alt={user.name}
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                  onClick={() => setMenuOpen(prev => !prev)}
                  style={{ display: user.picture ? 'block' : 'none' }}
                />
                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-name">{user.name || user.email}</div>
                    <button
                      className="user-dropdown-item"
                      onClick={() => { setPage('my-bookings'); setMenuOpen(false); }}
                    >
                      My Bookings
                    </button>
                    <button
                      className="user-dropdown-item logout"
                      onClick={() => { logoutUser(); setMenuOpen(false); }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-primary" onClick={() => setShowAuthModal(true)}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
