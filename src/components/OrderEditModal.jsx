import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../services/api';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUS_OPTIONS = ['pending', 'succeeded', 'failed', 'cancelled'];

const ACTION_ICONS = {
  create:   '🆕',
  status:   '🔄',
  payment:  '💳',
  collect:  '💰',
  items:    '📦',
  customer: '👤',
  delivery: '🚚',
  notes:    '📝',
  cancel:   '❌',
};

function ActionHistoryTab({ order, headers }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const headersRef = useRef(headers);
  headersRef.current = headers;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/api/v1/admin/orders/${order.id}/action-logs`, { headers: headersRef.current })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data  => { if (!cancelled) setLogs(data); })
      .catch(()   => { if (!cancelled) setError('Failed to load action history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [order.id]);

  const fmt = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const renderDetails = (details) => {
    if (!details) return null;
    const entries = Object.entries(details);
    if (entries.length === 0) return null;
    return (
      <div className="oem-ahl-details">
        {entries.flatMap(([k, v]) => {
          // old→new scalar diff  { old: x, new: y }
          if (v && typeof v === 'object' && !Array.isArray(v) && 'old' in v && 'new' in v) {
            return (
              <div key={k} className="oem-ahl-change-row">
                <span className="oem-ahl-field">{k.replace(/_/g, ' ')}</span>
                <span className="oem-ahl-old">{String(v.old ?? '—')}</span>
                <span className="oem-ahl-arrow">→</span>
                <span className="oem-ahl-new">{String(v.new ?? '—')}</span>
              </div>
            );
          }
          // items diff: added / removed  (array of strings)
          if (Array.isArray(v) && (k === 'added' || k === 'removed')) {
            return v.map((label, i) => (
              <div key={`${k}-${i}`} className={`oem-ahl-change-row oem-ahl-item-${k}`}>
                <span className="oem-ahl-field">{k}</span>
                <span className={k === 'added' ? 'oem-ahl-new' : 'oem-ahl-old'}>{label}</span>
              </div>
            ));
          }
          // items diff: changed  (array of { name, old, new })
          if (Array.isArray(v) && k === 'changed') {
            return v.map((c, i) => (
              <div key={`changed-${i}`} className="oem-ahl-change-row">
                <span className="oem-ahl-field">{c.name}</span>
                <span className="oem-ahl-old">×{c.old}</span>
                <span className="oem-ahl-arrow">→</span>
                <span className="oem-ahl-new">×{c.new}</span>
              </div>
            ));
          }
          // fallback: scalar value
          return (
            <div key={k} className="oem-ahl-change-row">
              <span className="oem-ahl-field">{k.replace(/_/g, ' ')}</span>
              <span className="oem-ahl-new">{String(v ?? '—')}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="oem-ahl-state">
      <div className="oem-ahl-mango-spin">🥭</div>
      <div>Loading history…</div>
    </div>
  );
  if (error)   return <div className="oem-ahl-state oem-ahl-error">{error}</div>;
  if (logs.length === 0) return <div className="oem-ahl-state">No actions recorded yet.</div>;

  return (
    <div className="oem-ahl-timeline">
      {logs.map((log) => {
        const atype = log.action_type || {};
        const icon  = ACTION_ICONS[atype.icon] || '📋';
        const color = atype.color || '#6b7280';
        return (
          <div key={log.id} className="oem-ahl-event">
            <div className="oem-ahl-dot" style={{ background: color }} />
            <div className="oem-ahl-card">
              <div className="oem-ahl-header">
                <span className="oem-ahl-icon">{icon}</span>
                <span className="oem-ahl-label" style={{ color }}>{atype.label || 'Action'}</span>
                <span className="oem-ahl-time">{fmt(log.created_at)}</span>
              </div>
              <div className="oem-ahl-by">by {log.performed_by || 'system'}</div>
              {log.note && <div className="oem-ahl-note">{log.note}</div>}
              {renderDetails(log.details)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentTab({ order, headers }) {
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const [actualPrice,        setActualPrice]        = useState(order.actual_price != null ? String(order.actual_price) : '');
  const [comments,           setComments]           = useState(order.payment_comments || '');
  const [receivedBy,         setReceivedBy]         = useState(order.payment_received_by || '');
  const [collectionStatus,   setCollectionStatus]   = useState(order.payment_collection_status || 'to_be_received');
  const [adminUsers,         setAdminUsers]         = useState([]);
  const [usersLoading,       setUsersLoading]       = useState(true);
  const [usersError,         setUsersError]         = useState('');
  const [saving,             setSaving]             = useState(false);
  const [error,              setError]              = useState('');
  const [success,            setSuccess]            = useState('');

  const headersRef = useRef(headers);
  headersRef.current = headers;

  useEffect(() => {
    setUsersLoading(true);
    setUsersError('');
    fetch(`${API_BASE}/api/v1/admin/admin-users-list`, { headers: headersRef.current })
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || `Failed to load admin users (${r.status})`);
        }
        return r.json();
      })
      .then(data => { setAdminUsers(data); setUsersLoading(false); })
      .catch(err => { setUsersError(err.message); setUsersLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${order.id}/payment-details`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          actual_price:              actualPrice !== '' ? parseFloat(actualPrice) : null,
          payment_comments:          comments   || null,
          payment_received_by:       receivedBy || null,
          payment_collection_status: collectionStatus,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail;
        throw new Error(Array.isArray(detail) ? detail.map(e => e.msg).join('; ') : detail || `Error ${res.status}`);
      }
      const data = await res.json();
      setSuccess('Payment details saved.');
      // reflect the updated_by back from server response
      if (data.payment_updated_by) {
        order.payment_updated_by = data.payment_updated_by;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="oem-payment-tab">
      <div className="oem-section-title">Payment Details</div>

      <label className="oem-label">Actual Price Charged ($)</label>
      <input
        className="oem-input"
        type="number"
        step="0.01"
        min="0"
        value={actualPrice}
        onChange={e => setActualPrice(e.target.value)}
        placeholder={`Order total: $${parseFloat(order.total_price || 0).toFixed(2)}`}
      />

      <label className="oem-label">Comments</label>
      <textarea
        className="oem-input oem-textarea"
        value={comments}
        onChange={e => setComments(e.target.value)}
        rows={3}
        placeholder="Reason for reduced price or other payment notes"
      />

      <label className="oem-label">Received By</label>
      {usersError ? (
        <div className="oem-error" style={{ marginBottom: 8 }}>Could not load admin users: {usersError}</div>
      ) : (
        <select
          className="oem-input"
          value={receivedBy}
          onChange={e => {
            const selected = e.target.value;
            setReceivedBy(selected);
            // if the new selection is someone else and status is already "received", reset it
            // Find myself in the loaded list by email, fall back to full_name or username
            const myEntry = adminUsers.find(u => u.is_me);
            // Reset to "to_be_received" if a different person is selected
            const isSelf = !selected || (myEntry ? selected === myEntry.name : false);
            if (!isSelf && collectionStatus === 'received') {
              setCollectionStatus('to_be_received');
            }
          }}
          disabled={usersLoading}
        >
          <option value="">{usersLoading ? 'Loading…' : '— Select admin user —'}</option>
          {adminUsers.map(u => (
            <option key={u.id} value={u.name}>{u.name}</option>
          ))}
        </select>
      )}

      <div className="oem-section-title" style={{ marginTop: 18 }}>Payment Collection Status</div>
      {(() => {
        const myEntry = adminUsers.find(u => u.is_me);
        // Allow only when: no one selected, OR the selected person is confirmed as me
        const canMarkReceived = !receivedBy || (myEntry ? receivedBy === myEntry.name : false);
        return (
          <div className="oem-radio-group">
            <label className="oem-radio-label">
              <input
                type="radio"
                name={`pcs-${order.id}`}
                value="to_be_received"
                checked={collectionStatus === 'to_be_received'}
                onChange={() => setCollectionStatus('to_be_received')}
              />
              To be received
            </label>
            <label className={`oem-radio-label${canMarkReceived ? '' : ' oem-radio-label--disabled'}`}>
              <input
                type="radio"
                name={`pcs-${order.id}`}
                value="received"
                checked={collectionStatus === 'received'}
                onChange={() => setCollectionStatus('received')}
                disabled={!canMarkReceived}
              />
              Received
            </label>
            {!canMarkReceived && (
              <span className="oem-radio-hint">Only the assigned user can mark as Received</span>
            )}
          </div>
        );
      })()}

      {error   && <div className="oem-error">{error}</div>}
      {success && <div className="oem-pt-success">{success}</div>}

      <div className="oem-pt-footer">
        <button className="oem-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Payment Details'}
        </button>
      </div>
    </div>
  );
}

export default function OrderEditModal({ order, headers, activeProducts, pickupLocations, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('edit');

  // Editable fields
  const [customerName,      setCustomerName]      = useState(order.customer_name    || '');
  const [customerEmail,     setCustomerEmail]     = useState(order.customer_email   || '');
  const [customerPhone,     setCustomerPhone]     = useState(order.customer_phone   || '');
  const [deliveryAddress,   setDeliveryAddress]   = useState(order.delivery_address || '');
  const [customerNotes,     setCustomerNotes]     = useState(order.customer_notes   || '');
  const [orderStatus,       setOrderStatus]       = useState(order.order_status     || 'pending');
  const [paymentStatus,     setPaymentStatus]     = useState(order.payment_status   || 'pending');
  const [deliveryType,      setDeliveryType]      = useState(order.delivery_type    || 'delivery');
  const [pickupLocationId,  setPickupLocationId]  = useState(order.pickup_location_id || '');

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
  const subtotal    = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const deliveryFee = parseFloat(order.delivery_fee) || 0;
  const total       = subtotal + deliveryFee;

  // Add a specific variant from the active products list
  const handleAddVariant = (product, variant) => {
    if (!variant?.id) return;
    const sizeSuffix = product.variants.length > 1 && variant.size_name && variant.size_name !== 'Standard'
      ? ` (${variant.size_name})`
      : '';
    const label = `${product.name}${sizeSuffix}`;
    setItems(prev => {
      const existing = prev.findIndex(it => it.product_variant_id === variant.id);
      if (existing >= 0) {
        return prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, { product_variant_id: variant.id, name: label, unit_price: parseFloat(variant.price) || 0, quantity: 1 }];
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
    if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
      setError('Please enter a delivery address.'); return;
    }
    if (deliveryType === 'pickup' && !pickupLocationId) {
      setError('Please select a pickup location.'); return;
    }
    const validItems = items
      .filter(it => it.product_variant_id != null && !isNaN(parseInt(it.product_variant_id)))
      .map(it => ({ product_variant_id: parseInt(it.product_variant_id), quantity: parseInt(it.quantity) }));
    if (validItems.length === 0) {
      setError('No valid items to save. Please remove existing items and add new ones from the product list below.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${order.id}`, {
        method:  'PATCH',
        headers,
        body: JSON.stringify({
          customer_name:      customerName      || null,
          customer_email:     customerEmail     || null,
          customer_phone:     customerPhone     || null,
          delivery_address:   deliveryType === 'delivery' ? (deliveryAddress || null) : null,
          customer_notes:     customerNotes     || null,
          order_status:       orderStatus,
          payment_status:     paymentStatus,
          delivery_type:      deliveryType,
          pickup_location_id: deliveryType === 'pickup' ? (parseInt(pickupLocationId) || null) : null,
          items: validItems,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.detail;
        const msg = Array.isArray(detail)
          ? detail.map(e => e.msg || JSON.stringify(e)).join('; ')
          : detail || body.error || `Error ${res.status}`;
        throw new Error(msg);
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
            <h2 className="oem-title">Order Details</h2>
            <span className="oem-ref">{order.order_ref}</span>
          </div>
          <button className="oem-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab bar */}
        <div className="oem-tabs">
          <button
            className={`oem-tab${activeTab === 'edit' ? ' oem-tab--active' : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            ✏️ Edit Order
          </button>
          <button
            className={`oem-tab${activeTab === 'payment' ? ' oem-tab--active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            💳 Payment
          </button>
          <button
            className={`oem-tab${activeTab === 'history' ? ' oem-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 Action History
          </button>
        </div>

        {/* Payment tab */}
        {activeTab === 'payment' && (
          <div className="oem-body oem-body--single">
            <PaymentTab order={order} headers={headers} />
          </div>
        )}

        {/* Action History tab */}
        {activeTab === 'history' && (
          <div className="oem-body">
            <ActionHistoryTab order={order} headers={headers} />
          </div>
        )}

        {/* Edit Order tab */}
        {activeTab === 'edit' && <div className="oem-body">

          {/* ── Left column: customer + delivery + status ── */}
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

            <label className="oem-label">Notes</label>
            <textarea className="oem-input oem-textarea" value={customerNotes}
              onChange={e => setCustomerNotes(e.target.value)} rows={2} />

            {/* ── Delivery Mode ── */}
            <div className="oem-section-title" style={{ marginTop: 16 }}>Delivery Mode</div>

            <div className="oem-delivery-toggle">
              <button
                className={`oem-delivery-btn${deliveryType === 'delivery' ? ' active' : ''}`}
                onClick={() => setDeliveryType('delivery')}
                type="button"
              >
                🚚 Home Delivery
              </button>
              <button
                className={`oem-delivery-btn${deliveryType === 'pickup' ? ' active' : ''}`}
                onClick={() => setDeliveryType('pickup')}
                type="button"
              >
                📍 Self-Collection
              </button>
            </div>

            {deliveryType === 'delivery' && (
              <>
                <label className="oem-label">Delivery Address</label>
                <textarea className="oem-input oem-textarea" value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)} rows={2}
                  placeholder="Enter full delivery address" />
              </>
            )}

            {deliveryType === 'pickup' && (
              <>
                <label className="oem-label">Pickup Location</label>
                <select className="oem-input" value={pickupLocationId}
                  onChange={e => setPickupLocationId(e.target.value)}>
                  <option value="">— Select a location —</option>
                  {(pickupLocations || []).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </>
            )}

            <label className="oem-label" style={{ marginTop: 12 }}>Order Status</label>
            <select className="oem-input" value={orderStatus}
              onChange={e => setOrderStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            <label className="oem-label" style={{ marginTop: 12 }}>Payment Status</label>
            <select className="oem-input" value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value)}>
              {PAYMENT_STATUS_OPTIONS.map(s => (
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
                <div className="oem-section-title oem-add-heading">
                  <span>➕ Add Product</span>
                </div>
                <div className="oem-add-products">
                  {activeProducts.map(p => (
                    <div key={p.id} className="oem-add-product-group">
                      <div className="oem-add-product-name">
                        {p.name}
                        {!p.is_active && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#999', fontWeight: 500, background: '#f0f0f0', borderRadius: 4, padding: '1px 6px' }}>Inactive</span>
                        )}
                      </div>
                      <div className="oem-add-variant-row">
                        {(p.variants || []).map(v => {
                          const alreadyIn = items.some(it => it.product_variant_id === v.id);
                          return (
                            <button
                              key={v.id}
                              className={`oem-add-variant-btn${alreadyIn ? ' in-cart' : ''}`}
                              onClick={() => handleAddVariant(p, v)}
                              title={alreadyIn ? 'Already in order — click to add one more' : `Add ${p.name}`}
                            >
                              {v.size_name && v.size_name !== 'Standard' && (
                                <span className="oem-variant-size">{v.size_name}</span>
                              )}
                              <span className="oem-variant-price">${parseFloat(v.price || 0).toFixed(2)}</span>
                              <span className="oem-variant-plus">{alreadyIn ? '＋' : '+'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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
        </div>}

        {/* Footer — only on edit tab */}
        {activeTab === 'edit' && <>
          {error && <div className="oem-error">{error}</div>}
          <div className="oem-footer">
            <button className="oem-cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="oem-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </>}

      </div>
    </div>
  );
}
