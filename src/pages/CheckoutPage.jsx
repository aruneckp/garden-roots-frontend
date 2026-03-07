import { useState } from 'react';
import { useBooking } from '../context/BookingContext';

export default function CheckoutPage() {
  const { setPage, currentBooking, currentUser, addBooking, showToast } = useBooking();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [processing, setProcessing] = useState(false);

  const fare = currentBooking.fare || 450;
  const baseFare = currentBooking.baseFare || 300;
  const distanceCharge = currentBooking.distanceCharge || (fare - baseFare);
  const distance = currentBooking.distance || 50;

  const handlePayment = () => {
    if (!name || !phone) {
      showToast('Please fill in billing details', 'error');
      return;
    }
    setProcessing(true);
    showToast('Processing payment...', 'info');

    setTimeout(() => {
      const newBooking = {
        id: `LH${Date.now().toString().slice(-6)}`,
        from: currentBooking.fromLocation || 'N/A',
        to: currentBooking.toLocation || 'N/A',
        date: currentBooking.date || new Date().toISOString().split('T')[0],
        time: currentBooking.time || '00:00',
        vehicle: currentBooking.vehicleName || 'Mini Truck',
        vehicleId: currentBooking.vehicleType || 2,
        status: 'confirmed',
        driver: 'Being assigned...',
        driverRating: null,
        fare,
        distance,
        weight: currentBooking.weight || '0',
        notes: currentBooking.notes || '',
      };
      addBooking(newBooking);
      setProcessing(false);
      showToast('Booking confirmed! Your lorry is being assigned.', 'success');
      setTimeout(() => setPage('myBookings'), 800);
    }, 1500);
  };

  return (
    <div className="page-container">
      <div className="checkout-page">
        <div className="checkout-form">
          <h2>Complete Payment</h2>

          <div style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>Payment Methods</h3>
            <div className="payment-methods">
              {[
                { id: 'card', label: '💳 Debit/Credit Card', sub: 'Visa, Mastercard, Rupay' },
                { id: 'upi', label: '📱 UPI', sub: 'Google Pay, PhonePe, BHIM' },
                { id: 'netbanking', label: '🏦 Net Banking', sub: 'All major Indian banks' },
                { id: 'wallet', label: '💰 E-Wallets', sub: 'Paytm, FreeCharge, etc.' },
              ].map((m) => (
                <label key={m.id} className="payment-method">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                  />
                  <div>
                    <strong>{m.label}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: 0 }}>{m.sub}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px' }}>Billing Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="Your phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              className="btn btn-outline"
              onClick={() => setPage('booking')}
              style={{ flex: 1 }}
              disabled={processing}
            >
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePayment}
              style={{ flex: 1 }}
              disabled={processing}
            >
              {processing ? 'Processing...' : `Pay ₹${fare}`}
            </button>
          </div>
        </div>

        <div className="order-summary">
          <h3>Order Summary</h3>

          <div className="summary-item">
            <span>From</span>
            <span>{currentBooking.fromLocation || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span>To</span>
            <span>{currentBooking.toLocation || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span>Date</span>
            <span>{currentBooking.date || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span>Time</span>
            <span>{currentBooking.time || 'N/A'}</span>
          </div>
          <div className="summary-item">
            <span>Vehicle</span>
            <span>{currentBooking.vehicleName || 'N/A'}</span>
          </div>
          {currentBooking.weight && (
            <div className="summary-item">
              <span>Weight</span>
              <span>{currentBooking.weight} kg</span>
            </div>
          )}
          <div className="summary-item" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <span>Base Fare</span>
            <span>₹{baseFare}</span>
          </div>
          <div className="summary-item">
            <span>Distance ({distance} km)</span>
            <span>₹{distanceCharge}</span>
          </div>
          <div className="summary-item total">
            <span>Total Amount</span>
            <span>₹{fare}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
