import { useApp } from '../context/AppContext';
import { stockApi } from '../services/api';

export default function Cart() {
  const { cart, cartTotal, cartCount, updateQty, removeFromCart, setPage, setPayState, setToast } = useApp();

  const handleCheckout = async () => {
    try {
      const variantIds = cart.map(item => item.variantId).filter(Boolean);
      if (variantIds.length > 0) {
        const resp = await stockApi.checkStockBatch(variantIds);
        const stocks = resp?.data ?? resp;
        const outOfStock = stocks.filter(s => !s.in_stock);
        if (outOfStock.length > 0) {
          setToast('Some items in your cart are out of stock. Please update your cart.');
          return;
        }
      }
      setPayState('idle');
      setPage('checkout');
    } catch (err) {
      // Stock check failed — proceed anyway so checkout isn't blocked
      setPayState('idle');
      setPage('checkout');
    }
  };

  return (
    <div className="cart-page">
      <h1>Your Cart</h1>
      <p className="cart-page-sub">
        {cartCount === 0 ? 'Your cart is empty.' : `${cartCount} item${cartCount > 1 ? 's' : ''} in your cart`}
      </p>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <h3>Nothing here yet!</h3>
          <p>Browse our premium mango varieties and add them to your cart.</p>
          <button className="btn-hero" onClick={() => setPage('home')}>Shop Mangoes</button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-card">
            {cart.map(item => (
              <div className="cart-item" key={item.id}>
                <div className="cart-item-emoji">
                  <img src={item.image || '/banginapalli.jpg'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.currentTarget.src = '/banginapalli.jpg'; }} />
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-origin">{item.origin}</div>
                  <div className="cart-item-price">{item.price} / box</div>
                </div>
                <div className="cart-qty">
                  <button onClick={() => updateQty(item.id, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)}>+</button>
                </div>
                <div className="cart-item-subtotal">${parseFloat(item.price.replace('$', '')) * item.qty}</div>
                <button className="cart-remove" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="cart-summary-card">
            <h3>Order Summary</h3>
            {cart.map(item => (
              <div className="summary-row" key={item.id}>
                <span>{item.name} × {item.qty}</span>
                <span>${parseFloat(item.price.replace('$', '')) * item.qty}</span>
              </div>
            ))}
            <div className="summary-row" style={{ marginTop: 8 }}>
              <span>Subtotal</span>
              <span>${cartTotal}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${cartTotal}</span>
            </div>
            <button className="btn-checkout" onClick={handleCheckout}>
              Proceed to Payment →
            </button>
            <button className="btn-continue" onClick={() => setPage('home')}>← Continue Shopping</button>
          </div>
        </div>
      )}
    </div>
  );
}
