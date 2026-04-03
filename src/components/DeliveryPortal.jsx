import { useState, useEffect } from 'react';

export default function DeliveryPortal({ onLogout }) {
  const [deliveryCode, setDeliveryCode] = useState(null);
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState(null);
  const [marking, setMarking]           = useState(null);
  const [toast, setToast]               = useState('');

  const token = localStorage.getItem('delivery_token');
  const user  = JSON.parse(localStorage.getItem('delivery_user') || '{}');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/delivery/my-orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setDeliveryCode(data.delivery_code);
      setOrders(data.orders);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const markDelivered = async (orderId) => {
    setMarking(orderId);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/delivery/orders/${orderId}/delivered`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: 'delivered' } : o));
      showToast('✅ Marked as Delivered!');
      setExpandedId(null);
    } catch (_) { showToast('❌ Failed. Try again.'); }
    finally { setMarking(null); }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
    onLogout();
  };

  const pending   = orders.filter(o => o.order_status !== 'delivered').length;
  const delivered = orders.filter(o => o.order_status === 'delivered').length;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerLogo}>🛵 Garden<span style={{ color: '#F59E0B' }}>Roots</span></div>
          <div style={styles.headerName}>Hello, {user.full_name || user.username}</div>
          {deliveryCode && (
            <div style={styles.codeTag}>📋 {deliveryCode}</div>
          )}
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
      </div>

      {/* Stats */}
      {orders.length > 0 && (
        <div style={styles.stats}>
          <div style={styles.statBox}>
            <strong>{orders.length}</strong>
            <span>Total</span>
          </div>
          <div style={{ ...styles.statBox, borderColor: '#F59E0B' }}>
            <strong style={{ color: '#F59E0B' }}>{pending}</strong>
            <span>Pending</span>
          </div>
          <div style={{ ...styles.statBox, borderColor: '#16A34A' }}>
            <strong style={{ color: '#16A34A' }}>{delivered}</strong>
            <span>Delivered</span>
          </div>
        </div>
      )}

      {/* Orders */}
      <div style={styles.content}>
        {loading && <p style={styles.empty}>Loading orders…</p>}

        {!loading && orders.length === 0 && (
          <div style={styles.emptyBox}>
            <div style={{ fontSize: 48 }}>📭</div>
            <p>No orders assigned to you yet.</p>
          </div>
        )}

        {!loading && orders.map(order => {
          const isExpanded  = expandedId === order.id;
          const isDelivered = order.order_status === 'delivered';
          return (
            <div
              key={order.id}
              style={{ ...styles.orderCard, ...(isDelivered ? styles.orderDelivered : {}) }}
            >
              {/* Row — always visible */}
              <div style={styles.orderRow} onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                <div style={styles.orderLeft}>
                  <div style={styles.orderRef}>{order.order_ref}</div>
                  <div style={styles.orderAddr}>{order.delivery_address}</div>
                </div>
                <div style={styles.orderRight}>
                  {isDelivered
                    ? <span style={styles.badgeDone}>✅ Delivered</span>
                    : <span style={styles.badgePending}>⏳ Pending</span>
                  }
                  <span style={styles.chevron}>{isExpanded ? '−' : '+'}</span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div style={styles.details}>
                  <div style={styles.detailRow}><span>Customer</span><span>{order.customer_name}</span></div>
                  <div style={styles.detailRow}><span>Phone</span><a href={`tel:${order.customer_phone}`} style={{ color: '#16A34A' }}>{order.customer_phone}</a></div>
                  <div style={styles.detailRow}><span>Address</span><span>{order.delivery_address}</span></div>
                  <div style={styles.detailRow}><span>Total</span><span><strong>${order.total_price} SGD</strong></span></div>
                  <div style={styles.detailRow}><span>Items</span><span>{order.items?.length ?? 0} item(s)</span></div>

                  {!isDelivered && (
                    <button
                      style={styles.deliverBtn}
                      disabled={marking === order.id}
                      onClick={() => markDelivered(order.id)}
                    >
                      {marking === order.id ? 'Marking…' : '✅ Mark as Delivered'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  page:    { minHeight: '100vh', background: '#F3F4F6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header:  { background: 'linear-gradient(135deg,#14532D,#15803D)', color: '#fff', padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLogo: { fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: '#fff' },
  headerName: { fontSize: 15, marginTop: 4, opacity: 0.9 },
  codeTag: { display: 'inline-block', marginTop: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '3px 12px', fontSize: 12, letterSpacing: 1 },
  logoutBtn: { background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 },
  stats:   { display: 'flex', gap: 12, padding: '16px 16px 0', maxWidth: 600, margin: '0 auto' },
  statBox: { flex: 1, background: '#fff', border: '2px solid #E5E7EB', borderRadius: 10, padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 },
  content: { maxWidth: 600, margin: '16px auto', padding: '0 16px 40px' },
  empty:   { textAlign: 'center', color: '#6B7280', padding: 40 },
  emptyBox: { textAlign: 'center', color: '#6B7280', padding: '48px 20px' },
  orderCard: { background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  orderDelivered: { opacity: 0.65 },
  orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' },
  orderLeft: { flex: 1 },
  orderRef: { fontWeight: 700, fontSize: 15, color: '#111' },
  orderAddr: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  orderRight: { display: 'flex', alignItems: 'center', gap: 10 },
  badgePending: { background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  badgeDone:    { background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
  chevron: { fontSize: 20, fontWeight: 700, color: '#16A34A', lineHeight: 1 },
  details: { borderTop: '1px solid #F3F4F6', padding: '14px 16px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid #F9FAFB' },
  deliverBtn: { marginTop: 14, width: '100%', padding: '13px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', borderRadius: 24, padding: '10px 24px', fontSize: 14, zIndex: 999 },
};
