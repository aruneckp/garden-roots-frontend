import { useState, useEffect } from 'react';
import { API_BASE } from '../services/api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function OrderEditModal({ order, headers, activeProducts, onClose, onSaved }) {
  // Editable fields
  const [customerName,    setCustomerName]    = useState(order.customer_name    || '');
  const [customerEmail,   setCustomerEmail]   = useState(order.customer_email   || '');
  const [customerPhone,   setCustomerPhone]   = useState(order.customer_phone   || '');
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address || '');
  const [customerNotes,   setCustomerNotes]   = useState(order.customer_notes   || '');
  const [orderStatus,     setOrderStatus]     = useState(order.order_status     || 'pending');

  // Items: [{ product_variant_id, name, unit_price, quantity }]
  const [items, setItems] = useState(
    (order.items || []).map(it => ({
      product_variant_id: it.product_variant_id ?? it.variant_id ?? null,
      name:       it.variant || it.name || '—',
      unit_price: parseFloat(it.unit_price) || 0,
      quantity:   it.qty ?? it.quantity ?? 1,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  // Derived totals
  const subtotal   = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const deliveryFee = parseFloat(order.delivery_fee) || 0;
  const total      = subtotal + deliveryFee;

  // Add a product from the active products list
  const handleAddProduct = (product) => {
    const variantId = product.variants?.[0]?.id;
    const price     = product.variants?.[0]?.price ?? 0;
    if (!variantId) return;
    setItems(prev => {
      const existing = prev.findIndex(it => it.product_variant_id === variantId);
      if (existing >= 0) {
        return prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, { product_variant_id: variantId, name: product.name, unit_price: price, quantity: 1 }];
    });
  };

  const handleQtyChange = (idx, delta) => {
    setItems(prev => {
      const next = [...prev];
      const qty  = (next[idx].quantity || 0) + delta;
      if (qty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], quantity: qty };
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (items.length === 0) { setError('Order must have at least one item.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${order.id}`, {
        method:  'PATCH',
        headers,
        body: JSON.stringify({
          customer_name:    customerName    || null,
          customer_email:   customerEmail   || null,
          customer_phone:   customerPhone   || null,
          delivery_address: deliveryAddress || null,
          customer_notes:   customerNotes   || null,
          order_status:     orderStatus,
          items: items.map(it => ({
            product_variant_id: it.product_variant_id,
            quantity:           it.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Error ${res.status}`);
      }
      const data = await res.json();
      onSaved(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Trap Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="oem-backdrop" onClick={onClose}>
      <div className="oem-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="oem-header">
          <div>
            <h2 className="oem-title">Edit Order</h2>
            <span className="oem-ref">{order.order_ref}</span>
          </div>
          <button className="oem-close" onClick={onClose}>✕</button>
        </div>

        <div className="oem-body">

          {/* ── Left column: customer + status ── */}
          <div className="oem-col">
            <div className="oem-section-title">Customer Info</div>

            <label className="oem-label">Name</label>
            <input className="oem-input" value={customerName}
              onChange={e => setCustomerName(e.target.value)} />

            <label className="oem-label">Email</label>
            <input className="oem-input" type="email" value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)} />

            <label className="oem-label">Phone</label>
            <input className="oem-input" value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)} />

            {order.delivery_type === 'delivery' && (
              <>
                <label className="oem-label">Delivery Address</label>
                <textarea className="oem-input oem-textarea" value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)} rows={2} />
              </>
            )}

            <label className="oem-label">Notes</label>
            <textarea className="oem-input oem-textarea" value={customerNotes}
              onChange={e => setCustomerNotes(e.target.value)} rows={2} />

            <label className="oem-label">Order Status</label>
            <select className="oem-input" value={orderStatus}
              onChange={e => setOrderStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* ── Right column: items + add product ── */}
          <div className="oem-col">
            <div className="oem-section-title">Order Items</div>

            <div className="oem-items-list">
              {items.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>No items — add a product below.</p>
              )}
              {items.map((it, idx) => (
                <div key={idx} className="oem-item-row">
                  <div className="oem-item-name">{it.name}</div>
                  <div className="oem-item-price">${it.unit_price.toFixed(2)}</div>
                  <div className="oem-item-qty-ctrl">
                    <button className="oem-qty-btn" onClick={() => handleQtyChange(idx, -1)}>−</button>
                    <span className="oem-qty-num">{it.quantity}</span>
                    <button className="oem-qty-btn" onClick={() => handleQtyChange(idx, +1)}>+</button>
                  </div>
                  <div className="oem-item-subtotal">${(it.unit_price * it.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Add product */}
            {activeProducts.length > 0 && (
              <>
                <div className="oem-section-title" style={{ marginTop: 16 }}>Add Product</div>
                <div className="oem-add-products">
                  {activeProducts.map(p => {
                    const price = p.variants?.[0]?.price ?? 0;
                    const alreadyIn = items.some(it => it.product_variant_id === p.variants?.[0]?.id);
                    return (
                      <button
                        key={p.id}
                        className={`oem-add-btn${alreadyIn ? ' in-cart' : ''}`}
                        onClick={() => handleAddProduct(p)}
                      >
                        <span className="oem-add-btn-name">{p.name}</span>
                        <span className="oem-add-btn-price">${price}</span>
                        <span className="oem-add-btn-plus">{alreadyIn ? '＋' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Totals */}
            <div className="oem-totals">
              <div className="oem-total-row">
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="oem-total-row">
                <span>Delivery fee</span><span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="oem-total-row oem-grand-total">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {error && <div className="oem-error">{error}</div>}
        <div className="oem-footer">
          <button className="oem-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="oem-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
