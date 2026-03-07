import { useBooking } from '../context/BookingContext';
import { useState } from 'react';

export default function ProfilePage() {
  const { currentUser, userBookings, setPage, logout, showToast } = useBooking();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
  });

  const totalSpent = userBookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.fare || 0), 0);
  const completedCount = userBookings.filter((b) => b.status === 'completed').length;
  const activeCount = userBookings.filter((b) =>
    ['pending', 'confirmed', 'in-transit'].includes(b.status)
  ).length;

  const handleSave = () => {
    if (!formData.name) {
      showToast('Please enter your name', 'error');
      return;
    }
    showToast('Profile updated successfully!', 'success');
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '600px', margin: '40px auto' }}>
        <h1 style={{ marginBottom: '32px' }}>👤 My Profile</h1>

        {/* Profile Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
            color: 'white',
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 16px',
            }}
          >
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <h2 style={{ color: 'white', marginBottom: '4px' }}>{currentUser?.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}>
            {currentUser?.role === 'driver' ? '🚛 Transporter' : '📦 Shipper'}
          </p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Bookings', value: userBookings.length },
              { label: 'Active', value: activeCount },
              { label: 'Completed', value: completedCount },
              { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}` },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Information */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3>Personal Information</h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Phone Number (Read-only)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  disabled
                  style={{ background: 'var(--border)' }}
                />
              </div>

              <button className="btn btn-primary" onClick={handleSave} style={{ width: '100%' }}>
                Save Changes
              </button>
            </>
          ) : (
            <div className="booking-details">
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span>{formData.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <span>{formData.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span>{formData.phone}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Role:</span>
                <span>{currentUser?.role === 'driver' ? 'Transporter' : 'Shipper'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Saved Addresses */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px' }}>📍 Saved Addresses</h3>
          <div style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px' }}>
            <p>No saved addresses yet. Add your frequent locations for faster bookings.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>
              + Add Address
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px' }}>💳 Payment Methods</h3>
          <div style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px' }}>
            <p>No saved payment methods. Add one for faster checkout.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: '12px' }}>
              + Add Payment Method
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '16px' }}>⚙️ Account Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
            >
              🔐 Change Password
            </button>
            <button
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
            >
              🔔 Notifications Settings
            </button>
            <button
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
            >
              📋 View Terms & Conditions
            </button>
            <button
              className="btn btn-outline"
              style={{ justifyContent: 'flex-start' }}
            >
              👥 Refer a Friend
            </button>
          </div>
        </div>

        {/* Recent Bookings Quick View */}
        {userBookings.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Recent Bookings</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setPage('myBookings')}>View All</button>
            </div>
            {userBookings.slice(0, 3).map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{b.from} → {b.to}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{b.vehicle} • {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{b.fare}</div>
                  <div style={{ fontSize: '11px', color: b.status === 'completed' ? '#10b981' : b.status === 'in-transit' ? '#3b82f6' : '#f59e0b' }}>
                    {b.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logout */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: 'var(--shadow)' }}>
          <button
            className="btn btn-outline"
            style={{ width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }}
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}
