import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

const FALLBACK_MESSAGES = ['🥭 Fresh Indian Mangoes Air-Flown to Singapore — Free delivery over $120'];

export default function Navbar() {
  const { setPage, cartCount, user, logoutUser, setShowAuthModal, setAdminView, setAdminInitialTab, siteConfig } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);

  const bannerMessages = siteConfig?.banner_messages
    ? siteConfig.banner_messages.split('|').map(m => m.trim()).filter(Boolean)
    : FALLBACK_MESSAGES;

  useEffect(() => {
    if (bannerMessages.length <= 1) return;
    const timer = setInterval(() => {
      setBannerVisible(false);
      setTimeout(() => {
        setBannerIndex(i => (i + 1) % bannerMessages.length);
        setBannerVisible(true);
      }, 500);
    }, 4000);
    return () => clearInterval(timer);
  }, [bannerMessages.length]);

  const navLinks = ['Home', 'Varieties', 'About Us', 'Contact Us'];

  const navigate = (link) => {
    setPage(link.toLowerCase().replace(/ /g, '-'));
    setMobileOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="topbar" style={{ overflow: 'hidden' }}>
        <span style={{
          display: 'inline-block',
          transition: bannerVisible
            ? 'opacity 0.7s ease, transform 0.7s ease'
            : 'opacity 0.2s ease, transform 0.2s ease',
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateY(0)' : 'translateY(8px)',
        }}>
          {bannerMessages[bannerIndex]}
        </span>
      </div>

      <nav className="nav" ref={navRef}>
        <div className="nav-inner">
          {/* Hamburger button — mobile only, left side */}
          <button
            className={`hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="logo" onClick={() => { setPage('home'); setMobileOpen(false); }}>
            {'🌿 '}
            <span style={{ color: 'inherit' }}>Garden<span style={{ color: 'var(--mango)' }}>Roots</span></span>
          </div>

          {/* Desktop nav links */}
          <ul className="nav-links">
            {navLinks.map(l => (
              <li key={l}>
                <a href="#" onClick={e => { e.preventDefault(); navigate(l); }}>
                  {l}
                </a>
              </li>
            ))}
            {user?.role === 'admin' && (
              <>
                <li>
                  <a
                    href="#"
                    className="admin-nav-link"
                    onClick={e => { e.preventDefault(); setAdminInitialTab('reports'); setAdminView('admin'); }}
                  >
                    🔧 Admin
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="admin-nav-link"
                    onClick={e => { e.preventDefault(); setAdminInitialTab('delivery'); setAdminView('admin'); }}
                  >
                    🛵 Delivery
                  </a>
                </li>
              </>
            )}
          </ul>

          <div className="nav-actions">
            <button className="cart-btn" onClick={() => { setPage('cart'); setMobileOpen(false); }}>
              🛒
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
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
              <button className="btn-primary sign-in-btn" onClick={() => setShowAuthModal(true)}>
                Sign In
              </button>
            )}

          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileOpen && (
          <div className="mobile-nav">
            <ul>
              {navLinks.map(l => (
                <li key={l}>
                  <a href="#" onClick={e => { e.preventDefault(); navigate(l); }}>
                    {l}
                  </a>
                </li>
              ))}
              <li className="mobile-nav-divider" />
              <li>
                <a href="#" onClick={e => { e.preventDefault(); setPage('cart'); setMobileOpen(false); }}>
                  🛒 Cart {cartCount > 0 && `(${cartCount})`}
                </a>
              </li>
              {user ? (
                <>
                  <li>
                    <a href="#" onClick={e => { e.preventDefault(); setPage('my-bookings'); setMobileOpen(false); }}>
                      My Bookings
                    </a>
                  </li>
                  {user.role === 'admin' && (
                    <>
                      <li className="mobile-nav-divider" />
                      <li>
                        <a href="#" className="admin-nav-link" onClick={e => { e.preventDefault(); setAdminInitialTab('reports'); setAdminView('admin'); setMobileOpen(false); }}>
                          🔧 Admin Panel
                        </a>
                      </li>
                      <li>
                        <a href="#" className="admin-nav-link" onClick={e => { e.preventDefault(); setAdminInitialTab('delivery'); setAdminView('admin'); setMobileOpen(false); }}>
                          🛵 Delivery Portal
                        </a>
                      </li>
                    </>
                  )}
                  <li>
                    <a href="#" className="logout-link" onClick={e => { e.preventDefault(); logoutUser(); setMobileOpen(false); }}>
                      Sign Out
                    </a>
                  </li>
                </>
              ) : (
                <li>
                  <a href="#" onClick={e => { e.preventDefault(); setShowAuthModal(true); setMobileOpen(false); }}>
                    Sign In
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
