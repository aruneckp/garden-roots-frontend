import { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { orderApi, paymentApi } from '../services/api';

export default function Checkout() {
  const {
    cart, cartTotal, delivery,
    payState, setPayState,
    orderRef, setOrderRef, setCart, setToast, setPage,
    paynowQrUrl, setPaynowQrUrl, paynowPiId, setPaynowPiId, cancelPaynow,
  } = useApp();

  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const paynowPollRef = useRef(null);

  useEffect(() => () => { if (paynowPollRef.current) clearInterval(paynowPollRef.current); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreateOrder = async () => {
    try {
      const { name, email, phone, address } = customerForm;
      if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
        showToast('Please fill in all required fields');
        return null;
      }

      const orderItems = cart.map(item => ({
        product_variant_id: item.variantId ?? item.id,
        quantity: item.qty
      }));

      const resp = await orderApi.createOrder({
        items: orderItems,
        customerName: customerForm.name,
        customerEmail: customerForm.email,
        customerPhone: customerForm.phone,
        deliveryAddress: customerForm.address,
        paymentMethod: 'paynow'
      });
      const orderData = resp?.data ?? resp;
      return orderData;
    } catch (err) {
      showToast(`Order creation failed: ${err.message}`);
      console.error(err);
      return null;
    }
  };

  // Called when polling detects 'succeeded'
  const finalisePayment = async (orderId, intentId) => {
    if (paynowPollRef.current) clearInterval(paynowPollRef.current);
    try {
      const confirmResult = await paymentApi.confirmPayment(orderId, intentId);
      const confirmData = confirmResult?.data ?? confirmResult;
      if (confirmData.order_ref) {
        setOrderRef(confirmData.order_ref);
      }
      setPayState('success');
    } catch (confirmErr) {
      showToast(`Order confirmation failed: ${confirmErr.message}`);
      console.error('Payment confirmation error:', confirmErr);
      setPayState('idle');
    }
  };

  const handlePayment = async () => {
    const order = await handleCreateOrder();
    if (!order) return;

    setCurrentOrderId(order.id);
    setPayState('processing');
    try {
      const resp = await paymentApi.createPayment(
        cartTotal + delivery,
        `Garden Roots Order GR-${order.id}`,
        order.id
      );
      const data = resp?.data ?? resp;

      if (!data.payment_intent_id) {
        showToast('Error: Payment intent ID not received from server');
        setPayState('idle');
        return;
      }

      setPaynowQrUrl(data.qr_url);
      setPaynowPiId(data.payment_intent_id);
      setPayState('qr_shown');

      // Poll every 3s — catches webhook-driven status updates in production
      paynowPollRef.current = setInterval(async () => {
        try {
          const r = await paymentApi.getPaymentStatus(data.payment_intent_id);
          const d = r?.data ?? r;
          if (d.status === 'succeeded') {
            // Webhook already marked it — finalise the order
            await finalisePayment(order.id, data.payment_intent_id);
          } else if (d.status === 'expired' || d.status === 'requires_payment_method') {
            clearInterval(paynowPollRef.current);
            setPaynowQrUrl(null);
            setPaynowPiId(null);
            setPayState('expired');
          }
        } catch (_) { /* network glitch — keep polling */ }
      }, 3000);
    } catch (err) {
      showToast(`Payment error: ${err.message}`);
      setPayState('idle');
    }
  };

  return (
    <div className="checkout-page">
      <h1>Secure Checkout</h1>
      <p className="checkout-page-sub">Complete your order below</p>
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
          <div className="checkout-total-row"><span>Delivery</span><span>{delivery === 0 ? 'Free 🎉' : `$${delivery}`}</span></div>
          <div className="checkout-total-row grand"><span>Total</span><span>${cartTotal + delivery} SGD</span></div>
        </div>

        {/* Payment */}
        <div className="payment-card">
          <div className="payment-card-header">
            <h3>Delivery & Payment</h3>
          </div>

          {payState === 'success' ? (
            <div className="payment-body">
              <div className="payment-success">
                <div className="success-icon">✅</div>
                <h3>Payment Successful!</h3>
                <p>Thank you for your order. Your fresh mangoes are on their way! 🥭</p>
                <div className="order-ref">Order Ref: {orderRef}</div>
                <button className="btn-checkout" onClick={() => { setCart([]); setPage('home'); setPayState('idle'); }}>
                  Back to Home
                </button>
              </div>
            </div>
          ) : payState === 'processing' ? (
            <div className="payment-body">
              <div className="payment-processing">
                <div className="spinner" />
                <p style={{ color: '#78716C', fontSize: 14 }}>Creating your PayNow payment…</p>
              </div>
            </div>
          ) : payState === 'qr_shown' ? (
            <div className="payment-body">
              <div className="paynow-box">
                <div className="paynow-logo"><span className="paynow-logo-dot" />PayNow</div>
                <div className="qr-frame">
                  <img src={paynowQrUrl} alt="PayNow QR Code" style={{ width: 154, height: 154, display: 'block' }} />
                </div>
                <div className="paynow-amount">${cartTotal + delivery} SGD <span>to pay</span></div>
                <div className="paynow-steps">
                  <strong>How to pay with PayNow</strong>
                  1. Open your banking app (DBS/OCBC/UOB…)<br />
                  2. Select PayNow → Scan QR<br />
                  3. Verify amount: <strong>${cartTotal + delivery} SGD</strong><br />
                  4. Page updates automatically once payment is received
                </div>
                <div className="paynow-polling-status">
                  <span className="polling-dot" />Waiting for payment confirmation…
                </div>
                <button className="btn-continue" onClick={cancelPaynow}>← Cancel</button>
              </div>
            </div>
          ) : payState === 'expired' ? (
            <div className="payment-body">
              <div className="payment-success">
                <div className="success-icon">⏰</div>
                <h3>QR Code Expired</h3>
                <p>The PayNow QR code has expired. Please generate a new one to complete your payment.</p>
                <button className="btn-checkout" onClick={() => setPayState('idle')}>
                  Try Again →
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Customer Information */}
              <div className="payment-body" style={{ paddingBottom: 0, borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Delivery Address</h4>
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
                <div className="card-field">
                  <label>Delivery Address *</label>
                  <input
                    placeholder="123 Main Street, Singapore 123456"
                    value={customerForm.address}
                    onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))}
                  />
                </div>
              </div>

              {/* PayNow */}
              <div className="payment-body">
                <div className="paynow-box">
                  <div className="paynow-logo"><span className="paynow-logo-dot" />PayNow</div>
                  <div className="paynow-amount">${cartTotal + delivery} SGD <span>to pay</span></div>
                  <div className="paynow-steps">
                    <strong>How to pay with PayNow</strong>
                    1. Click below to generate your secure QR code<br />
                    2. Open your banking app and scan<br />
                    3. Confirm the amount: <strong>${cartTotal + delivery} SGD</strong><br />
                    4. Click "I've Completed Payment" after transferring
                  </div>
                  <button className="btn-checkout" onClick={handlePayment}>
                    Generate PayNow QR →
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
