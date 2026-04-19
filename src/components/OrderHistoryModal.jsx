import { useState, useEffect } from 'react';
import { API_BASE } from '../services/api';

const FIELD_LABELS = {
  order_status:     'Order Status',
  payment_status:   'Payment Status',
  customer_name:    'Customer Name',
  customer_email:   'Email',
  customer_phone:   'Phone',
  delivery_address: 'Delivery Address',
  total_price:      'Total Price',
  delivery_type:    'Delivery Type',
  pickup_location_id: 'Pickup Location',
};

const OP_ICONS = {
  INSERT:        { icon: '🛒', label: 'Order Placed',   color: '#16a34a' },
  UPDATE:        { icon: '✏️', label: 'Order Updated',  color: '#2563eb' },
  DELETE:        { icon: '🗑️', label: 'Order Deleted',  color: '#dc2626' },
  STATUS_CHANGE: { icon: '🔄', label: 'Status Changed', color: '#7c3aed' },
};

function formatVal(key, val) {
  if (val === null || val === undefined || val === '') return '—';
  if (key === 'delivery_type') return val === 'delivery' ? 'Home Delivery' : 'Self-Collection';
  return String(val);
}

function EventCard({ event }) {
  const op = OP_ICONS[event.operation] || { icon: '📝', label: event.operation, color: '#6b7280' };
  const ts = event.changed_at ? new Date(event.changed_at).toLocaleString('en-SG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—';

  const changes = event.operation === 'INSERT'
    ? Object.entries(event.new_values || {})
    : Object.entries(event.new_values || {});

  return (
    <div className="ohm-event">
      <div className="ohm-event-dot" style={{ background: op.color }} />
      <div className="ohm-event-card">
        <div className="ohm-event-header">
          <span className="ohm-event-icon">{op.icon}</span>
          <span className="ohm-event-label" style={{ color: op.color }}>{op.label}</span>
          <span className="ohm-event-time">{ts}</span>
        </div>
        <div className="ohm-event-by">by {event.changed_by}</div>

        {event.note && (
          <div className="ohm-event-note">📝 {event.note}</div>
        )}

        {event.operation === 'INSERT' && (
          <div className="ohm-change-row">
            <span className="ohm-change-key">Order created</span>
            {Object.entries(event.new_values || {}).map(([k, v]) => (
              <span key={k} className="ohm-insert-field">
                <span className="ohm-field-key">{FIELD_LABELS[k] || k}:</span>
                <span className="ohm-field-val">{formatVal(k, v)}</span>
              </span>
            ))}
          </div>
        )}

        {event.operation !== 'INSERT' && changes.length > 0 && (
          <div className="ohm-changes">
            {changes.map(([k, newV]) => {
              const oldV = (event.old_values || {})[k];
              return (
                <div key={k} className="ohm-change-row">
                  <span className="ohm-change-key">{FIELD_LABELS[k] || k}</span>
                  <span className="ohm-change-old">{formatVal(k, oldV)}</span>
                  <span className="ohm-change-arrow">→</span>
                  <span className="ohm-change-new">{formatVal(k, newV)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrderHistoryModal({ order, headers, onClose }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/admin/orders/${order.id}/history`, { headers })
      .then(r => r.ok ? r.json() : r.json().then(b => Promise.reject(b.detail || 'Failed')))
      .then(data => { setEvents(data); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [order.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="ohm-backdrop" onClick={onClose}>
      <div className="ohm-modal" onClick={e => e.stopPropagation()}>

        <div className="ohm-header">
          <div>
            <h2 className="ohm-title">Order History</h2>
            <span className="ohm-ref">{order.order_ref} · {order.customer_name}</span>
          </div>
          <button className="oem-close" onClick={onClose}>✕</button>
        </div>

        <div className="ohm-body">
          {loading && <div className="ohm-loading">Loading history…</div>}
          {error   && <div className="ohm-error">Error: {error}</div>}
          {!loading && !error && events.length === 0 && (
            <div className="ohm-empty">No history found for this order.</div>
          )}
          {!loading && events.length > 0 && (
            <div className="ohm-timeline">
              {events.map((ev, i) => <EventCard key={i} event={ev} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
