import { useApp } from '../context/AppContext';

export default function Checkout() {
  const {
    cart, cartTotal, delivery,
    paymentMethod, setPaymentMethod,
    cardForm, setCardForm,
    payState, setPayState,
    orderRef, setCart,
    formatCardNumber, formatExpiry,
    handlePay, setPage,
    paynowQrUrl, cancelPaynow,
  } = useApp();

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
              <div className="checkout-item-price">${parseInt(item.price.replace('$', '')) * item.qty}</div>
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
            <h3>Payment Method</h3>
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
                  4. This page updates automatically once payment is received
                </div>
                <div className="paynow-polling-status">
                  <span className="polling-dot" />Waiting for payment…
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
              <div className="payment-tabs">
                <button className={`payment-tab${paymentMethod === 'card' ? ' active' : ''}`} onClick={() => setPaymentMethod('card')}>
                  <span className="payment-tab-icon">💳</span>Card
                </button>
                <button className={`payment-tab${paymentMethod === 'paynow' ? ' active' : ''}`} onClick={() => setPaymentMethod('paynow')}>
                  <span className="payment-tab-icon">📱</span>PayNow
                </button>
                <button className={`payment-tab${paymentMethod === 'grabpay' ? ' active' : ''}`} onClick={() => setPaymentMethod('grabpay')}>
                  <span className="payment-tab-icon">🟢</span>GrabPay
                </button>
              </div>

              <div className="payment-body">
                {paymentMethod === 'card' && (
                  <>
                    <div className="card-field">
                      <label>Card Number</label>
                      <input placeholder="4242 4242 4242 4242" value={cardForm.number} onChange={e => setCardForm(f => ({ ...f, number: formatCardNumber(e.target.value) }))} maxLength={19} />
                    </div>
                    <div className="card-field">
                      <label>Cardholder Name</label>
                      <input placeholder="Jane Tan" value={cardForm.name} onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="card-row">
                      <div className="card-field">
                        <label>Expiry</label>
                        <input placeholder="MM/YY" value={cardForm.expiry} onChange={e => setCardForm(f => ({ ...f, expiry: formatExpiry(e.target.value) }))} maxLength={5} />
                      </div>
                      <div className="card-field">
                        <label>CVV</label>
                        <input placeholder="•••" type="password" value={cardForm.cvv} onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/, '').substring(0, 4) }))} maxLength={4} />
                      </div>
                    </div>
                    <div className="stripe-badge">
                      <span>Stripe</span> Secured by Stripe · 256-bit SSL encryption
                    </div>
                    <button className="btn-checkout" onClick={handlePay}>Pay ${cartTotal + delivery} SGD →</button>
                  </>
                )}

                {paymentMethod === 'paynow' && (
                  <div className="paynow-box">
                    <div className="paynow-logo"><span className="paynow-logo-dot" />PayNow</div>
                    <div className="paynow-amount">${cartTotal + delivery} SGD <span>to pay</span></div>
                    <div className="paynow-steps">
                      <strong>How to pay with PayNow</strong>
                      1. Click below to generate your secure QR code<br />
                      2. Open your banking app and scan<br />
                      3. Confirm the amount: <strong>${cartTotal + delivery} SGD</strong><br />
                      4. Page updates automatically once payment is received
                    </div>
                    <button className="btn-checkout" onClick={handlePay}>
                      Generate PayNow QR →
                    </button>
                  </div>
                )}

                {paymentMethod === 'grabpay' && (
                  <div className="grabpay-box">
                    <div className="grabpay-logo">🟢</div>
                    <div className="grabpay-name">GrabPay</div>
                    <div className="grabpay-sub">Pay seamlessly using your GrabPay wallet.<br />You'll be redirected to the Grab app to complete payment.</div>
                    <div className="checkout-total-row grand" style={{ justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                      <span>Amount:</span><span>${cartTotal + delivery} SGD</span>
                    </div>
                    <button className="btn-grabpay" onClick={handlePay}>
                      <span>🟢</span> Pay with GrabPay
                    </button>
                    <p style={{ fontSize: 12, color: '#A8A29E', marginTop: 12 }}>Secured via Grab's encrypted payment gateway</p>
                  </div>
                )}
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
