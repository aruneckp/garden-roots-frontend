import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { userApi } from '../services/api';

const STATUS_META = {
  pending:   { label: 'Pending',    color: '#F59E0B', icon: '🕐', desc: 'Order received, awaiting payment' },
  confirmed: { label: 'Confirmed',  color: '#10B981', icon: '✅', desc: 'Payment confirmed' },
  shipped:   { label: 'Shipped',    color: '#3B82F6', icon: '🚚', desc: 'On the way to you' },
  delivered: { label: 'Delivered',  color: '#059669', icon: '📦', desc: 'Successfully delivered' },
  cancelled: { label: 'Cancelled',  color: '#EF4444', icon: '❌', desc: 'Order cancelled' },
};

function FeedbackSection({ order, token, onUpdated }) {
  const [editing, setEditing]   = useState(false);
  const [text, setText]         = useState(order.delivery_feedback || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  // Only paid orders can have feedback
  if (order.payment_status !== 'succeeded') return null;

  const hasFeedback = !!order.delivery_feedback;

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await userApi.submitFeedback(token, order.id, text.trim());
      const updated = res?.data ?? res;
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="booking-feedback">
      <div className="booking-feedback-label">
        💬 {hasFeedback ? 'Your Feedback' : 'Leave Feedback'}
      </div>

      {!editing && hasFeedback && (
        <div className="booking-feedback-text">
          {order.delivery_feedback}
          <button className="booking-feedback-edit" onClick={() => { setText(order.delivery_feedback); setEditing(true); }}>
            Edit
          </button>
        </div>
      )}

      {!editing && !hasFeedback && (
        <button className="booking-feedback-prompt" onClick={() => setEditing(true)}>
          + Add feedback or report a delivery issue
        </button>
      )}

      {editing && (
        <div className="booking-feedback-form">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="How was your delivery? Any issues or comments for our team…"
            rows={3}
            maxLength={2000}
          />
          {error && <div className="booking-feedback-error">{error}</div>}
          <div className="booking-feedback-actions">
            <button className="btn-feedback-save" onClick={handleSave} disabled={saving || !text.trim()}>
              {saving ? 'Saving…' : 'Save Feedback'}
            </button>
            <button className="btn-feedback-cancel" onClick={() => { setEditing(false); setError(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyBookings() {
  const { user, userToken, setPage, myOrders, setMyOrders, myOrdersLoading, myOrdersError, refreshMyOrders, setShowAuthModal } = useApp();
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  useEffect(() => {
    if (!userToken) return;
    // Always refresh when landing on My Bookings to get latest data
    refreshMyOrders(userToken);
  }, [userToken]);

  const handleFeedbackUpdated = (updatedOrder) => {
    setMyOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  if (!user) {
    return (
      <div className="my-bookings-page">
        <div className="bookings-empty">
          <div className="bookings-empty-icon">🔐</div>
          <h2>Please sign in</h2>
          <p>Log in with Google to see your order history.</p>
          <button className="btn-primary" onClick={() => setShowAuthModal(true)}>Sign In</button>
          <button className="btn-continue" style={{ marginTop: 10 }} onClick={() => setPage('home')}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div className="bookings-header">
        <h1>My Bookings</h1>
        <p className="bookings-sub">Order history for {user.email}</p>
      </div>

      {myOrdersLoading && (
        <div className="bookings-loading">
          <div className="spinner" />
          <p>Loading your orders…</p>
        </div>
      )}

      {!myOrdersLoading && myOrdersError && (
        <div className="bookings-error">
          <p>Could not load orders: {myOrdersError}</p>
          <button className="btn-outline" onClick={() => refreshMyOrders(userToken)}>Retry</button>
        </div>
      )}

      {!myOrdersLoading && !myOrdersError && myOrders.length === 0 && (
        <div className="bookings-empty">
          <div className="bookings-empty-icon">🥭</div>
          <h2>No orders yet</h2>
          <p>You haven't placed any orders. Browse our fresh mangoes!</p>
          <button className="btn-primary" onClick={() => setPage('varieties')}>Shop Now</button>
        </div>
      )}

      {!myOrdersLoading && !myOrdersError && myOrders.length > 0 && (
        <div className="bookings-list">
          {myOrders.map(order => {
            const statusMeta = STATUS_META[order.order_status] || { label: order.order_status, color: '#6B7280', icon: '📋', desc: '' };
            const isDelivered = order.order_status === 'delivered';
            const isPaid      = order.payment_status === 'succeeded';
            const isPickup    = order.delivery_type === 'pickup';

            const date = new Date(order.created_at).toLocaleDateString('en-SG', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            const isExpanded = expandedId === order.id;

            return (
              <div className={`booking-card${isDelivered ? ' booking-card--delivered' : ''}`} key={order.id}>

                {/* Collapsed row — always visible, click to expand */}
                <div
                  className="booking-card-header"
                  onClick={() => toggleExpand(order.id)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <div>
                    <div className="booking-ref">{order.order_ref}</div>
                    <div className="booking-date">{date} · ${parseFloat(order.total_price).toFixed(2)} SGD</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="booking-status" style={{ color: statusMeta.color, borderColor: statusMeta.color }}>
                      {statusMeta.icon} {statusMeta.label}
                    </span>
                    <span style={{ fontSize: 22, color: '#16A34A', fontWeight: 700, lineHeight: 1 }}>{isExpanded ? '−' : '+'}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <>
                    {/* Items */}
                    <div className="booking-items">
                      {order.order_items.map((item, i) => (
                        <div className="booking-item" key={i}>
                          <span>Variant #{item.product_variant_id}</span>
                          <span>×{item.quantity}</span>
                          <span>${parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fulfilment info */}
                    <div className="booking-fulfilment">
                      <span className="booking-fulfilment-badge">
                        {isPickup ? '🏪 Self-Pickup' : '🚚 Home Delivery'}
                      </span>
                      {isPickup && order.pickup_location && (
                        <div className="booking-fulfilment-detail">
                          {order.pickup_location.name} — {order.pickup_location.address}
                          {order.pickup_location.whatsapp_phone && (
                            <a
                              href={`https://wa.me/${order.pickup_location.whatsapp_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginLeft: 8, color: '#25D366', fontWeight: 600 }}
                            >
                              💬 WhatsApp
                            </a>
                          )}
                        </div>
                      )}
                      {!isPickup && order.delivery_address && (
                        <div className="booking-fulfilment-detail">📍 {order.delivery_address}</div>
                      )}
                    </div>

                    {/* Order notes */}
                    {order.customer_notes && (
                      <div className="booking-notes">
                        <span className="booking-notes-label">📝 Your order notes:</span>
                        <span className="booking-notes-text">{order.customer_notes}</span>
                      </div>
                    )}

                    {/* Footer: totals + payment */}
                    <div className="booking-card-footer">
                      <div className="booking-total">
                        <span>Total</span>
                        <strong>${parseFloat(order.total_price).toFixed(2)} SGD</strong>
                      </div>
                      <div className={`booking-payment ${order.payment_status}`}>
                        Payment: {isPaid ? '✅ Paid' : order.payment_status}
                      </div>
                    </div>

                    {/* Feedback */}
                    <FeedbackSection
                      order={order}
                      token={userToken}
                      onUpdated={handleFeedbackUpdated}
                    />
                  </>
                )}

              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: '0 24px 40px' }}>
        <button className="btn-continue" onClick={() => setPage('home')}>← Back to Home</button>
      </div>
    </div>
  );
}
