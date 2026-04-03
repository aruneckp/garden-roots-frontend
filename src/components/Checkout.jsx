import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { orderApi, paymentApi, locationApi } from '../services/api';

export default function Checkout() {
  const {
    cart, cartTotal, delivery,
    payState, setPayState,
    orderRef, setCart, setToast, setPage,
    incompleteOrderId, setIncompleteOrderId,
    confirmedTotal,
    user, setShowAuthModal,
  } = useApp();

  const [customerForm, setCustomerForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
  });

  // Keep form in sync if user logs in after opening checkout
  useEffect(() => {
    if (user) {
      setCustomerForm(f => ({
        ...f,
        name:  f.name  || user.name  || '',
        email: f.email || user.email || '',
        phone: f.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Delivery type
  const [deliveryType, setDeliveryType] = useState('delivery');

  // Pickup locations
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickupId, setSelectedPickupId] = useState(null);

  useEffect(() => {
    locationApi.getPickupLocations()
      .then(resp => setPickupLocations(resp?.data ?? resp))
      .catch(() => {});
  }, []);

  const selectedPickup = pickupLocations.find(l => l.id === selectedPickupId) || null;

  // Notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Effective delivery fee shown in UI
  const displayDelivery = deliveryType === 'pickup' ? 0 : delivery;
  const displayTotal    = cartTotal + displayDelivery;


  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateOrder = async () => {
    try {
      const { name, email, phone, address } = customerForm;

      if (!name.trim() || !email.trim() || !phone.trim()) {
        showToast('Please fill in your name, email and phone number');
        return null;
      }
      if (deliveryType === 'delivery' && !address.trim()) {
        showToast('Please enter your delivery address');
        return null;
      }
      if (deliveryType === 'pickup' && !selectedPickupId) {
        showToast('Please select a pickup location');
        return null;
      }

      const orderItems = cart.map(item => ({
        product_variant_id: item.variantId ?? item.id,
        quantity: item.qty,
      }));

      const resp = await orderApi.createOrder({
        items:             orderItems,
        customerName:      name,
        customerEmail:     email,
        customerPhone:     phone,
        paymentMethod:     'paynow',
        deliveryType,
        deliveryAddress:   deliveryType === 'delivery' ? address : null,
        pickupLocationId:  deliveryType === 'pickup'   ? selectedPickupId : null,
        customerNotes:     customerNotes.trim() || null,
        userId:            user?.id || null,
      });
      return resp?.data ?? resp;
    } catch (err) {
      showToast(`Order creation failed: ${err.message}`);
      console.error(err);
      return null;
    }
  };

  const handlePayment = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const order = await handleCreateOrder();
    if (!order) return;

    setPayState('processing');
    try {
      const resp = await paymentApi.createPayment(
        displayTotal,
        `Garden Roots Order GR-${order.id}`,
        order.id,
        customerForm.name,
        customerForm.email,
        customerForm.phone,
      );
      const data = resp?.data ?? resp;

      if (!data.payment_url) {
        showToast('Error: Payment URL not received from server');
        setPayState('idle');
        return;
      }

      // Store order ID + HitPay payment UUID so we can recover the order on return
      sessionStorage.setItem('pending_order_id', order.id);
      sessionStorage.setItem('pending_payment_id', data.payment_intent_id);
      // Redirect to HitPay hosted checkout
      window.location.href = data.payment_url;
    } catch (err) {
      showToast(`Payment error: ${err.message}`);
      setPayState('idle');
    }
  };

  // ── Full-page order confirmation (replaces checkout layout after payment) ──
  if (payState === 'success') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(26px,4vw,36px)', color: 'var(--dark)', marginBottom: 8 }}>
          Order Confirmed!
        </h1>
        <p style={{ color: '#78716C', fontSize: 15, marginBottom: 32 }}>
          {deliveryType === 'pickup'
            ? 'Your order is confirmed. We\'ll get it ready for pickup soon!'
            : 'Your order is confirmed and will be on its way shortly!'}
        </p>

        {/* Order number — prominent */}
        <div style={{ background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: 16, padding: '24px 32px', marginBottom: 32, display: 'inline-block', minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Order Reference
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--dark)', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
            {orderRef}
          </div>
          <div style={{ fontSize: 12, color: '#78716C', marginTop: 6 }}>
            Save this number to track your order
          </div>
        </div>

        {/* Items ordered */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dark)', marginBottom: 14 }}>Items Ordered</div>
          {cart.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Qty: {item.qty}</div>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--dark)' }}>${parseFloat(item.price.replace('$', '')) * item.qty}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>
            <span>Total Paid</span>
            <span style={{ color: 'var(--green)' }}>${confirmedTotal ?? displayTotal} SGD</span>
          </div>
        </div>

        {/* What happens next */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '16px 20px', marginBottom: 32, textAlign: 'left', fontSize: 14, color: '#78350F', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>What happens next?</div>
          {deliveryType === 'pickup'
            ? 'We\'ll prepare your order and notify you when it\'s ready for collection at your selected pickup location.'
            : 'We\'ll process and dispatch your order. You\'ll receive it fresh at your delivery address.'}
        </div>

        <button
          className="btn-checkout"
          onClick={() => { setCart([]); setPage('home'); setPayState('idle'); }}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Secure Checkout</h1>
      <p className="checkout-page-sub">Complete your order below</p>

      {/* Incomplete / abandoned order banner */}
      {incompleteOrderId && (
        <div style={{ margin: '0 auto 20px', maxWidth: 760, padding: '14px 18px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
          <span>⚠️ You have an incomplete order <strong>#{incompleteOrderId}</strong> that wasn't paid. Would you like to retry payment?</span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="btn-checkout"
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={async () => {
                setIncompleteOrderId(null);
                sessionStorage.removeItem('pending_order_id');
                setPayState('processing');
                try {
                  const resp = await paymentApi.createPayment(
                    displayTotal,
                    `Garden Roots Order GR-${incompleteOrderId}`,
                    incompleteOrderId,
                    customerForm.name,
                    customerForm.email,
                    customerForm.phone,
                  );
                  const data = resp?.data ?? resp;
                  if (!data.payment_url) { showToast('Error: Payment URL not received'); setPayState('idle'); return; }
                  sessionStorage.setItem('pending_order_id', incompleteOrderId);
                  sessionStorage.setItem('pending_payment_id', data.payment_intent_id);
                  window.location.href = data.payment_url;
                } catch (err) {
                  showToast(`Payment error: ${err.message}`);
                  setPayState('idle');
                }
              }}
            >
              Retry Payment
            </button>
            <button
              className="btn-continue"
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => { setIncompleteOrderId(null); sessionStorage.removeItem('pending_order_id'); }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="checkout-layout">

        {/* Order Summary */}
        <div className="checkout-order-card">
          <h3>Order Summary</h3>
          {cart.map(item => (
            <div className="checkout-order-item" key={item.id}>
              <div className="checkout-order-item-left">
                <span className="checkout-item-emoji">{item.emoji}</span>
                <div>
                  <div className="checkout-item-name">{item.name}</div>
                  <div className="checkout-item-qty">Qty: {item.qty}</div>
                </div>
              </div>
              <div className="checkout-item-price">${parseFloat(item.price.replace('$', '')) * item.qty}</div>
            </div>
          ))}
          <hr className="checkout-divider" />
          <div className="checkout-total-row"><span>Subtotal</span><span>${cartTotal}</span></div>
          <div className="checkout-total-row">
            <span>Delivery</span>
            <span>{displayDelivery === 0 ? (deliveryType === 'pickup' ? 'Free (Self-Pickup) 🏪' : 'Free 🎉') : `$${displayDelivery}`}</span>
          </div>
          <div className="checkout-total-row grand"><span>Total</span><span>${displayTotal} SGD</span></div>
        </div>

        {/* Payment */}
        <div className="payment-card">
          <div className="payment-card-header">
            <h3>Fulfilment & Payment</h3>
          </div>

          {payState === 'processing' ? (
            <div className="payment-body">
              <div className="payment-processing">
                <div className="spinner" />
                <p style={{ color: '#78716C', fontSize: 14 }}>Verifying your payment… please wait</p>
              </div>
            </div>
          ) : payState === 'failed' ? (
            <div className="payment-body">
              <div className="payment-success">
                <div className="success-icon">❌</div>
                <h3>Payment Not Completed</h3>
                <p>Your payment was not completed or has failed. No charge was made.</p>
                <button className="btn-checkout" onClick={() => { sessionStorage.removeItem('pending_order_id'); setPayState('idle'); }}>
                  Try Again →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Delivery Type Toggle */}
              <div className="payment-body" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>Fulfilment Method</h4>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className={`checkout-type-btn${deliveryType === 'delivery' ? ' active' : ''}`}
                    onClick={() => setDeliveryType('delivery')}
                  >
                    🚚 Home Delivery
                  </button>
                  <button
                    className={`checkout-type-btn${deliveryType === 'pickup' ? ' active' : ''}`}
                    onClick={() => setDeliveryType('pickup')}
                  >
                    🏪 Self-Pickup
                  </button>
                </div>
              </div>

              {/* Customer Information */}
              <div className="payment-body" style={{ paddingBottom: 0, borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Contact Details</h4>
                <div className="card-field">
                  <label>Full Name *</label>
                  <input
                    placeholder="Jane Tan"
                    value={customerForm.name}
                    onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="card-field">
                  <label>Email *</label>
                  <input
                    type="email"
                    placeholder="jane@example.com"
                    value={customerForm.email}
                    onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="card-field">
                  <label>Phone Number *</label>
                  <input
                    placeholder="+65 9xxx xxxx"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                {/* Delivery address — only shown for home delivery */}
                {deliveryType === 'delivery' && (
                  <div className="card-field">
                    <label>Delivery Address *</label>
                    <input
                      placeholder="123 Main Street, #04-01, Singapore 123456"
                      value={customerForm.address}
                      onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                )}

                {/* Pickup location selector — only shown for self-pickup */}
                {deliveryType === 'pickup' && (
                  <>
                    <div className="card-field">
                      <label>Pickup Location *</label>
                      <select
                        value={selectedPickupId || ''}
                        onChange={e => setSelectedPickupId(e.target.value ? Number(e.target.value) : null)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: '#fff' }}
                      >
                        <option value="">— Select a location —</option>
                        {pickupLocations.map(loc => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Show selected location details + WhatsApp */}
                    {selectedPickup && (
                      <div style={{ margin: '4px 0 12px', padding: '12px 14px', background: 'var(--cream)', borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{selectedPickup.name}</div>
                        <div style={{ color: 'var(--text)' }}>📍 {selectedPickup.address}</div>
                        {selectedPickup.whatsapp_phone && (
                          <a
                            href={`https://wa.me/${selectedPickup.whatsapp_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#25D366', fontWeight: 600, textDecoration: 'none' }}
                          >
                            💬 WhatsApp: {selectedPickup.whatsapp_phone}
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Notes / feedback — always optional */}
                <div className="card-field">
                  <label>Notes / Comments <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
                  <textarea
                    placeholder="Any special instructions, preferred delivery time, or feedback…"
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* PayNow */}
              <div className="payment-body">
                <div className="paynow-box">
                  <div className="paynow-logo"><span className="paynow-logo-dot" />PayNow</div>
                  <div className="paynow-amount">${displayTotal} SGD <span>to pay</span></div>
                  <div className="paynow-steps">
                    <strong>How to pay with PayNow</strong>
                    1. Click below to generate your secure QR code<br />
                    2. Open your banking app and scan<br />
                    3. Confirm the amount: <strong>${displayTotal} SGD</strong><br />
                    4. Click "I've Completed Payment" after transferring
                  </div>
                  <button className="btn-checkout" onClick={handlePayment}>
                    Pay with PayNow via HitPay →
                  </button>
                </div>
              </div>
            </>
          )}

          {payState === 'idle' && (
            <div style={{ padding: '0 28px 20px', borderTop: '1px solid var(--border)' }}>
              <button className="btn-continue" onClick={() => setPage('cart')}>← Back to Cart</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
