import { useState } from 'react';
import { useBooking } from '../context/BookingContext';

export default function AuthPages() {
  const { page, setPage, signup, login, showToast } = useBooking();
  const [isSignup, setIsSignup] = useState(page === 'signup');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!phone || !password) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (phone.length < 10) {
      showToast('Please enter a valid phone number', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (isSignup && password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        await signup(phone, password, role);
      } else {
        await login(phone, password);
      }
    } catch (error) {
      // Error is handled by context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div
        style={{
          maxWidth: '400px',
          margin: '60px auto',
          padding: '40px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h1 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '28px' }}>
          🚛 LorryHub
        </h1>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label>Choose Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="customer">Customer (Shipper)</option>
                <option value="driver">Driver (Transporter)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              placeholder="Enter 10-digit number"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, '').substring(0, 10))
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={loading}
          >
            {loading
              ? 'Processing...'
              : isSignup
              ? 'Create Account'
              : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-light)' }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignup(!isSignup)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </p>

        <button
          onClick={() => setPage('home')}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '12px',
            background: 'var(--border)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text)',
            fontWeight: '500',
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
