import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { orderApi, paymentApi, locationApi, promoApi } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
import SimpleDeliveryFee from './SimpleDeliveryFee';

export default function Checkout() {
  const {
    cart, cartTotal, updateQty,
    payState, setPayState,
    orderRef, setOrderRef, setCart, setToast, setPage,
    incompleteOrderId, setIncompleteOrderId,
    confirmedTotal,
    user, userToken, loginUser, setToast: setAppToast,
  } = useApp();

  const [customerForm, setCustomerForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
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

  // Payment method — admins can choose Pay Later for phone orders
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('paynow');

  // Dynamic delivery fee — updated by SimpleDeliveryFee via onDeliveryFeeChange
  const [dynamicDeliveryFee, setDynamicDeliveryFee] = useState(10);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(null);

  // Structured delivery address fields
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryArea,       setDeliveryArea]       = useState('');
  const [deliveryStreet,     setDeliveryStreet]     = useState('');
  const [deliveryUnitNo,     setDeliveryUnitNo]     = useState('');
  // True once the delivery fee API has resolved (used as gate for checkout validation)
  const [deliveryFeeLoaded,  setDeliveryFeeLoaded]  = useState(false);

  const handleDeliveryFeeChange = useCallback((fee) => {
    setDynamicDeliveryFee(fee);
    setDeliveryFeeLoaded(true);
  }, []);

  // Promo code
  const [promoInput,    setPromoInput]    = useState('');
  const [promoApplied,  setPromoApplied]  = useState(null);  // { promo_code_id, code, discount_amount, message }
  const [promoLoading,  setPromoLoading]  = useState(false);
  const [promoError,    setPromoError]    = useState(null);

  // When switching to pickup, clear all delivery fields
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setDynamicDeliveryFee(0);
      setDeliveryPostalCode('');
      setDeliveryArea('');
      setDeliveryStreet('');
      setDeliveryUnitNo('');
      setDeliveryFeeLoaded(false);
    }
  }, [deliveryType]);

  // Constructed delivery address from structured fields
  const deliveryAddress = (deliveryStreet || deliveryArea)
    ? [deliveryUnitNo.trim(), deliveryStreet || deliveryArea, `Singapore ${deliveryPostalCode}`]
        .filter(Boolean).join(', ')
    : '';

  // Effective delivery fee shown in UI — zero if pickup or cart meets free-delivery threshold
  const qualifiesFreeDelivery = freeDeliveryThreshold != null && cartTotal >= freeDeliveryThreshold;
  const displayDelivery = (deliveryType === 'pickup' || qualifiesFreeDelivery) ? 0 : dynamicDeliveryFee;
  const discountAmount   = promoApplied ? Number(promoApplied.discount_amount) : 0;
  const displayTotal     = cartTotal - discountAmount + displayDelivery;

  // Guest / Google sign-in banner state
  const googleBtnRef = useRef(null);
  const [guestMode, setGuestMode] = useState(false);
  const [googleAuthenticating, setGoogleAuthenticating] = useState(false);

  // Initialise Google Identity Services for the inline checkout banner
  useEffect(() => {
    if (user || guestMode) return;
    if (!window.google || !googleBtnRef.current) return;
    let cancelled = false;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        if (cancelled) return;
        setGoogleAuthenticating(true);
        try {
          const { authApi } = await import('../services/api');
          const result = await authApi.googleLogin(response.credential);
          const { token, user: userData } = result?.data ?? result;
          loginUser(token, userData);
          setAppToast(`Welcome, ${userData.name || userData.email}! 🥭`);
          setTimeout(() => setAppToast(null), 3000);
        } catch (err) {
          showToast(`Login failed: ${err.message}`);
        } finally {
          setGoogleAuthenticating(false);
        }
      },
    });
    googleBtnRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline', size: 'large', text: 'continue_with',
      shape: 'rectangular', width: 260,
    });
    return () => { cancelled = true; };
  }, [user, guestMode]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const res = await promoApi.validate({
        code:               promoInput.trim(),
        order_subtotal:     cartTotal,
        user_id:            user?.id || null,
        delivery_type:      deliveryType,
        pickup_location_id: deliveryType === 'pickup' ? selectedPickupId : null,
      }, user?.role === 'admin' ? userToken : null);
      const data = res?.data ?? res;
      setPromoApplied(data);
    } catch (err) {
      setPromoError(err.message || 'Invalid promo code');
      setPromoApplied(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setPromoApplied(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleCreateOrder = async () => {
    try {
      const { name, email, phone } = customerForm;

      if (!name.trim() || !email.trim() || !phone.trim()) {
        showToast('Please fill in your name, email and phone number');
        return null;
      }
      if (deliveryType === 'delivery') {
        if (deliveryPostalCode.length !== 6) {
          showToast('Please enter a valid 6-digit postal code');
          return null;
        }
        if (!deliveryFeeLoaded) {
          showToast('Delivery fee not loaded yet — please wait a moment');
          return null;
        }
        if (!deliveryUnitNo.trim()) {
          showToast('Please enter your block or unit number');
          return null;
        }
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
        paymentMethod:     selectedPaymentMethod,
        deliveryType,
        deliveryAddress:   deliveryType === 'delivery' ? deliveryAddress : null,
        pickupLocationId:  deliveryType === 'pickup'   ? selectedPickupId : null,
        postalCode:        deliveryType === 'delivery' ? deliveryPostalCode : null,
        customerNotes:     customerNotes.trim() || null,
        promoCode:         promoApplied?.code || null,
        userId:            user?.id || null,
        token:             userToken || null,
      });
      return resp?.data ?? resp;
    } catch (err) {
      showToast(`Order creation failed: ${err.message}`);
      console.error(err);
      return null;
    }
  };

  const handlePayment = async () => {
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

  const handlePayLater = async () => {
    const order = await handleCreateOrder();
    if (!order) return;
    setOrderRef(order.order_ref);
    setPayState('success');
  };

  // ── Full-page order confirmation (replaces checkout layout after payment) ──
  if (payState === 'success') {
    return (
      <div className="confirm-page">
        {/* GardenRoots brand icon — all screens */}
        <div className="confirm-brand-icon">
          <span className="confirm-gr-icon">🌿</span>
          <span className="confirm-gr-text">Garden<strong>Roots</strong></span>
        </div>
        <h1 className="confirm-title">
          Order Confirmed!
        </h1>
        <p className="confirm-sub">
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
                {item.image
                  ? <img src={item.image} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--mango-light)' }} />
                  : <span style={{ fontSize: 22 }}>{item.emoji}</span>}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--dark)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#78716C' }}>Qty: {item.qty}</div>
                </div>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--dark)' }}>${parseFloat(item.price.replace('$', '')) * item.qty}</div>
            </div>
          ))}
          {promoApplied && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 14, color: '#16A34A', fontWeight: 600 }}>
              <span>🎉 Promo ({promoApplied.code}) saved you</span>
              <span>−${Number(promoApplied.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontWeight: 700, fontSize: 16, color: 'var(--dark)' }}>
            <span>{selectedPaymentMethod === 'pay_later' ? 'Amount to Collect' : 'Total Paid'}</span>
            <span style={{ color: selectedPaymentMethod === 'pay_later' ? '#d97706' : 'var(--green)' }}>${confirmedTotal ?? displayTotal.toFixed(2)} SGD</span>
          </div>
        </div>

        {/* Pickup address — shown only for self-collection */}
        {deliveryType === 'pickup' && selectedPickup && (
          <div style={{ background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              📍 Self-Collection Address
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--dark)', marginBottom: 4 }}>{selectedPickup.name}</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 6 }}>
              {selectedPickup.address}
            </div>
            {selectedPickup.hours && (
              <div style={{ fontSize: 12, color: 'var(--green-mid)', fontWeight: 500 }}>
                🕐 {selectedPickup.hours}
              </div>
            )}
            {selectedPickup.whatsapp_phone && (
              <a
                href={`https://wa.me/${selectedPickup.whatsapp_phone.replace(/\D/g, '')}?text=Hi! I'd like to arrange pickup for order ${orderRef}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, fontWeight: 600, color: '#16A34A', textDecoration: 'none' }}
              >
                💬 WhatsApp to Confirm Pickup Slot
              </a>
            )}
          </div>
        )}

        {/* What happens next */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '16px 20px', marginBottom: 32, textAlign: 'left', fontSize: 14, color: '#78350F', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>What happens next?</div>
          {selectedPaymentMethod === 'pay_later'
            ? 'Order confirmed. Payment to be collected from the customer. Go to Admin → Orders to mark payment as received once collected.'
            : deliveryType === 'pickup'
              ? 'We\'ll prepare your order and notify you when it\'s ready for collection. WhatsApp us to confirm your pickup slot.'
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

  if (cart.length === 0 && payState !== 'success') {
    return (
      <div className="checkout-page" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--dark)', marginBottom: 8 }}>Your cart is empty</h2>
        <p style={{ color: '#78716C', fontSize: 15, marginBottom: 28 }}>Looks like you haven't added anything yet. Browse our premium mango varieties and pick your favourites!</p>
        <button className="btn-hero" onClick={() => setPage('home')}>Shop Mangoes 🥭</button>
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
                {item.image
                  ? <img src={item.image} alt={item.name} className="checkout-item-img" />
                  : <span className="checkout-item-emoji">{item.emoji}</span>}
                <div className="checkout-item-name">{item.name}</div>
              </div>
              <div className="checkout-item-qty-ctrl">
                <button className="checkout-qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                <span className="checkout-qty-num">{item.qty}</span>
                <button className="checkout-qty-btn" onClick={() => updateQty(item.id, +1)}>+</button>
              </div>
              <div className="checkout-item-price">${(parseFloat(item.price.replace('$', '')) * item.qty).toFixed(2)}</div>
            </div>
          ))}
          <hr className="checkout-divider" />
          <div className="checkout-total-row"><span>Subtotal</span><span>${cartTotal}</span></div>
          {/* Free delivery nudge */}
          {deliveryType === 'delivery' && freeDeliveryThreshold != null && !qualifiesFreeDelivery && (
            <div style={{ fontSize: 12, color: '#d97706', fontWeight: 600, margin: '2px 0 4px', textAlign: 'right' }}>
              Add ${(freeDeliveryThreshold - cartTotal).toFixed(2)} more for free delivery 🚚
            </div>
          )}
          {deliveryType === 'delivery' && qualifiesFreeDelivery && (
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, margin: '2px 0 4px', textAlign: 'right' }}>
              You qualify for free delivery! 🎉
            </div>
          )}
          {/* Promo discount row */}
          {promoApplied && (
            <div className="checkout-total-row" style={{ color: '#16A34A' }}>
              <span>Promo ({promoApplied.code})</span>
              <span>−${Number(promoApplied.discount_amount).toFixed(2)}</span>
            </div>
          )}
          {/* Delivery row — show once fee resolved, or immediately if already free */}
          {(deliveryType === 'pickup' || deliveryFeeLoaded || qualifiesFreeDelivery) && (
            <div className="checkout-total-row">
              <span>Delivery</span>
              <span>
                {deliveryType === 'pickup'
                  ? 'Free (Self-Pickup) 🏪'
                  : displayDelivery === 0
                    ? 'Free 🎉'
                    : `$${displayDelivery}`}
              </span>
            </div>
          )}
          <div className="checkout-total-row grand">
            <span>Total</span>
            <span>${deliveryType === 'pickup' || deliveryFeeLoaded || qualifiesFreeDelivery ? displayTotal.toFixed(2) : cartTotal} SGD</span>
          </div>
        </div>

        {/* Payment */}
        <div className="payment-card">
          <div className="payment-card-header">
            <h3>Fulfilment & Payment</h3>
          </div>

          {payState === 'processing' ? (
            <div className="payment-body">
              <div className="payment-processing">
                <div className="mango-loader">
                  <span className="mango-loader-emoji">🥭</span>
                  <div className="mango-loader-dots">
                    <span /><span /><span />
                  </div>
                  <div className="mango-loader-text">Verifying your payment…</div>
                </div>
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
              {/* Google sign-in or guest banner — only for non-logged-in users */}
              {!user && !guestMode && (
                <div className="payment-body" style={{ borderBottom: '1px solid var(--border)', textAlign: 'center', paddingBottom: 20 }}>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                    Sign in to track your order, or continue as a guest.
                  </p>
                  {googleAuthenticating ? (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>Signing in…</div>
                  ) : (
                    <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }} />
                  )}
                  <button
                    onClick={() => setGuestMode(true)}
                    style={{
                      marginTop: 4, background: 'none', border: '1px solid #d1d5db',
                      borderRadius: 6, padding: '9px 24px', fontSize: 13, fontWeight: 600,
                      color: '#374151', cursor: 'pointer', width: '100%', maxWidth: 260,
                    }}
                  >
                    Continue as Guest
                  </button>
                </div>
              )}

              {!user && guestMode && (
                <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Checking out as guest</span>
                  <button
                    onClick={() => setGuestMode(false)}
                    style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Sign in instead
                  </button>
                </div>
              )}

              {/* Show checkout form only after choosing login or guest */}
              {(user || guestMode) && <>
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

                {/* Delivery address — postal code → area auto-detected → unit no */}
                {deliveryType === 'delivery' && (
                  <>
                    {/* 1. Postal Code */}
                    <div className="card-field">
                      <label>Postal Code *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="e.g. 521234"
                        value={deliveryPostalCode}
                        onChange={e => {
                          setDeliveryPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setDeliveryFeeLoaded(false);
                          setDeliveryArea('');
                          setDeliveryStreet('');
                        }}
                        style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}
                      />
                      {deliveryPostalCode.length > 0 && deliveryPostalCode.length < 6 && (
                        <span style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginTop: 4 }}>
                          Enter all 6 digits
                        </span>
                      )}
                    </div>

                    {/* 2. Auto-detected address + fee (shown once 6 digits entered) */}
                    {deliveryPostalCode.length === 6 && (
                      <div className="card-field">
                        <SimpleDeliveryFee
                          postalCode={deliveryPostalCode}
                          cartTotal={cartTotal}
                          onDeliveryFeeChange={handleDeliveryFeeChange}
                          onAreaChange={setDeliveryArea}
                          onStreetChange={setDeliveryStreet}
                          onFreeThresholdChange={setFreeDeliveryThreshold}
                          isFreeDelivery={qualifiesFreeDelivery}
                        />
                      </div>
                    )}

                    {/* 3. Auto-populated street address (editable in case user needs to correct) */}
                    {deliveryStreet && (
                      <div className="card-field">
                        <label>Street Address <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(auto-filled)</span></label>
                        <input
                          value={deliveryStreet}
                          onChange={e => setDeliveryStreet(e.target.value)}
                        />
                      </div>
                    )}

                    {/* 4. Unit / Block Number */}
                    <div className="card-field">
                      <label>Block / Unit Number *</label>
                      <input
                        placeholder="#05-123  or  Blk 521"
                        value={deliveryUnitNo}
                        onChange={e => setDeliveryUnitNo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Pickup location selector — only shown for self-pickup */}
                {deliveryType === 'pickup' && (
                  <>
                    <div className="card-field">
                      <label>Pickup Location *</label>
                      <div className="pickup-location-btns">
                        {pickupLocations.map(loc => (
                          <button
                            key={loc.id}
                            type="button"
                            className={`pickup-location-btn${selectedPickupId === loc.id ? ' active' : ''}`}
                            onClick={() => setSelectedPickupId(loc.id)}
                          >
                            📍 {loc.name}
                          </button>
                        ))}
                      </div>
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

                {/* Promo code */}
                <div className="card-field">
                  <label>Promo Code <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
                  {promoApplied ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                      <span style={{ fontSize: 16 }}>🎉</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#16A34A', fontSize: 14 }}>{promoApplied.code}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{promoApplied.message}</div>
                      </div>
                      <button onClick={removePromo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, lineHeight: 1 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        placeholder="Enter promo code"
                        value={promoInput}
                        onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                        onKeyDown={e => e.key === 'Enter' && applyPromo()}
                        style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                        disabled={promoLoading}
                      />
                      <button
                        onClick={applyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--green)', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {promoLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {promoError && (
                    <span style={{ fontSize: 12, color: '#DC2626', display: 'block', marginTop: 5 }}>{promoError}</span>
                  )}
                </div>

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

              {/* Admin: payment method selector */}
              {user?.role === 'admin' && (
                <div className="payment-body" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <h4 style={{ marginBottom: 10, fontSize: 14, fontWeight: 600 }}>Payment Method</h4>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className={`checkout-type-btn${selectedPaymentMethod === 'paynow' ? ' active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('paynow')}
                    >
                      PayNow
                    </button>
                    <button
                      className={`checkout-type-btn${selectedPaymentMethod === 'pay_later' ? ' active' : ''}`}
                      onClick={() => setSelectedPaymentMethod('pay_later')}
                    >
                      💰 Pay Later
                    </button>
                  </div>
                  {selectedPaymentMethod === 'pay_later' && (
                    <p style={{ fontSize: 12, color: '#78716C', marginTop: 8 }}>
                      Order confirmed immediately. Payment collected from customer later and updated in admin panel.
                    </p>
                  )}
                </div>
              )}

              {/* PayNow */}
              {selectedPaymentMethod === 'paynow' && (
              <div className="payment-body">
                <div className="paynow-box">
                  <div className="paynow-logo"><span className="paynow-logo-dot" />PayNow</div>
                  <div className="paynow-amount">${displayTotal} SGD <span>to pay</span></div>
                  <button className="btn-checkout" onClick={handlePayment}>
                    Pay with PayNow via HitPay →
                  </button>
                </div>
              </div>
              )}

              {/* Pay Later — admin only */}
              {selectedPaymentMethod === 'pay_later' && (
                <div className="payment-body">
                  <div className="paynow-box" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💰</div>
                    <div className="paynow-amount">${displayTotal} SGD <span>to collect</span></div>
                    <button className="btn-checkout" style={{ background: '#d97706' }} onClick={handlePayLater}>
                      Confirm Order — Collect Payment Later →
                    </button>
                  </div>
                </div>
              )}
            </>}
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
