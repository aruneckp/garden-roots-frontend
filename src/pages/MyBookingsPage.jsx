import { useBooking } from '../context/BookingContext';
import { useState } from 'react';

const STATUS_COLOR = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  'in-transit': 'status-in-transit',
  completed: 'status-completed',
  cancelled: '',
};

const STATUS_LABEL = {
  pending: '⏳ Pending',
  confirmed: '✓ Confirmed',
  'in-transit': '🚛 In Transit',
  completed: '✓ Completed',
  cancelled: '✕ Cancelled',
};

export default function MyBookingsPage() {
  const { setPage, userBookings } = useBooking();
  const [activeTab, setActiveTab] = useState('active');

  const filteredBookings = userBookings.filter((b) => {
    if (activeTab === 'active') return ['pending', 'confirmed', 'in-transit'].includes(b.status);
    return b.status === activeTab;
  });

  return (
    <div className="page-container">
      <div className="bookings-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <h1>📋 My Bookings</h1>
          <button className="btn btn-primary" onClick={() => setPage('booking')}>
            + New Booking
          </button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', count: userBookings.length, color: 'var(--primary)' },
            { label: 'Active', count: userBookings.filter(b => ['pending','confirmed','in-transit'].includes(b.status)).length, color: '#f59e0b' },
            { label: 'Completed', count: userBookings.filter(b => b.status === 'completed').length, color: '#10b981' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'white', borderRadius: '8px', padding: '12px 20px', boxShadow: 'var(--shadow)', minWidth: '100px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="booking-tabs">
          {['active', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              className={`booking-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'active' && userBookings.filter(b => ['pending','confirmed','in-transit'].includes(b.status)).length > 0 && (
                <span style={{ marginLeft: '6px', background: 'var(--primary)', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                  {userBookings.filter(b => ['pending','confirmed','in-transit'].includes(b.status)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredBookings.length > 0 ? (
          <div className="bookings-grid">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <span className="booking-id">{booking.id}</span>
                  <span className={`booking-status ${STATUS_COLOR[booking.status] || ''}`}>
                    {STATUS_LABEL[booking.status] || booking.status}
                  </span>
                </div>

                <div className="booking-details">
                  <div className="detail-row">
                    <span className="detail-label">📍 From</span>
                    <span>{booking.from}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">📍 To</span>
                    <span>{booking.to}</span>
                  </div>
                  {booking.distance && (
                    <div className="detail-row">
                      <span className="detail-label">📏 Distance</span>
                      <span>{booking.distance} km</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="detail-label">📅 Date</span>
                    <span>{new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🚛 Vehicle</span>
                    <span>{booking.vehicle}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">👤 Driver</span>
                    <span>{booking.driver}</span>
                  </div>
                  {booking.driverRating && (
                    <div className="detail-row">
                      <span className="detail-label">⭐ Rating</span>
                      <span>{booking.driverRating}</span>
                    </div>
                  )}
                  <div className="detail-row" style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px' }}>
                    <span className="detail-label" style={{ fontWeight: 700 }}>Fare</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{booking.fare}</span>
                  </div>
                </div>

                <div className="booking-actions">
                  {['pending', 'confirmed', 'in-transit'].includes(booking.status) && (
                    <>
                      <button className="btn btn-primary btn-sm">Track</button>
                      <button className="btn btn-outline btn-sm">Chat</button>
                    </>
                  )}
                  {booking.status === 'completed' && (
                    <>
                      <button className="btn btn-outline btn-sm">Invoice</button>
                      <button className="btn btn-outline btn-sm">Rate</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No {activeTab} bookings</h3>
            <p>
              {activeTab === 'active'
                ? 'You have no active bookings. Create one now!'
                : 'No bookings in this category yet.'}
            </p>
            <button className="btn btn-primary" onClick={() => setPage('booking')} style={{ marginTop: '16px' }}>
              Book Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
