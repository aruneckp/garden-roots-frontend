import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import PickupLocationManager from './PickupLocationManager';
import PaymentTracker from './PaymentTracker';
import PromoManager from './PromoManager';
import { API_BASE } from '../services/api';
import { useApp } from '../context/AppContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import OrderEditModal from './OrderEditModal';

/** Inline shipment picker used inside the expanded order detail row. */
function ShipmentSelect({ shipments, currentId, onSave }) {
  const [selected, setSelected] = React.useState(currentId ?? '');
  const [saving, setSaving] = React.useState(false);

  const isDirty = String(selected) !== String(currentId ?? '');

  const handleSave = async () => {
    setSaving(true);
    await onSave(selected === '' ? null : Number(selected));
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="orders-filter-select"
        style={{ minWidth: 180 }}
      >
        <option value="">— None —</option>
        {shipments.map(s => (
          <option key={s.id} value={s.id}>#{s.id} · {s.shipment_ref} ({s.status})</option>
        ))}
      </select>
      {isDirty && (
        <button
          className="submit-button"
          style={{ padding: '6px 14px', fontSize: 13 }}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
      {!isDirty && currentId && (
        <span style={{ fontSize: 12, color: '#16a34a' }}>Shipment #{currentId} linked</span>
      )}
      {!isDirty && !currentId && (
        <span style={{ fontSize: 12, color: '#9ca3af' }}>No shipment linked</span>
      )}
    </div>
  );
}

/** Helper: returns YYYY-MM-DD for a Date object */
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

/** Returns {date_from, date_to} for the current Mon–Sun week */
function currentWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { date_from: toDateStr(mon), date_to: toDateStr(sun) };
}

/** Full shipments view — inline grid, no popup */
function ShipmentsView({ shipments, headers, API_BASE }) {
  const [expandedId, setExpandedId] = useState(null);
  const [shipmentOrders, setShipmentOrders] = useState({});   // { [shipment_id]: order[] }
  const [orderStats, setOrderStats]     = useState({});        // { [shipment_id]: stats }
  const [loadingId, setLoadingId]       = useState(null);
  const [filters, setFilters]           = useState({});        // { [shipment_id]: filterObj }
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const defaultFilters = () => ({ ...currentWeekRange(), order_status: '', payment_status: '', delivery_type: '' });

  const getFilters = (sid) => filters[sid] || defaultFilters();

  const fetchOrders = async (sid, f) => {
    setLoadingId(sid);
    const p = new URLSearchParams();
    const fi = f || getFilters(sid);
    if (fi.order_status)   p.set('order_status',   fi.order_status);
    if (fi.payment_status) p.set('payment_status', fi.payment_status);
    if (fi.delivery_type)  p.set('delivery_type',  fi.delivery_type);
    if (fi.date_from)      p.set('date_from',       fi.date_from);
    if (fi.date_to)        p.set('date_to',         fi.date_to);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/shipments/${sid}/orders?${p}`, { headers }),
        fetch(`${API_BASE}/api/v1/admin/shipments/${sid}/order-stats`, { headers }),
      ]);
      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const stats  = statsRes.ok  ? await statsRes.json()  : {};
      setShipmentOrders(prev => ({ ...prev, [sid]: orders }));
      setOrderStats(prev => ({ ...prev, [sid]: stats }));
    } finally {
      setLoadingId(null);
    }
  };

  const toggleShipment = (sid) => {
    if (expandedId === sid) { setExpandedId(null); return; }
    setExpandedId(sid);
    setExpandedOrderId(null);
    if (!shipmentOrders[sid]) {
      const f = defaultFilters();
      setFilters(prev => ({ ...prev, [sid]: f }));
      fetchOrders(sid, f);
    }
  };

  const handleFilterChange = (sid, key, val) => {
    const updated = { ...getFilters(sid), [key]: val };
    setFilters(prev => ({ ...prev, [sid]: updated }));
    fetchOrders(sid, updated);
  };

  const clearFilters = (sid) => {
    const f = defaultFilters();
    setFilters(prev => ({ ...prev, [sid]: f }));
    fetchOrders(sid, f);
  };

  const clearDates = (sid) => {
    const updated = { ...getFilters(sid), date_from: '', date_to: '' };
    setFilters(prev => ({ ...prev, [sid]: updated }));
    fetchOrders(sid, updated);
  };

  if (shipments.length === 0) return <div className="shipments-section"><h2>📦 Shipments</h2><p>No shipments found.</p></div>;

  return (
    <div className="shipments-section">
      <h2>📦 All Shipments</h2>
      {shipments.map(shipment => {
        const isOpen   = expandedId === shipment.id;
        const fi       = getFilters(shipment.id);
        const orders   = shipmentOrders[shipment.id] || [];
        const stats    = orderStats[shipment.id];
        const isLoading = loadingId === shipment.id;

        return (
          <div key={shipment.id} className="shipment-expand-block">
            {/* ── Shipment header row ── */}
            <div
              className={`shipment-header-row ${isOpen ? 'shipment-header-row--open' : ''}`}
              onClick={() => toggleShipment(shipment.id)}
            >
              <div className="shipment-header-left">
                <span className="shipment-chevron">{isOpen ? '▼' : '▶'}</span>
                <strong className="shipment-ref">{shipment.shipment_ref}</strong>
                <span className={`status-badge status-${shipment.status}`}>{shipment.status.toUpperCase()}</span>
                <span className="shipment-meta">📦 {shipment.total_boxes} boxes</span>
                {shipment.variety_names?.length > 0 && (
                  <span className="shipment-meta">🍋 {shipment.variety_names.join(', ')}</span>
                )}
              </div>
              {stats && (
                <div className="shipment-order-pills">
                  <span className="pill pill-total">{stats.orders_total} orders</span>
                  <span className="pill pill-booked">{stats.orders_booked} booked</span>
                  <span className="pill pill-pending">{stats.orders_pending} pending</span>
                  <span className="pill pill-transit">{stats.orders_in_transit} in transit</span>
                  <span className="pill pill-delivered">{stats.orders_delivered} delivered</span>
                  {stats.orders_yet_to_book > 0 && (
                    <span className="pill pill-ytb">{stats.orders_yet_to_book} yet to book</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Expanded detail panel ── */}
            {isOpen && (
              <div className="shipment-detail-panel">

                {/* Shipment info grid */}
                <div className="shipment-info-grid">
                  <div className="shipment-info-block">
                    <div className="info-label">Boxes</div>
                    <div className="info-value">{shipment.total_boxes}</div>
                  </div>
                  <div className="shipment-info-block">
                    <div className="info-label">Status</div>
                    <div className="info-value">
                      <span className={`status-badge status-${shipment.status}`}>{shipment.status}</span>
                    </div>
                  </div>
                  {shipment.notes && (
                    <div className="shipment-info-block" style={{ gridColumn: 'span 2' }}>
                      <div className="info-label">Notes</div>
                      <div className="info-value">{shipment.notes}</div>
                    </div>
                  )}
                  {stats && (
                    <>
                      <div className="shipment-info-block">
                        <div className="info-label">Total Orders</div>
                        <div className="info-value">{stats.orders_total}</div>
                      </div>
                      <div className="shipment-info-block">
                        <div className="info-label" style={{ color: '#16a34a' }}>Booked</div>
                        <div className="info-value" style={{ color: '#16a34a', fontWeight: 700 }}>{stats.orders_booked}</div>
                      </div>
                      <div className="shipment-info-block">
                        <div className="info-label" style={{ color: '#d97706' }}>Pending</div>
                        <div className="info-value" style={{ color: '#d97706' }}>{stats.orders_pending}</div>
                      </div>
                      <div className="shipment-info-block">
                        <div className="info-label" style={{ color: '#3b82f6' }}>In Transit</div>
                        <div className="info-value" style={{ color: '#3b82f6' }}>{stats.orders_in_transit}</div>
                      </div>
                      <div className="shipment-info-block">
                        <div className="info-label" style={{ color: '#10b981' }}>Delivered</div>
                        <div className="info-value" style={{ color: '#10b981', fontWeight: 700 }}>{stats.orders_delivered}</div>
                      </div>
                      <div className="shipment-info-block">
                        <div className="info-label" style={{ color: '#ef4444' }}>Yet to Book</div>
                        <div className="info-value" style={{ color: '#ef4444' }}>{stats.orders_yet_to_book}</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Orders filter bar */}
                <div className="shipment-orders-header">
                  <h4>📋 Orders</h4>
                  <div className="orders-filter-row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <select value={fi.order_status} onChange={e => handleFilterChange(shipment.id, 'order_status', e.target.value)} className="orders-filter-select">
                      <option value="">All Order Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select value={fi.payment_status} onChange={e => handleFilterChange(shipment.id, 'payment_status', e.target.value)} className="orders-filter-select">
                      <option value="">All Payment</option>
                      <option value="pending">Pending</option>
                      <option value="succeeded">Succeeded</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select value={fi.delivery_type} onChange={e => handleFilterChange(shipment.id, 'delivery_type', e.target.value)} className="orders-filter-select">
                      <option value="">All Modes</option>
                      <option value="delivery">Home Delivery</option>
                      <option value="pickup">Self Pickup</option>
                    </select>
                    <div className="orders-date-range">
                      <input type="date" value={fi.date_from} onChange={e => handleFilterChange(shipment.id, 'date_from', e.target.value)} className="orders-date-input" title="From" />
                      <span className="date-range-sep">→</span>
                      <input type="date" value={fi.date_to} onChange={e => handleFilterChange(shipment.id, 'date_to', e.target.value)} className="orders-date-input" title="To" />
                    </div>
                    <button className="orders-clear-btn" onClick={() => clearDates(shipment.id)}>This week</button>
                    <button className="orders-clear-btn" onClick={() => clearFilters(shipment.id)}>Reset all</button>
                    <button className="orders-clear-btn" style={{ background: '#e0f2fe', borderColor: '#7dd3fc' }} onClick={() => fetchOrders(shipment.id, fi)}>Refresh</button>
                    <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'center' }}>{orders.length} order(s)</span>
                  </div>
                </div>

                {/* Orders table */}
                {isLoading ? (
                  <div className="loading" style={{ padding: 16 }}>Loading orders…</div>
                ) : orders.length === 0 ? (
                  <p style={{ color: '#6b7280', padding: '12px 0' }}>No orders match the filter.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="shipment-table orders-table">
                      <thead>
                        <tr>
                          <th>Order Ref</th>
                          <th>Customer</th>
                          <th>Phone</th>
                          <th>Mode</th>
                          <th>Location / Address</th>
                          <th>Order Status</th>
                          <th>Payment</th>
                          <th>Method</th>
                          <th>Assigned To</th>
                          <th>Del. Code</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map(o => {
                          const isExp = expandedOrderId === o.id;
                          return (
                            <React.Fragment key={o.id}>
                              <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedOrderId(isExp ? null : o.id)}>
                                <td><strong className="order-ref-link">{o.order_ref}</strong></td>
                                <td>{o.customer_name}</td>
                                <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                                <td>
                                  <span className={`status-badge ${o.delivery_type === 'delivery' ? 'status-in-transit' : 'status-pending'}`}>
                                    {o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                  </span>
                                </td>
                                <td className="orders-address-cell">
                                  {o.delivery_type === 'pickup'
                                    ? (o.pickup_location_name || `Loc #${o.pickup_location_id}`)
                                    : (o.delivery_address || '—')}
                                </td>
                                <td><span className={`status-badge status-${o.order_status}`}>{o.order_status}</span></td>
                                <td>
                                  <span className={`status-badge ${o.payment_status === 'succeeded' ? 'status-completed' : o.payment_status === 'failed' ? 'status-missing' : 'status-pending'}`}>
                                    {o.payment_status}
                                  </span>
                                </td>
                                <td style={{ fontSize: 12 }}>{o.payment_method || '—'}</td>
                                <td style={{ fontSize: 12 }}>
                                  {o.delivery_boy_name
                                    ? <span className="assigned-badge">{o.delivery_boy_name}</span>
                                    : <span style={{ color: '#9ca3af' }}>—</span>}
                                </td>
                                <td style={{ fontSize: 11, color: '#6b7280' }}>{o.delivery_code || '—'}</td>
                                <td style={{ textAlign: 'center', fontSize: 13 }}>
                                  <button className="items-toggle-btn" onClick={e => { e.stopPropagation(); setExpandedOrderId(isExp ? null : o.id); }}>
                                    {o.items_count} {isExp ? '▲' : '▼'}
                                  </button>
                                </td>
                                <td><strong>₹{o.total_price}</strong></td>
                                <td style={{ fontSize: 12 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                              </tr>
                              {isExp && (
                                <tr className="order-detail-row">
                                  <td colSpan={13}>
                                    <div className="order-detail-panel">
                                      <div className="order-detail-grid">
                                        <div className="order-detail-block">
                                          <div className="order-detail-label">Items Ordered</div>
                                          <table className="order-items-mini-table">
                                            <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Subtotal</th></tr></thead>
                                            <tbody>
                                              {o.items.map((it, idx) => (
                                                <tr key={idx}>
                                                  <td>{it.variant}</td>
                                                  <td>{it.qty}</td>
                                                  <td>₹{it.unit_price}</td>
                                                  <td>₹{it.subtotal}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                          <div className="order-price-row">
                                            <span>Delivery fee: ₹{o.delivery_fee}</span>
                                            <span>Total: <strong>₹{o.total_price}</strong></span>
                                          </div>
                                        </div>
                                        <div className="order-detail-block">
                                          <div className="order-detail-label">Delivery Info</div>
                                          <p><strong>Type:</strong> {o.delivery_type === 'pickup' ? 'Self Pickup' : 'Home Delivery'}</p>
                                          {o.delivery_type === 'pickup'
                                            ? <p><strong>Location:</strong> {o.pickup_location_name || `#${o.pickup_location_id}`}</p>
                                            : <p><strong>Address:</strong> {o.delivery_address || '—'}</p>}
                                          {o.delivery_boy_name && <p><strong>Assigned To:</strong> {o.delivery_boy_name}</p>}
                                          {o.delivery_code && <p><strong>Del. Code:</strong> {o.delivery_code}</p>}
                                          {o.assigned_at && <p><strong>Assigned At:</strong> {new Date(o.assigned_at).toLocaleString()}</p>}
                                          {o.customer_notes && <p><strong>Notes:</strong> {o.customer_notes}</p>}
                                        </div>
                                        <div className="order-detail-block">
                                          <div className="order-detail-label">Customer</div>
                                          <p>{o.customer_name}</p>
                                          <p>{o.customer_email || '—'}</p>
                                          <p>{o.customer_phone || '—'}</p>
                                          <div className="order-detail-label" style={{ marginTop: 12 }}>Payment</div>
                                          <p><strong>Status:</strong> {o.payment_status}</p>
                                          <p><strong>Method:</strong> {o.payment_method || '—'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>
                      Showing {orders.length} order(s) · click a row to expand details
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard({ onLogout, defaultTab }) {
  const { setAdminView } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab || 'dashboard');
  const [manageSubTab, setManageSubTab] = useState('shipments');
  const [shipmentSubTab, setShipmentSubTab] = useState('list');
  const [dashboardData, setDashboardData] = useState(null);
  const [shipments, setShipments] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [varietyBoxCounts, setVarietyBoxCounts] = useState({});
  const [varietyBoxWeights, setVarietyBoxWeights] = useState({});
  const [varietyPricesPerKg, setVarietyPricesPerKg] = useState({});
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Orders tab state
  const [allOrders, setAllOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilters, setOrderFilters] = useState({
    delivery_type: '', payment_status: '', order_status: '',
    pickup_location_id: '', delivery_boy_id: '', assigned: '',
    payment_method: '', date_from: '', date_to: '',
  });
  const [activeFilters, setActiveFilters] = useState({
    delivery_type: false,
    payment_status: false,
    order_status: false,
    pickup_location_id: false,
    payment_method: false,
  });
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);   // order object being edited in modal
  const [orderSelectedIds, setOrderSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [adminPickupLocations, setAdminPickupLocations] = useState([]);

  // Delivery boy state
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [unassignedOrders, setUnassignedOrders] = useState([]);
  const [dbForm, setDbForm] = useState({ username: '', password: '', full_name: '', phone: '' });
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState('');
  const [dbSuccess, setDbSuccess] = useState('');
  const [selectedBoyId, setSelectedBoyId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignResult, setAssignResult] = useState(null);

  // Delivery tab – unassigned filter
  const [unassignedFilter, setUnassignedFilter] = useState({ shipment_id: '', order_status: '' });

  // Delivery tab – assigned orders section
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState({
    delivery_boy_id: '', shipment_id: '', order_status: '', delivery_code: '',
  });

  // Delivery tab – null-shipment backfill
  const [nullShipmentCount, setNullShipmentCount] = useState(null);
  const [backfillShipmentId, setBackfillShipmentId] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  // Products tab state
  const [adminProducts, setAdminProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState(null);
  const [editingPrices, setEditingPrices] = useState({});   // { [productId]: string }
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [priceErrors, setPriceErrors] = useState({});       // { [productId]: string }
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductForm, setAddProductForm] = useState({ name: '', origin: '', tag: '', description: '', size_name: 'Standard', unit: 'box', price: '', currency: 'SGD' });
  const [addProductSaving, setAddProductSaving] = useState(false);
  const [addProductError, setAddProductError] = useState('');

  // Abandoned checkouts
  const [abandonedOrders, setAbandonedOrders] = useState([]);
  const [abandonedLoading, setAbandonedLoading] = useState(false);
  const [ordersSubTab, setOrdersSubTab] = useState('all'); // 'all' | 'abandoned'

  // Global toast — shared across all actions
  const [toast, setToast] = useState(null);                 // { type: 'success'|'error', msg: string }

  // Config tab state
  const [bannerMessages, setBannerMessages] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);


  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'manage' && manageSubTab === 'shipments') {
      fetchShipments();
    }
  }, [activeTab, manageSubTab]);

  useEffect(() => {
    if (activeTab === 'manage' && manageSubTab === 'shipments' && shipmentSubTab === 'create') {
      fetchAllProducts();
    }
  }, [activeTab, manageSubTab, shipmentSubTab]);

  useEffect(() => {
    if (activeTab === 'delivery') {
      fetchDeliveryBoys();
      fetchUnassignedOrders();
      fetchAssignedOrders();
      fetchNullShipmentCount();
      if (shipments.length === 0) fetchShipments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchAllOrders();
      fetchAbandonedOrders();
      fetchAdminPickupLocations();
      fetchDeliveryBoys();
      if (shipments.length === 0) fetchShipments();
      if (adminProducts.length === 0) fetchAdminProducts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'manage' && manageSubTab === 'products') {
      fetchAdminProducts();
    }
  }, [activeTab, manageSubTab]);

  useEffect(() => {
    if (activeTab === 'manage' && manageSubTab === 'site-messages') {
      fetch(`${API_BASE}/api/v1/config`)
        .then(r => r.json())
        .then(json => setBannerMessages(json.data?.banner_messages || ''))
        .catch(() => {});
    }
  }, [activeTab, manageSubTab]);


  const fetchAdminProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/products`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAdminProducts(data.data || []);
      }
    } catch (_) {}
    setProductsLoading(false);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveBannerMessages = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/config/banner_messages`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ config_value: bannerMessages }),
      });
      if (res.ok) {
        showToast('success', 'Banner messages saved.');
      } else {
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || b.error || errMsg; } catch (_) {}
        showToast('error', `Failed to save banner: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', `Failed to save banner: ${err.message || 'Network error'}`);
    }
    setConfigSaving(false);
  };

  const handleToggleProductActive = async (productId) => {
    setTogglingProductId(productId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/products/${productId}/active`, {
        method: 'PATCH',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        const nowActive = data.data.is_active;
        setAdminProducts(prev =>
          prev.map(p => p.id === productId ? { ...p, is_active: nowActive } : p)
        );
        showToast('success', nowActive ? 'Product enabled.' : 'Product disabled.');
      } else {
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || b.error || errMsg; } catch (_) {}
        showToast('error', `Toggle failed: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', `Toggle failed: ${err.message || 'Network error'}`);
    }
    setTogglingProductId(null);
  };

  const handleUpdatePrice = async (productId) => {
    const raw = editingPrices[productId];
    const price = parseFloat(raw);
    if (isNaN(price) || price <= 0) return;
    setSavingPriceId(productId);
    setPriceErrors(prev => { const n = { ...prev }; delete n[productId]; return n; });
    try {
      const res = await fetch(`${API_BASE}/api/v1/products/${productId}/price`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ price }),
      });
      if (res.ok) {
        setEditingPrices(prev => { const n = { ...prev }; delete n[productId]; return n; });
        await fetchAdminProducts();
        showToast('success', `Price updated to $${price.toFixed(2)}.`);
      } else {
        let errMsg = `Error ${res.status}`;
        try { const body = await res.json(); errMsg = body.detail || body.error || errMsg; } catch (_) {}
        setPriceErrors(prev => ({ ...prev, [productId]: errMsg }));
        showToast('error', `Price save failed: ${errMsg}`);
      }
    } catch (err) {
      const msg = err.message || 'Network error';
      setPriceErrors(prev => ({ ...prev, [productId]: msg }));
      showToast('error', `Price save failed: ${msg}`);
    }
    setSavingPriceId(null);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const price = parseFloat(addProductForm.price);
    if (!addProductForm.name.trim()) { setAddProductError('Name is required.'); return; }
    if (isNaN(price) || price <= 0) { setAddProductError('Enter a valid price.'); return; }
    setAddProductSaving(true);
    setAddProductError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...addProductForm, price }),
      });
      if (res.ok) {
        setShowAddProduct(false);
        setAddProductForm({ name: '', origin: '', tag: '', description: '', size_name: 'Standard', unit: 'box', price: '', currency: 'SGD' });
        await fetchAdminProducts();
        showToast('success', `Product "${addProductForm.name}" created.`);
      } else {
        let msg = `Error ${res.status}`;
        try { const b = await res.json(); msg = b.detail || b.error || msg; } catch (_) {}
        setAddProductError(msg);
      }
    } catch (err) {
      setAddProductError(err.message || 'Network error');
    }
    setAddProductSaving(false);
  };

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-boys`, { headers });
      if (res.ok) setDeliveryBoys(await res.json());
    } catch (_) {}
  };

  const fetchUnassignedOrders = async (filters = unassignedFilter) => {
    try {
      const params = new URLSearchParams();
      if (filters.shipment_id) params.set('shipment_id', filters.shipment_id);
      if (filters.order_status) params.set('order_status', filters.order_status);
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/unassigned?${params}`, { headers });
      if (res.ok) setUnassignedOrders(await res.json());
    } catch (_) {}
  };

  const fetchAssignedOrders = async (filters = assignedFilter) => {
    setAssignedLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.delivery_boy_id) params.set('delivery_boy_id', filters.delivery_boy_id);
      if (filters.shipment_id) params.set('shipment_id', filters.shipment_id);
      if (filters.order_status) params.set('order_status', filters.order_status);
      if (filters.delivery_code) params.set('delivery_code', filters.delivery_code);
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/assigned?${params}`, { headers });
      if (res.ok) setAssignedOrders(await res.json());
    } catch (_) {}
    finally { setAssignedLoading(false); }
  };

  const fetchNullShipmentCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/null-shipment-count`, { headers });
      if (res.ok) { const d = await res.json(); setNullShipmentCount(d.count); }
    } catch (_) {}
  };

  const handleBackfillShipment = async (onlyNull) => {
    if (!backfillShipmentId) return;
    setBackfillLoading(true); setBackfillResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-shipment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shipment_id: Number(backfillShipmentId), only_null: onlyNull }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      const data = await res.json();
      setBackfillResult({ success: true, message: `Linked shipment #${data.shipment_id} (${data.shipment_ref}) to ${data.count} order(s).` });
      fetchNullShipmentCount();
      fetchAssignedOrders(assignedFilter);
      fetchUnassignedOrders(unassignedFilter);
    } catch (err) {
      setBackfillResult({ success: false, message: err.message });
    } finally { setBackfillLoading(false); }
  };

  const handleUnassignedFilterChange = (key, value) => {
    const updated = { ...unassignedFilter, [key]: value };
    setUnassignedFilter(updated);
    fetchUnassignedOrders(updated);
  };

  const handleAssignedFilterChange = (key, value) => {
    const updated = { ...assignedFilter, [key]: value };
    setAssignedFilter(updated);
    fetchAssignedOrders(updated);
  };

  const fetchAllOrders = async (filters = orderFilters) => {
    setOrdersLoading(true);
    setBulkResult(null);
    try {
      const params = new URLSearchParams();
      if (filters.delivery_type) params.set('delivery_type', filters.delivery_type);
      if (filters.payment_status) params.set('payment_status', filters.payment_status);
      if (filters.order_status) params.set('order_status', filters.order_status);
      if (filters.pickup_location_id) params.set('pickup_location_id', filters.pickup_location_id);
      if (filters.delivery_boy_id) params.set('delivery_boy_id', filters.delivery_boy_id);
      if (filters.assigned) params.set('assigned', filters.assigned);
      if (filters.payment_method) params.set('payment_method', filters.payment_method);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      const res = await fetch(`${API_BASE}/api/v1/admin/orders?${params}`, { headers });
      if (res.ok) setAllOrders(await res.json());
    } catch (_) {}
    finally { setOrdersLoading(false); }
  };

  const fetchAdminPickupLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/pickup-locations`, { headers });
      if (res.ok) setAdminPickupLocations(await res.json());
    } catch (_) {}
  };

  const fetchAbandonedOrders = async () => {
    setAbandonedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/abandoned-checkouts`, { headers });
      if (res.ok) setAbandonedOrders(await res.json());
    } catch (_) {}
    finally { setAbandonedLoading(false); }
  };

  const handleOrderFilterChange = (key, value) => {
    const updated = { ...orderFilters, [key]: value };
    setOrderFilters(updated);
    setOrderSelectedIds([]);
    fetchAllOrders(updated);
  };

  const toggleOrderRowSelect = (id) => {
    setOrderSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAllOrders = (e) => {
    setOrderSelectedIds(e.target.checked ? allOrders.map(o => o.id) : []);
  };

  const handleUpdateOrderShipment = async (orderId, shipmentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${orderId}/shipment`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ shipment_id: shipmentId || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      fetchAllOrders();
      showToast('success', 'Order shipment updated.');
    } catch (err) {
      showToast('error', `Failed to update shipment: ${err.message}`);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || orderSelectedIds.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ order_ids: orderSelectedIds, new_status: bulkStatus, note: bulkNote || null }),
      });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const d = await res.json(); errMsg = d.detail || JSON.stringify(d) || errMsg; } catch (_) {}
        console.error('Bulk update error:', errMsg, 'payload:', { order_ids: orderSelectedIds, new_status: bulkStatus });
        throw new Error(errMsg);
      }
      const data = await res.json();
      setBulkResult({ success: true, message: `Updated ${data.count} order(s) to "${data.new_status}"` });
      showToast('success', `Updated ${data.count} order(s) to "${data.new_status}".`);
      setOrderSelectedIds([]);
      setBulkStatus('');
      setBulkNote('');
      fetchAllOrders();
    } catch (err) {
      setBulkResult({ success: false, message: err.message });
      showToast('error', `Bulk update failed: ${err.message}`);
    }
  };

  const handleCollectPayment = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/${orderId}/collect-payment`, {
        method: 'PUT',
        headers,
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      setAllOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, payment_status: 'succeeded' } : o
      ));
      showToast('success', `Payment collected for order #${orderId}.`);
    } catch (err) {
      showToast('error', `Collect payment failed: ${err.message}`);
    }
  };

  const handleAddDeliveryBoy = async (e) => {
    e.preventDefault();
    setDbLoading(true); setDbError(''); setDbSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-boys`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(dbForm),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      setDbSuccess('Delivery boy added!');
      setDbForm({ username: '', password: '', full_name: '', phone: '' });
      fetchDeliveryBoys();
      showToast('success', `Delivery boy "${dbForm.full_name || dbForm.username}" added.`);
    } catch (err) {
      setDbError(err.message);
      showToast('error', `Failed to add delivery boy: ${err.message}`);
    }
    finally { setDbLoading(false); }
  };

  const handleAssignOrders = async () => {
    if (!selectedBoyId || !deliveryDate || selectedOrderIds.length === 0) return;
    setAssignLoading(true); setAssignResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-boys/${selectedBoyId}/assign`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: selectedOrderIds, delivery_date: deliveryDate }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      const data = await res.json();
      setAssignResult(data);
      setSelectedOrderIds([]);
      fetchUnassignedOrders();
      fetchAssignedOrders();
      showToast('success', `${selectedOrderIds.length} order(s) assigned successfully.`);
    } catch (err) {
      setAssignResult({ error: err.message });
      showToast('error', `Assign failed: ${err.message}`);
    }
    finally { setAssignLoading(false); }
  };

  const toggleOrderSelect = (id) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedBoy = deliveryBoys.find(b => b.id === parseInt(selectedBoyId));
  const previewCode = selectedBoy && deliveryDate
    ? `${selectedBoy.username}_${deliveryDate.replace(/-/g, '')}`
    : '';

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/dashboard/summary`, {
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/shipments`, {
        headers,
      });
      if (!response.ok) throw new Error('Failed to fetch shipments');
      const data = await response.json();
      setShipments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setAllProducts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchVariantsForProduct = async (productId) => {
    if (!productId) return;
    setLoadingVariants(true);
    setProductVariants([]);
    setVarietyBoxCounts({});
    try {
      const response = await fetch(`${API_BASE}/api/v1/products/${productId}/variants`);
      if (!response.ok) throw new Error('Failed to fetch variants');
      const data = await response.json();
      setProductVariants(data.data || []);
    } catch (err) {
      console.error('Failed to fetch variants:', err);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const varieties = Object.entries(varietyBoxCounts)
      .filter(([, count]) => parseInt(count) > 0)
      .map(([productId, count]) => ({
        product_id: parseInt(productId),
        box_count: parseInt(count),
        box_weight: varietyBoxWeights[productId] ? parseFloat(varietyBoxWeights[productId]) : null,
        price_per_kg: varietyPricesPerKg[productId] ? parseFloat(varietyPricesPerKg[productId]) : null,
      }));

    const totalBoxes = varieties.reduce((sum, v) => sum + v.box_count, 0)
      || parseInt(formData.get('total_boxes') || '0');

    if (totalBoxes < 1) {
      setError('Please enter the number of boxes for at least one mango variety.');
      return;
    }

    const payload = {
      total_boxes: totalBoxes,
      expected_value: formData.get('expected_value') ? parseFloat(formData.get('expected_value')) : null,
      notes: formData.get('notes'),
      varieties,
    };

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/shipments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create shipment');
      e.target.reset();
      setProductVariants([]);
      setVarietyBoxCounts({});
      setVarietyBoxWeights({});
      setVarietyPricesPerKg({});
      fetchAllProducts();
      showToast('success', 'Shipment created successfully!');
      fetchShipments();
      setShipmentSubTab('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_token');
    localStorage.removeItem('admin_user');
    onLogout();
  };

  const filterGroups = [
    {
      key: 'delivery_type',
      label: 'Delivery Mode',
      options: [
        { value: 'delivery', label: '🚚 Home Delivery' },
        { value: 'pickup',   label: '🏪 Self Pickup' },
      ],
    },
    {
      key: 'payment_status',
      label: 'Payment Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'succeeded', label: 'Succeeded' },
        { value: 'failed',    label: 'Failed' },
      ],
    },
    {
      key: 'order_status',
      label: 'Order Status',
      options: [
        { value: 'pending',   label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'shipped',   label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    {
      key: 'pickup_location_id',
      label: 'Locations',
      options: adminPickupLocations.map(loc => ({ value: String(loc.id), label: loc.name })),
    },
    {
      key: 'payment_method',
      label: 'Payment Methods',
      options: [
        { value: 'card',      label: '💳 Card' },
        { value: 'paynow',    label: 'PayNow' },
        { value: 'cash',      label: '💵 Cash' },
        { value: 'pay_later', label: '💰 Pay Later' },
      ],
    },
  ];

  return (
    <div className="admin-dashboard">

      {/* ── Order Edit Modal ── */}
      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          headers={headers}
          activeProducts={adminProducts.filter(p => p.is_active)}
          onClose={() => setEditingOrder(null)}
          onSaved={(updated) => {
            setAllOrders(prev => prev.map(o =>
              o.id === editingOrder.id
                ? { ...o, order_status: updated.order_status, total_price: updated.total_price }
                : o
            ));
            fetchAllOrders();
            setEditingOrder(null);
            showToast('success', `Order ${updated.order_ref} updated.`);
          }}
        />
      )}

      {/* ── Global toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', borderRadius: 12, minWidth: 260, maxWidth: 420,
          background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1.5px solid ${toast.type === 'success' ? '#16a34a' : '#dc2626'}`,
          color: toast.type === 'success' ? '#15803d' : '#b91c1c',
          fontWeight: 600, fontSize: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          animation: 'fadeInDown 0.25s ease',
        }}>
          <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✅' : '❌'}</span>
          {toast.msg}
        </div>
      )}

      <div className="admin-header">
        <div className="header-content">
          <h1>🌿 Garden Roots Admin</h1>
          <div className="user-info">
            <span>{user.username}</span>
            <button onClick={() => setAdminView('store')} className="logout-button" style={{ marginRight: 8 }}>
              🛍️ Store View
            </button>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        </div>
      </div>

      <div className="admin-nav">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          🗂️ Manage
        </button>
        <button
          className={`nav-tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💰 Payments
        </button>
        <button
          className={`nav-tab ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          🛵 Delivery
        </button>
        <button
          className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Orders
        </button>
      </div>

      <div className="admin-content">
        {error && <div className="error-banner">⚠️ {error}</div>}
        {loading && <div className="loading">⏳ Loading...</div>}

        {activeTab === 'dashboard' && dashboardData && !loading && (() => {
          const shipmentStatusData = [
            { name: 'Completed',  value: dashboardData.completed_shipments,  color: '#22c55e' },
            { name: 'In Transit', value: dashboardData.in_transit_shipments,  color: '#3b82f6' },
            { name: 'Pending',    value: dashboardData.pending_shipments,     color: '#f59e0b' },
          ].filter(d => d.value > 0);

          const orderBarData = (dashboardData.shipment_summaries || []).map(s => ({
            name:       s.shipment_ref,
            Delivered:  s.orders_delivered,
            Booked:     s.orders_booked,
            'In Transit': s.orders_in_transit,
            Pending:    s.orders_pending,
            'Yet to Book': s.orders_yet_to_book,
          }));

          return (
            <div className="dashboard-section">
              <h2>📈 Dashboard</h2>

              {/* ── Row 1: stat cards + donut ── */}
              <div className="dash-row">
                <div className="stats-grid dash-stats">
                  <div className="stat-card">
                    <h3>Total Shipments</h3>
                    <p className="stat-value">{dashboardData.total_shipments}</p>
                  </div>
                  <div className="stat-card">
                    <h3>✅ Completed</h3>
                    <p className="stat-value" style={{ color: '#22c55e' }}>{dashboardData.completed_shipments}</p>
                  </div>
                  <div className="stat-card">
                    <h3>⏳ Pending</h3>
                    <p className="stat-value" style={{ color: '#f59e0b' }}>{dashboardData.pending_shipments}</p>
                  </div>
                  <div className="stat-card">
                    <h3>🚚 In Transit</h3>
                    <p className="stat-value" style={{ color: '#3b82f6' }}>{dashboardData.in_transit_shipments}</p>
                  </div>
                  <div className="stat-card">
                    <h3>📦 Total Boxes</h3>
                    <p className="stat-value">{dashboardData.total_boxes}</p>
                  </div>
                  <div className="stat-card">
                    <h3>💰 Revenue</h3>
                    <p className="stat-value" style={{ color: '#10b981' }}>
                      ${dashboardData.total_delivery_revenue.toFixed(2)}
                    </p>
                  </div>
                </div>

                {shipmentStatusData.length > 0 && (
                  <div className="dash-chart-card">
                    <h3 className="dash-chart-title">Shipment Status</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={shipmentStatusData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {shipmentStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* ── Alert banner ── */}
              {dashboardData.yet_to_book_globally > 0 && (
                <div className="stat-card" style={{ marginTop: 20, background: '#fef9c3', border: '1px solid #fbbf24' }}>
                  <h3>⚠️ Paid orders not linked to any shipment</h3>
                  <p className="stat-value" style={{ color: '#d97706' }}>{dashboardData.yet_to_book_globally}</p>
                </div>
              )}

              {/* ── Row 2: orders bar chart + summary table ── */}
              {orderBarData.length > 0 && (
                <>
                  <h3 style={{ marginTop: 30, marginBottom: 12 }}>📦 Orders per Shipment</h3>
                  <div className="dash-row" style={{ alignItems: 'flex-start', gap: 24 }}>
                    <div className="dash-chart-card" style={{ flex: '1 1 420px' }}>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={orderBarData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="Delivered"    stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                          <Bar dataKey="Booked"       stackId="a" fill="#22c55e" />
                          <Bar dataKey="In Transit"   stackId="a" fill="#3b82f6" />
                          <Bar dataKey="Pending"      stackId="a" fill="#f59e0b" />
                          <Bar dataKey="Yet to Book"  stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ flex: '1 1 320px', overflowX: 'auto' }}>
                      <table className="shipment-table">
                        <thead>
                          <tr>
                            <th>Ref</th>
                            <th>Boxes</th>
                            <th>Total</th>
                            <th style={{ color: '#10b981' }}>Del.</th>
                            <th style={{ color: '#3b82f6' }}>Transit</th>
                            <th style={{ color: '#f59e0b' }}>Pend.</th>
                            <th style={{ color: '#ef4444' }}>Unbooked</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.shipment_summaries.map(s => (
                            <tr key={s.shipment_ref}>
                              <td><strong>{s.shipment_ref}</strong></td>
                              <td>{s.total_boxes}</td>
                              <td>{s.orders_total}</td>
                              <td style={{ color: '#10b981', fontWeight: 700 }}>{s.orders_delivered}</td>
                              <td style={{ color: '#3b82f6' }}>{s.orders_in_transit}</td>
                              <td style={{ color: '#f59e0b' }}>{s.orders_pending}</td>
                              <td style={{ color: '#ef4444' }}>{s.orders_yet_to_book}</td>
                              <td><span className={`status-badge status-${s.status}`}>{s.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {activeTab === 'manage' && (
          <div className="manage-sub-nav">
            {[
              { key: 'shipments',     label: '📦 Shipments' },
              { key: 'locations',     label: '📍 Locations' },
              { key: 'products',      label: '🥭 Products' },
              { key: 'promos',        label: '🎟️ Promos' },
              { key: 'site-messages', label: '📢 Site Messages' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`manage-sub-tab ${manageSubTab === key ? 'active' : ''}`}
                onClick={() => setManageSubTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'manage' && manageSubTab === 'shipments' && !loading && (
          <div className="shipments-section">
            <div className="shipment-sub-nav">
              <button
                className={`sub-tab ${shipmentSubTab === 'list' ? 'active' : ''}`}
                onClick={() => setShipmentSubTab('list')}
              >
                📦 All Shipments
              </button>
              <button
                className={`sub-tab ${shipmentSubTab === 'create' ? 'active' : ''}`}
                onClick={() => setShipmentSubTab('create')}
              >
                ➕ Create Shipment
              </button>
            </div>

            {shipmentSubTab === 'list' && (
              <ShipmentsView shipments={shipments} headers={headers} API_BASE={API_BASE} />
            )}

            {shipmentSubTab === 'create' && (
              <div className="create-section">
                <h2>➕ Create New Shipment</h2>

                <form onSubmit={handleCreateShipment} className="create-form">
                  {(() => {
                    const total = Object.values(varietyBoxCounts).reduce(
                      (sum, c) => sum + (parseInt(c) || 0), 0
                    );
                    return (
                      <div className="form-group">
                        <label>Mango Varieties — enter number of boxes for each variety *</label>
                        {allProducts.length === 0 ? (
                          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading varieties...</p>
                        ) : (
                          <table className="variety-entry-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Variety</th>
                                <th>No. of Boxes</th>
                                <th>Box Weight (kg)</th>
                                <th>Price per Kg (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allProducts.map((product, idx) => (
                                <tr key={product.id} className={varietyBoxCounts[product.id] > 0 ? 'variety-row-selected' : ''}>
                                  <td className="variety-idx">{idx + 1}</td>
                                  <td className="variety-name-cell">{product.name}</td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={varietyBoxCounts[product.id] || ''}
                                      onChange={(e) => setVarietyBoxCounts(prev => ({
                                        ...prev,
                                        [product.id]: e.target.value,
                                      }))}
                                      className="variety-box-input"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      placeholder="—"
                                      value={varietyBoxWeights[product.id] || ''}
                                      onChange={(e) => setVarietyBoxWeights(prev => ({
                                        ...prev,
                                        [product.id]: e.target.value,
                                      }))}
                                      className="variety-box-input"
                                      disabled={!varietyBoxCounts[product.id]}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="—"
                                      value={varietyPricesPerKg[product.id] || ''}
                                      onChange={(e) => setVarietyPricesPerKg(prev => ({
                                        ...prev,
                                        [product.id]: e.target.value,
                                      }))}
                                      className="variety-box-input"
                                      disabled={!varietyBoxCounts[product.id]}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="variety-total-row">
                                <td colSpan="2"><strong>Total Boxes</strong></td>
                                <td>
                                  {total > 0
                                    ? <span className="total-boxes-value">{total}</span>
                                    : <span style={{ color: '#9ca3af' }}>0</span>}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                      </div>
                    );
                  })()}

                  <div className="form-group">
                    <label htmlFor="expected_value">Expected Value (₹)</label>
                    <input
                      id="expected_value"
                      name="expected_value"
                      type="number"
                      step="0.01"
                      placeholder="Enter expected value (optional)"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      placeholder="Enter any notes about this shipment (optional)"
                      rows="4"
                    ></textarea>
                  </div>

                  <button type="submit" className="submit-button">
                    ✅ Create Shipment
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manage' && manageSubTab === 'locations' && !loading && (
          <div className="locations-section">
            <PickupLocationManager />
          </div>
        )}

        {activeTab === 'payments' && !loading && (
          <div className="payments-section">
            <PaymentTracker />
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="delivery-section">

            {/* ── Section A: Delivery Boys ── */}
            <div className="delivery-card">
              <h2>🛵 Delivery Boys</h2>
              <form onSubmit={handleAddDeliveryBoy} className="db-form">
                <div className="db-form-row">
                  <input placeholder="Full Name" value={dbForm.full_name} onChange={e => setDbForm(f => ({ ...f, full_name: e.target.value }))} />
                  <input placeholder="Phone" value={dbForm.phone} onChange={e => setDbForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="db-form-row">
                  <input placeholder="Username *" required value={dbForm.username} onChange={e => setDbForm(f => ({ ...f, username: e.target.value }))} />
                  <input placeholder="Password *" required type="password" value={dbForm.password} onChange={e => setDbForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                {dbError && <div className="db-error">{dbError}</div>}
                {dbSuccess && <div className="db-success">{dbSuccess}</div>}
                <button type="submit" className="submit-button" disabled={dbLoading}>{dbLoading ? 'Adding…' : '➕ Add Delivery Boy'}</button>
              </form>

              {deliveryBoys.length > 0 && (
                <table className="shipment-table" style={{ marginTop: 20 }}>
                  <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Phone</th><th>Active</th></tr></thead>
                  <tbody>
                    {deliveryBoys.map((b, i) => (
                      <tr key={b.id}>
                        <td>{i + 1}</td>
                        <td><strong>{b.full_name || '—'}</strong></td>
                        <td>{b.username}</td>
                        <td>{b.phone || '—'}</td>
                        <td><span style={{ color: b.is_active ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{b.is_active ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Section B: Assign Orders ── */}
            <div className="delivery-card" style={{ marginTop: 24 }}>
              <h2>📋 Assign Orders to Delivery Boy</h2>

              {/* Assignment controls */}
              <div className="assign-controls">
                <select value={selectedBoyId} onChange={e => { setSelectedBoyId(e.target.value); setAssignResult(null); }} className="assign-select">
                  <option value="">— Select Delivery Boy —</option>
                  {deliveryBoys.filter(b => b.is_active).map(b => (
                    <option key={b.id} value={b.id}>{b.full_name || b.username} ({b.username})</option>
                  ))}
                </select>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="assign-date" />
                {previewCode && (
                  <div className="delivery-code-preview">
                    Delivery Code: <strong>{previewCode}</strong>
                  </div>
                )}
              </div>

              {/* Unassigned orders filter bar */}
              <div className="delivery-filter-bar">
                <select
                  value={unassignedFilter.shipment_id}
                  onChange={e => handleUnassignedFilterChange('shipment_id', e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">All Shipments</option>
                  {shipments.map(s => (
                    <option key={s.id} value={s.id}>{s.shipment_ref}</option>
                  ))}
                </select>
                <select
                  value={unassignedFilter.order_status}
                  onChange={e => handleUnassignedFilterChange('order_status', e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">All Order Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                </select>
                <button className="orders-clear-btn" onClick={() => {
                  const cleared = { shipment_id: '', order_status: '' };
                  setUnassignedFilter(cleared);
                  fetchUnassignedOrders(cleared);
                }}>Clear</button>
                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>
                  {unassignedOrders.length} unassigned order(s)
                </span>
              </div>

              {unassignedOrders.length === 0 ? (
                <p style={{ color: '#6b7280', marginTop: 12 }}>No unassigned paid delivery orders match the filter.</p>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table className="shipment-table">
                    <thead>
                      <tr>
                        <th>
                          <input type="checkbox"
                            onChange={e => setSelectedOrderIds(e.target.checked ? unassignedOrders.map(o => o.id) : [])}
                            checked={selectedOrderIds.length === unassignedOrders.length && unassignedOrders.length > 0}
                          />
                        </th>
                        <th>Order Ref</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Delivery Address</th>
                        <th>Shipment</th>
                        <th>Items</th>
                        <th>Order Status</th>
                        <th>Total</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedOrders.map(o => (
                        <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => toggleOrderSelect(o.id)}>
                          <td><input type="checkbox" checked={selectedOrderIds.includes(o.id)} onChange={() => toggleOrderSelect(o.id)} onClick={e => e.stopPropagation()} /></td>
                          <td><strong>{o.order_ref}</strong></td>
                          <td>{o.customer_name}</td>
                          <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                          <td style={{ fontSize: 12, maxWidth: 180 }}>{o.delivery_address || '—'}</td>
                          <td style={{ fontSize: 12 }}>
                            {o.shipment_id ? <span className="shipment-id-badge">#{o.shipment_id}</span> : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>{o.items_count ?? '—'}</td>
                          <td><span className={`status-badge status-${o.order_status}`}>{o.order_status}</span></td>
                          <td><strong>₹{o.total_price}</strong></td>
                          <td style={{ fontSize: 12 }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedOrderIds.length > 0 && selectedBoyId && deliveryDate && (
                <button className="submit-button" style={{ marginTop: 16 }} onClick={handleAssignOrders} disabled={assignLoading}>
                  {assignLoading ? 'Assigning…' : `✅ Assign ${selectedOrderIds.length} Order(s) — Code: ${previewCode}`}
                </button>
              )}

              {assignResult && !assignResult.error && (
                <div className="db-success" style={{ marginTop: 12 }}>
                  ✅ Assigned {assignResult.assigned?.length} order(s) · Code: <strong>{assignResult.delivery_code}</strong>
                </div>
              )}
              {assignResult?.error && <div className="db-error" style={{ marginTop: 12 }}>{assignResult.error}</div>}
            </div>

            {/* ── Section C: Assigned Delivery Tracker ── */}
            <div className="delivery-card" style={{ marginTop: 24 }}>
              <h2>🚚 Assigned Orders — Delivery Status</h2>

              {/* ── Backfill panel: fix orders with null shipment_id ── */}
              {nullShipmentCount !== null && (
                <div className={`backfill-panel ${nullShipmentCount > 0 ? 'backfill-panel--warn' : 'backfill-panel--ok'}`}>
                  <div className="backfill-status">
                    {nullShipmentCount > 0 ? (
                      <span>⚠️ <strong>{nullShipmentCount}</strong> delivery order(s) have no shipment linked.</span>
                    ) : (
                      <span>✅ All delivery orders are linked to a shipment.</span>
                    )}
                  </div>

                  {nullShipmentCount > 0 && (
                    <div className="backfill-controls">
                      <select
                        value={backfillShipmentId}
                        onChange={e => setBackfillShipmentId(e.target.value)}
                        className="orders-filter-select"
                      >
                        <option value="">— Select Shipment —</option>
                        {shipments.map(s => (
                          <option key={s.id} value={s.id}>#{s.id} · {s.shipment_ref} ({s.status})</option>
                        ))}
                      </select>
                      <button
                        className="submit-button"
                        style={{ fontSize: 13, padding: '7px 16px' }}
                        disabled={!backfillShipmentId || backfillLoading}
                        onClick={() => handleBackfillShipment(true)}
                      >
                        {backfillLoading ? 'Linking…' : `Link to ${nullShipmentCount} unlinked order(s)`}
                      </button>
                    </div>
                  )}

                  {backfillResult && (
                    <div className={backfillResult.success ? 'db-success' : 'db-error'} style={{ marginTop: 6 }}>
                      {backfillResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* Filter bar */}
              <div className="delivery-filter-bar" style={{ marginBottom: 12 }}>
                <select
                  value={assignedFilter.delivery_boy_id}
                  onChange={e => handleAssignedFilterChange('delivery_boy_id', e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">All Delivery Boys</option>
                  {deliveryBoys.map(b => (
                    <option key={b.id} value={b.id}>{b.full_name || b.username}</option>
                  ))}
                </select>

                <select
                  value={assignedFilter.shipment_id}
                  onChange={e => handleAssignedFilterChange('shipment_id', e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">All Shipments</option>
                  {shipments.map(s => (
                    <option key={s.id} value={s.id}>{s.shipment_ref}</option>
                  ))}
                </select>

                <select
                  value={assignedFilter.order_status}
                  onChange={e => handleAssignedFilterChange('order_status', e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <input
                  type="text"
                  placeholder="Delivery code…"
                  value={assignedFilter.delivery_code}
                  onChange={e => handleAssignedFilterChange('delivery_code', e.target.value)}
                  className="orders-filter-select"
                  style={{ minWidth: 160 }}
                />

                <button className="orders-clear-btn" onClick={() => {
                  const cleared = { delivery_boy_id: '', shipment_id: '', order_status: '', delivery_code: '' };
                  setAssignedFilter(cleared);
                  fetchAssignedOrders(cleared);
                }}>Clear</button>

                <button className="orders-clear-btn" onClick={() => fetchAssignedOrders(assignedFilter)} style={{ background: '#e0f2fe', borderColor: '#7dd3fc' }}>
                  Refresh
                </button>

                <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
                  {assignedOrders.length} order(s)
                </span>
              </div>

              {assignedLoading ? (
                <div className="loading" style={{ padding: 20 }}>Loading…</div>
              ) : assignedOrders.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No assigned orders match the filter.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="shipment-table">
                    <thead>
                      <tr>
                        <th>Order Ref</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Delivery Address</th>
                        <th>Shipment</th>
                        <th>Items</th>
                        <th>Assigned To</th>
                        <th>Delivery Code</th>
                        <th>Assigned At</th>
                        <th>Order Status</th>
                        <th>Payment</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedOrders.map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.order_ref}</strong></td>
                          <td>{o.customer_name}</td>
                          <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                          <td style={{ fontSize: 12, maxWidth: 180 }}>{o.delivery_address || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {o.shipment_id ? <span className="shipment-id-badge">#{o.shipment_id}</span> : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>{o.items_count ?? '—'}</td>
                          <td>
                            <span className="assigned-badge">{o.delivery_boy_name || '—'}</span>
                          </td>
                          <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{o.delivery_code || '—'}</td>
                          <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {o.assigned_at ? new Date(o.assigned_at).toLocaleString() : '—'}
                          </td>
                          <td>
                            <span className={`status-badge status-${o.order_status}`}>{o.order_status}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${o.payment_status === 'succeeded' ? 'status-completed' : 'status-pending'}`}>
                              {o.payment_status}
                            </span>
                          </td>
                          <td><strong>₹{o.total_price}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            {(() => {
              const now = Date.now();
              const last1h  = allOrders.filter(o => o.created_at && (now - new Date(o.created_at).getTime()) <= 60 * 60 * 1000).length;
              const last23h = allOrders.filter(o => o.created_at && (now - new Date(o.created_at).getTime()) <= 24 * 60 * 60 * 1000).length;
              return (
                <div className="orders-heading-row">
                  <h2>📋 All Orders</h2>
                  <span className="orders-stat-badge orders-stat-total">{allOrders.length} Total</span>
                  <span className="orders-stat-badge orders-stat-new">{allOrders.filter(o => o.order_status === 'pending').length} New</span>
                  <span className="orders-stat-badge orders-stat-1h">⚡ {last1h} in last 1h</span>
                  <span className="orders-stat-badge orders-stat-23h">🕐 {last23h} in last 24h</span>
                  {abandonedOrders.length > 0 && (
                    <span className="orders-stat-badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                      ⚠️ {abandonedOrders.length} Abandoned
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Sub-tab toggle: All Orders / Abandoned Checkouts */}
            <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
              <button
                className={`checkout-type-btn${ordersSubTab === 'all' ? ' active' : ''}`}
                onClick={() => setOrdersSubTab('all')}
              >
                📋 All Orders
              </button>
              <button
                className={`checkout-type-btn${ordersSubTab === 'abandoned' ? ' active' : ''}`}
                onClick={() => { setOrdersSubTab('abandoned'); fetchAbandonedOrders(); }}
                style={abandonedOrders.length > 0 ? { borderColor: '#F59E0B', color: '#92400E' } : {}}
              >
                ⚠️ Abandoned Checkouts {abandonedOrders.length > 0 && `(${abandonedOrders.length})`}
              </button>
            </div>

            {/* ── Abandoned Checkouts panel ── */}
            {ordersSubTab === 'abandoned' && (
              <div>
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#78350F' }}>
                  <strong>These customers filled their cart and started checkout but never completed payment.</strong>
                  <br />They were redirected to HitPay but didn't finish. Reach out to recover the sale.
                </div>
                {abandonedLoading ? (
                  <div className="mango-loader">
                    <span className="mango-loader-emoji">🥭</span>
                    <div className="mango-loader-dots"><span /><span /><span /></div>
                    <div className="mango-loader-text">Loading abandoned checkouts…</div>
                  </div>
                ) : abandonedOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 600 }}>No abandoned checkouts</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>All recent payment attempts have been completed.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="shipment-table orders-table">
                      <thead>
                        <tr>
                          <th>Order Ref</th>
                          <th>Customer</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Mode</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Abandoned At</th>
                          <th>Follow Up</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abandonedOrders.map(o => {
                          const phone = (o.customer_phone || '').replace(/\D/g, '');
                          const itemSummary = o.items.map(i => `${i.variant} ×${i.qty}`).join(', ');
                          const waText = encodeURIComponent(
                            `Hi ${o.customer_name}! 👋 We noticed you started an order (${o.order_ref}) for $${o.total_price} SGD on Garden Roots but didn't complete the payment. Would you like help completing your order? 🥭`
                          );
                          const minutesAgo = o.created_at
                            ? Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)
                            : null;
                          return (
                            <tr key={o.id} style={{ background: '#FFFBEB' }}>
                              <td><strong style={{ color: '#d97706' }}>{o.order_ref}</strong></td>
                              <td>{o.customer_name}</td>
                              <td style={{ fontSize: 12 }}>{o.customer_email || '—'}</td>
                              <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                              <td>
                                <span className={`status-badge ${o.delivery_type === 'delivery' ? 'status-in-transit' : 'status-pending'}`}>
                                  {o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                </span>
                              </td>
                              <td style={{ fontSize: 12, maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.5 }}>{itemSummary}</td>
                              <td><strong>${o.total_price} SGD</strong></td>
                              <td style={{ fontSize: 12, color: '#9ca3af' }}>
                                {minutesAgo !== null
                                  ? minutesAgo < 60
                                    ? `${minutesAgo}m ago`
                                    : minutesAgo < 1440
                                      ? `${Math.round(minutesAgo / 60)}h ago`
                                      : `${Math.round(minutesAgo / 1440)}d ago`
                                  : '—'}
                              </td>
                              <td>
                                {phone ? (
                                  <a
                                    href={`https://wa.me/${phone}?text=${waText}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#25D366', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                                  >
                                    💬 WhatsApp
                                  </a>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {ordersSubTab === 'all' && (<>

            {/* ── Filter panel ── */}
            <div className="orders-filter-panel">
              {/* Row 1: horizontal toggle buttons */}
              <div className="filter-checkbox-row">
                <span className="filter-type-label">Filter Type:</span>
                {filterGroups.map(({ key, label }) => (
                  <button
                    key={key}
                    className={`filter-toggle-btn${activeFilters[key] ? ' active' : ''}`}
                    onClick={() => {
                      const enabled = !activeFilters[key];
                      setActiveFilters(prev => ({ ...prev, [key]: enabled }));
                      if (!enabled) handleOrderFilterChange(key, '');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Rows below: one per enabled filter — label on left, chips on right */}
              {filterGroups.filter(({ key }) => activeFilters[key]).map(({ key, label, options }) => (
                <div key={key} className="filter-active-row">
                  <span className="filter-active-label">{label}:</span>
                  <div className="filter-chips">
                    {options.map(opt => {
                      const count = allOrders.filter(o => String(o[key]) === opt.value).length;
                      const isActive = orderFilters[key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          className={`filter-chip${isActive ? ' active' : ''}`}
                          onClick={() => handleOrderFilterChange(key, isActive ? '' : opt.value)}
                        >
                          {opt.label}
                          {isActive && <span className="chip-close"> ✕</span>}
                          <span className={`chip-count${isActive ? ' active' : ''}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Secondary row: delivery boy, assigned, date range, clear */}
              <div className="orders-filter-row" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 4 }}>
                <select value={orderFilters.delivery_boy_id} onChange={e => handleOrderFilterChange('delivery_boy_id', e.target.value)} className="orders-filter-select">
                  <option value="">All Delivery Boys</option>
                  {deliveryBoys.map(b => (
                    <option key={b.id} value={b.id}>{b.full_name || b.username}</option>
                  ))}
                </select>

                <select value={orderFilters.assigned} onChange={e => handleOrderFilterChange('assigned', e.target.value)} className="orders-filter-select">
                  <option value="">Assigned — All</option>
                  <option value="yes">Assigned</option>
                  <option value="no">Unassigned</option>
                </select>

                <div className="orders-date-range">
                  <input type="date" value={orderFilters.date_from} onChange={e => handleOrderFilterChange('date_from', e.target.value)} className="orders-date-input" title="From date" />
                  <span className="date-range-sep">→</span>
                  <input type="date" value={orderFilters.date_to} onChange={e => handleOrderFilterChange('date_to', e.target.value)} className="orders-date-input" title="To date" />
                </div>

                <button
                  className="orders-clear-btn"
                  onClick={() => {
                    const cleared = {
                      delivery_type: '', payment_status: '', order_status: '',
                      pickup_location_id: '', delivery_boy_id: '', assigned: '',
                      payment_method: '', date_from: '', date_to: '',
                    };
                    setOrderFilters(cleared);
                    setActiveFilters({ delivery_type: false, payment_status: false, order_status: false, pickup_location_id: false, payment_method: false });
                    setOrderSelectedIds([]);
                    fetchAllOrders(cleared);
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* ── Bulk status bar ── */}
            {orderSelectedIds.length > 0 && (
              <div className="bulk-update-bar">
                <span className="bulk-count">{orderSelectedIds.length} selected</span>
                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="orders-filter-select">
                  <option value="">— Set Status —</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
                <input
                  type="text"
                  placeholder="Note (logged with change)"
                  value={bulkNote}
                  onChange={e => setBulkNote(e.target.value)}
                  className="bulk-note-input"
                />
                <button className="submit-button" disabled={!bulkStatus} onClick={handleBulkStatusUpdate}>
                  Update {orderSelectedIds.length} Order(s)
                </button>
                <button className="orders-clear-btn" onClick={() => setOrderSelectedIds([])}>Deselect</button>
              </div>
            )}

            {bulkResult && (
              <div className={bulkResult.success ? 'db-success' : 'db-error'} style={{ margin: '8px 0' }}>
                {bulkResult.message}
              </div>
            )}

            {/* ── Orders table ── */}
            {ordersLoading ? (
              <div className="loading">Loading orders...</div>
            ) : allOrders.length === 0 ? (
              <p style={{ color: '#6b7280', marginTop: 16 }}>No orders match the selected filters.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="shipment-table orders-table">
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox"
                          checked={orderSelectedIds.length === allOrders.length && allOrders.length > 0}
                          onChange={toggleSelectAllOrders}
                        />
                      </th>
                      <th>Order Ref</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Mode</th>
                      <th>Location / Address</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                      <th>Method</th>
                      <th>Assigned To</th>
                      <th>Del. Code</th>
                      <th>Shipment</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map(o => {
                      const isSelected = orderSelectedIds.includes(o.id);
                      const isExpanded = expandedOrderId === o.id;
                      return (
                        <React.Fragment key={o.id}>
                          <tr
                            style={{ cursor: 'pointer', background: isSelected ? '#f0fdf4' : (o.payment_method === 'pay_later' && o.payment_status !== 'succeeded' ? '#fffbeb' : undefined) }}
                          >
                            <td onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleOrderRowSelect(o.id)} />
                            </td>
                            <td onClick={() => setEditingOrder(o)} title="Click to edit order">
                              <strong className="order-ref-link" style={{ cursor: 'pointer', color: '#16a34a', textDecoration: 'underline dotted' }}>{o.order_ref}</strong>
                            </td>
                            <td>{o.customer_name}</td>
                            <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                            <td>
                              <span className={`status-badge ${o.delivery_type === 'delivery' ? 'status-in-transit' : 'status-pending'}`}>
                                {o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                              </span>
                            </td>
                            <td className="orders-address-cell">
                              {o.delivery_type === 'pickup'
                                ? (o.pickup_location_name || `Loc #${o.pickup_location_id}`)
                                : (o.delivery_address || '—')}
                            </td>
                            <td>
                              <span className={`status-badge status-${o.order_status}`}>
                                {o.order_status}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${o.payment_status === 'succeeded' ? 'status-completed' : o.payment_status === 'failed' ? 'status-missing' : 'status-pending'}`}>
                                {o.payment_status}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>
                              <div>{o.payment_method || '—'}</div>
                              {o.payment_method === 'pay_later' && o.booked_by_admin_name && (
                                <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
                                  by {o.booked_by_admin_name}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {o.delivery_boy_name
                                ? <span className="assigned-badge">{o.delivery_boy_name}</span>
                                : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                            <td style={{ fontSize: 11, color: '#6b7280' }}>{o.delivery_code || '—'}</td>
                            <td style={{ fontSize: 12, textAlign: 'center' }}>
                              {o.shipment_id
                                ? <span className="shipment-id-badge">#{o.shipment_id}</span>
                                : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: 13 }}>
                              <button className="items-toggle-btn" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>
                                {o.items_count} item{o.items_count !== 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                              </button>
                            </td>
                            <td><strong>₹{o.total_price}</strong></td>
                            <td style={{ fontSize: 12 }}>
                              {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="order-detail-row">
                              <td colSpan={15}>
                                <div className="order-detail-panel">
                                  <div className="order-detail-grid">
                                    <div className="order-detail-block">
                                      <div className="order-detail-label">Items Ordered</div>
                                      <table className="order-items-mini-table">
                                        <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Subtotal</th></tr></thead>
                                        <tbody>
                                          {o.items.map((it, idx) => (
                                            <tr key={idx}>
                                              <td>{it.variant}</td>
                                              <td>{it.qty}</td>
                                              <td>₹{it.unit_price}</td>
                                              <td>₹{it.subtotal}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                      <div className="order-price-row">
                                        <span>Delivery fee: ₹{o.delivery_fee}</span>
                                        <span>Total: <strong>₹{o.total_price}</strong></span>
                                      </div>
                                    </div>

                                    <div className="order-detail-block">
                                      <div className="order-detail-label">Delivery Info</div>
                                      <p><strong>Type:</strong> {o.delivery_type === 'pickup' ? 'Self Pickup' : 'Home Delivery'}</p>
                                      {o.delivery_type === 'pickup'
                                        ? <p><strong>Location:</strong> {o.pickup_location_name || `#${o.pickup_location_id}`}</p>
                                        : <p><strong>Address:</strong> {o.delivery_address || '—'}</p>}
                                      {o.delivery_boy_name && <p><strong>Assigned To:</strong> {o.delivery_boy_name}</p>}
                                      {o.delivery_code && <p><strong>Del. Code:</strong> {o.delivery_code}</p>}
                                      {o.assigned_at && <p><strong>Assigned At:</strong> {new Date(o.assigned_at).toLocaleString()}</p>}
                                      {o.customer_notes && <p><strong>Notes:</strong> {o.customer_notes}</p>}

                                      {/* Shipment link editor */}
                                      <div className="order-shipment-editor">
                                        <span className="order-detail-label" style={{ marginBottom: 4 }}>Shipment</span>
                                        <div className="order-shipment-row">
                                          <ShipmentSelect
                                            shipments={shipments}
                                            currentId={o.shipment_id}
                                            onSave={(sid) => handleUpdateOrderShipment(o.id, sid)}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="order-detail-block">
                                      <div className="order-detail-label">Customer</div>
                                      <p>{o.customer_name}</p>
                                      <p>{o.customer_email || '—'}</p>
                                      <p>{o.customer_phone || '—'}</p>
                                      {o.booked_by_admin_name && (
                                        <p style={{ marginTop: 6, fontSize: 12, color: '#b45309' }}>
                                          Booked by admin: <strong>{o.booked_by_admin_name}</strong>
                                        </p>
                                      )}
                                      <div className="order-detail-label" style={{ marginTop: 12 }}>Payment</div>
                                      <p><strong>Status:</strong> {o.payment_status}</p>
                                      <p><strong>Method:</strong> {o.payment_method || '—'}</p>
                                      {o.payment_method === 'pay_later' && o.payment_status !== 'succeeded' && (
                                        <button
                                          className="submit-button"
                                          style={{ marginTop: 8, padding: '6px 14px', fontSize: 13, background: '#d97706' }}
                                          onClick={() => handleCollectPayment(o.id)}
                                        >
                                          💰 Mark Payment Received
                                        </button>
                                      )}
                                      {o.payment_method === 'pay_later' && o.payment_status === 'succeeded' && (
                                        <p style={{ color: '#16a34a', fontWeight: 600, marginTop: 6 }}>✅ Payment Collected</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
                  Showing {allOrders.length} order(s) · {orderSelectedIds.length} selected
                </p>
              </div>
            )}
            </>)}
          </div>
        )}

        {activeTab === 'manage' && manageSubTab === 'products' && (
          <div className="dashboard-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>🥭 Products</h2>
              <button
                className="submit-button"
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={() => { setShowAddProduct(v => !v); setAddProductError(''); }}
              >
                {showAddProduct ? 'Cancel' : '+ Add Product'}
              </button>
            </div>

            {showAddProduct && (
              <form onSubmit={handleAddProduct} style={{
                background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: '20px 24px', marginBottom: 24, maxWidth: 600,
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>New Product</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  {[
                    { label: 'Name *', key: 'name', placeholder: 'e.g. Kesar' },
                    { label: 'Origin', key: 'origin', placeholder: 'e.g. India' },
                    { label: 'Tag', key: 'tag', placeholder: 'e.g. premium' },
                    { label: 'Size / Variant Name', key: 'size_name', placeholder: 'e.g. 5kg Box' },
                    { label: 'Unit', key: 'unit', placeholder: 'e.g. box' },
                    { label: 'Price (SGD) *', key: 'price', placeholder: 'e.g. 49.90', type: 'number' },
                  ].map(({ label, key, placeholder, type }) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {label}
                      <input
                        type={type || 'text'}
                        min={type === 'number' ? '0' : undefined}
                        step={type === 'number' ? '0.5' : undefined}
                        placeholder={placeholder}
                        value={addProductForm[key]}
                        onChange={e => setAddProductForm(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }}
                      />
                    </label>
                  ))}
                  <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Description
                    <textarea
                      rows={2}
                      placeholder="Optional description"
                      value={addProductForm.description}
                      onChange={e => setAddProductForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>
                {addProductError && (
                  <p style={{ color: '#dc2626', fontSize: 12, margin: '10px 0 0', fontWeight: 600 }}>✕ {addProductError}</p>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button type="submit" className="submit-button" style={{ padding: '8px 22px' }} disabled={addProductSaving}>
                    {addProductSaving ? 'Creating…' : 'Create Product'}
                  </button>
                  <button type="button" onClick={() => setShowAddProduct(false)}
                    style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {productsLoading ? (
              <p>⏳ Loading products...</p>
            ) : adminProducts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No products found.</p>
            ) : (
              <table className="shipment-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Origin</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminProducts.map((product, idx) => {
                    const currentPrice = product.variants?.[0]?.price ?? null;
                    const editVal = editingPrices[product.id];
                    const isDirty = editVal !== undefined;
                    return (
                      <tr key={product.id}>
                        <td style={{ opacity: product.is_active ? 1 : 0.45 }}>{idx + 1}</td>
                        <td style={{ opacity: product.is_active ? 1 : 0.45 }}><strong>{product.name}</strong></td>
                        <td style={{ opacity: product.is_active ? 1 : 0.45 }}>{product.origin || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ color: '#6b7280', fontWeight: 500 }}>$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={isDirty ? editVal : (currentPrice != null ? currentPrice : '')}
                                onChange={e => {
                                  setEditingPrices(prev => ({ ...prev, [product.id]: e.target.value }));
                                  setPriceErrors(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                }}
                                onKeyDown={e => e.key === 'Enter' && isDirty && handleUpdatePrice(product.id)}
                                style={{
                                  width: 70, padding: '4px 6px', borderRadius: 6,
                                  border: `1.5px solid ${priceErrors[product.id] ? '#dc2626' : isDirty ? '#16a34a' : '#d1d5db'}`,
                                  fontSize: 13, fontWeight: 600,
                                }}
                              />
                              <button
                                onClick={() => handleUpdatePrice(product.id)}
                                disabled={!isDirty || savingPriceId === product.id}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: isDirty ? '#16a34a' : '#e5e7eb',
                                  color: isDirty ? '#fff' : '#9ca3af',
                                  fontWeight: 700, fontSize: 12,
                                  cursor: isDirty ? 'pointer' : 'not-allowed',
                                  transition: 'background 0.2s',
                                }}
                              >
                                {savingPriceId === product.id ? '…' : 'Save'}
                              </button>
                            </div>
                            {priceErrors[product.id] && (
                              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                                ✕ {priceErrors[product.id]}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 10px', borderRadius: 100,
                            background: product.is_active ? '#dcfce7' : '#fee2e2',
                            color: product.is_active ? '#16a34a' : '#dc2626',
                            fontWeight: 700, fontSize: 12,
                          }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: product.is_active ? '#16a34a' : '#dc2626',
                              display: 'inline-block',
                            }} />
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleProductActive(product.id)}
                            style={{
                              padding: '5px 16px', borderRadius: 6, border: 'none',
                              fontWeight: 700, fontSize: 12, letterSpacing: '0.05em',
                              cursor: 'pointer',
                              background: product.is_active ? '#dc2626' : '#16a34a',
                              color: '#fff', transition: 'background 0.2s',
                            }}
                          >
                            {togglingProductId === product.id ? '...' : product.is_active ? 'DISABLE' : 'ENABLE'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}


        {activeTab === 'manage' && manageSubTab === 'site-messages' && (
          <div className="dashboard-section">
            <h2>📢 Site Messages</h2>
            <div style={{ maxWidth: 620 }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                📢 Banner Messages (top bar)
              </label>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                One message per line. Multiple messages rotate every 2 seconds on the website.
              </p>
              <textarea
                value={bannerMessages.split('|').join('\n')}
                onChange={e => setBannerMessages(e.target.value.split('\n').join('|'))}
                rows={5}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6,
                }}
                placeholder={`🥭 Fresh Indian Mangoes Air-Flown to Singapore — Free delivery over $120\n🚚 Order before 2pm for same-day dispatch`}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <button
                  className="submit-button"
                  style={{ padding: '8px 20px' }}
                  disabled={configSaving}
                  onClick={handleSaveBannerMessages}
                >
                  {configSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                Tip: each line becomes one message in the rotation.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'manage' && manageSubTab === 'promos' && (
          <div className="dashboard-section">
            <PromoManager headers={headers} />
          </div>
        )}

      </div>
    </div>
  );
}
