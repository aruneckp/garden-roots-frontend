import { useBooking } from '../context/BookingContext';

export default function Navbar() {
  const { isAuthenticated, currentUser, setPage, logout } = useBooking();

  return (
    <navbar className="navbar">
      <div
        className="navbar-brand"
        onClick={() => setPage('home')}
        style={{ cursor: 'pointer' }}
      >
        🚛 LorryHub
      </div>

      <div className="navbar-nav">
        {isAuthenticated ? (
          <>
            <button className="navbar-link" onClick={() => setPage('booking')}>
              📦 Book Now
            </button>
            <button className="navbar-link" onClick={() => setPage('myBookings')}>
              📋 My Bookings
            </button>
            <button className="navbar-link" onClick={() => setPage('profile')}>
              👤 Profile
            </button>

            <div className="profile-menu">
              <div className="profile-avatar" title={currentUser?.name}>
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                className="navbar-link"
                onClick={logout}
                style={{ marginLeft: '8px' }}
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="navbar-link" onClick={() => setPage('login')}>
              🔑 Login
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setPage('signup')}
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      <button className="hamburger" style={{ marginLeft: 'auto' }}>
        <span></span>
        <span></span>
        <span></span>
      </button>
    </navbar>
  );
}
