import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import PickupLocationManager from './PickupLocationManager';
import PaymentTracker from './PaymentTracker';
import PromoManager from './PromoManager';
import MangoLoader from './MangoLoader';
import { API_BASE } from '../services/api';
import { useApp } from '../context/AppContext';
import ALL_BANNERS from 'virtual:banners';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import OrderEditModal from './OrderEditModal';
import OrderHistoryModal from './OrderHistoryModal';

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
                  <MangoLoader text="Loading orders…" />
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
                                <td style={{ fontSize: 12 }}>{o.created_at ? new Date(o.created_at).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
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

function sortByCol(items, col, dir) {
  if (!col) return items;
  return [...items].sort((a, b) => {
    const av = a[col], bv = b[col];
    const cmp = (typeof av === 'number' && typeof bv === 'number')
      ? av - bv
      : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
}

function SortTh({ label, colKey, sort, onSort, className, style }) {
  const active = sort.col === colKey;
  return (
    <th
      className={className}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
      onClick={() => onSort(colKey)}
    >
      {label}
      <span style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.25 }}>
        {active && sort.dir === 'desc' ? '▼' : '▲'}
      </span>
    </th>
  );
}

function downloadCSV(filename, headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const TAG_PALETTE = [
  '#e11d48', // rose
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
  '#ea580c', // orange
  '#be185d', // pink
  '#15803d', // emerald
  '#1d4ed8', // indigo
  '#b45309', // yellow-brown
  '#0f766e', // teal
];

export default function AdminDashboard({ onLogout, defaultTab }) {
  const { setAdminView } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab || 'reports');
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
    delivery_type: [], payment_status: [], order_status: [],
    pickup_location_id: [], delivery_boy_id: '', assigned: '',
    payment_method: [], date_from: '', date_to: '', tag_id: '',
  });
  const [activeFilters, setActiveFilters] = useState({
    delivery_type: false,
    payment_status: false,
    order_status: false,
    pickup_location_id: false,
    payment_method: false,
  });
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [historyOrder, setHistoryOrder] = useState(null);
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

  // Delivery sub-tab
  const [deliverySubTab, setDeliverySubTab] = useState('boys');

  // Delivery tags state
  const [deliveryTags, setDeliveryTags] = useState([]);
  const [tagForm, setTagForm] = useState({ name: '', color: '#6b7280', is_active: 1 });
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState('');
  const [tagSuccess, setTagSuccess] = useState('');
  const [tagPriceEdits, setTagPriceEdits] = useState({});

  // Bulk tag assignment (Orders tab)
  const [bulkTagId, setBulkTagId] = useState('');

  // Products tab state
  const [adminProducts, setAdminProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState(null);
  const [editingPrices, setEditingPrices] = useState({});   // { [productId]: string }
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [priceErrors, setPriceErrors] = useState({});       // { [productId]: string }
  const [editingStocks, setEditingStocks] = useState({});   // { [productId]: string }
  const [savingStockId, setSavingStockId] = useState(null);
  const [stockErrors, setStockErrors] = useState({});       // { [productId]: string }
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addProductForm, setAddProductForm] = useState({ name: '', origin: '', tag: '', description: '', image_url: '', emoji: '', size_name: 'Standard', unit: 'box', price: '', currency: 'SGD', initial_stock: '' });
  const [addProductSaving, setAddProductSaving] = useState(false);
  const [addProductError, setAddProductError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null); // product object being edited
  const [editProductForm, setEditProductForm] = useState({});
  const [editProductSaving, setEditProductSaving] = useState(false);
  const [editProductError, setEditProductError] = useState('');
  const [resetStockConfirm, setResetStockConfirm] = useState(null); // productId being confirmed
  const [resetStockLoading, setResetStockLoading] = useState(null); // productId being reset
  const [deleteProductConfirm, setDeleteProductConfirm] = useState(null); // productId being confirmed
  const [deletingProductId, setDeletingProductId] = useState(null); // productId being deleted
  // Display-order reordering state
  const [localOrder, setLocalOrder] = useState([]);          // array of product ids in current display order
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Abandoned checkouts
  const [abandonedOrders, setAbandonedOrders] = useState([]);
  const [abandonedLoading, setAbandonedLoading] = useState(false);
  const [ordersSubTab, setOrdersSubTab] = useState('all'); // 'all' | 'abandoned'

  // Reports tab state
  const [reportOrders, setReportOrders] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReportShipment, setSelectedReportShipment] = useState('all');
  const [reportTagFilter, setReportTagFilter] = useState('');
  const [reportSubTab, setReportSubTab] = useState('all-orders');
  const [addressFilter, setAddressFilter] = useState('');
  const [orderColVisibility, setOrderColVisibility] = useState({ tag: false, assignedTo: false, delCode: false, shipment: false, itemNames: false });
  const [summarySort, setSummarySort] = useState({ col: null, dir: 'asc' });
  const [deliverySort, setDeliverySort] = useState({ col: null, dir: 'asc' });
  const [dsSelectedAddrs, setDsSelectedAddrs] = useState(new Set());
  const [dsBulkStatus, setDsBulkStatus] = useState('');
  const [dsBulkNote, setDsBulkNote] = useState('');
  const [dsBulkTag, setDsBulkTag] = useState('');
  const [dsAddressFilter, setDsAddressFilter] = useState(null);
  const [dsOrderSelectedIds, setDsOrderSelectedIds] = useState([]);
  const [dsOrderBulkStatus, setDsOrderBulkStatus] = useState('');
  const [dsOrderBulkNote, setDsOrderBulkNote] = useState('');
  const [dsOrderBulkTag, setDsOrderBulkTag] = useState('');
  const [dsStatusFilter, setDsStatusFilter] = useState(new Set());
  const [typeSort, setTypeSort] = useState({ col: null, dir: 'asc' });
  const [typeOrderDrill, setTypeOrderDrill] = useState(null); // { variantName, status } | null
  const [allOrdersSort, setAllOrdersSort] = useState({ col: null, dir: 'asc' });
  const [summaryOrderDrill, setSummaryOrderDrill] = useState(null); // { loc, status } | null

  // Global toast — shared across all actions
  const [toast, setToast] = useState(null);                 // { type: 'success'|'error', msg: string }

  // Config tab state
  const [bannerMessages, setBannerMessages] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Ads tab state
  const [bannerStatuses, setBannerStatuses] = useState({});
  const [adsSaving, setAdsSaving] = useState(null);      // filename being toggled
  const [uploadedBanners, setUploadedBanners] = useState([]); // srcs from DB
  const [adsUploadFile, setAdsUploadFile] = useState(null);
  const [adsUploadPreview, setAdsUploadPreview] = useState(null);
  const [adsUploading, setAdsUploading] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState(null); // filename being deleted


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
      fetchDeliveryTags();
      fetchShipments();
      fetchReportOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchAllOrders();
      fetchAbandonedOrders();
      fetchAdminPickupLocations();
      fetchDeliveryBoys();
      fetchDeliveryTags();
      fetchReportOrders();
      fetchShipments();
      fetchAdminProducts();
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

  useEffect(() => {
    if (activeTab === 'manage' && manageSubTab === 'ads') {
      fetch(`${API_BASE}/api/v1/config`)
        .then(r => r.json())
        .then(json => {
          try { setBannerStatuses(JSON.parse(json.data?.banner_statuses || '{}')); }
          catch (_) { setBannerStatuses({}); }
          try { setUploadedBanners(JSON.parse(json.data?.uploaded_banners || '[]')); }
          catch (_) { setUploadedBanners([]); }
        })
        .catch(() => {});
    }
  }, [activeTab, manageSubTab]);

  // Re-fetch whenever a delivery sub-tab is selected
  useEffect(() => {
    if (activeTab !== 'delivery') return;
    if (deliverySubTab === 'delivery-sheet') { fetchReportOrders(); fetchDeliveryTags(); fetchShipments(); }
    if (deliverySubTab === 'boys') { fetchDeliveryBoys(); fetchUnassignedOrders(); fetchAssignedOrders(); fetchNullShipmentCount(); fetchShipments(); }
    if (deliverySubTab === 'tags') fetchDeliveryTags();
  }, [deliverySubTab]);

  // Re-fetch whenever a reports sub-tab is selected
  useEffect(() => {
    if (activeTab !== 'reports') return;
    if (reportSubTab === 'all-orders') { fetchAllOrders(); fetchAbandonedOrders(); fetchAdminPickupLocations(); }
    if (reportSubTab === 'orders-summary' || reportSubTab === 'orders-by-type') { fetchReportOrders(); fetchShipments(); fetchDeliveryTags(); }
  }, [reportSubTab]);

  // Re-fetch active tab data when the browser tab regains visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab === 'delivery') {
        fetchDeliveryBoys(); fetchUnassignedOrders(); fetchAssignedOrders();
        fetchNullShipmentCount(); fetchDeliveryTags(); fetchShipments(); fetchReportOrders();
      } else if (activeTab === 'reports') {
        fetchAllOrders(); fetchAbandonedOrders(); fetchAdminPickupLocations();
        fetchDeliveryBoys(); fetchDeliveryTags(); fetchReportOrders(); fetchShipments();
      } else if (activeTab === 'dashboard') {
        fetchDashboard();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeTab]);


  const fetchAdminProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/products`, { headers });
      if (res.ok) {
        const data = await res.json();
        const prods = data.data || [];
        setAdminProducts(prods);
        setLocalOrder(prods.map(p => p.id));
        setOrderDirty(false);
      }
    } catch (_) {}
    setProductsLoading(false);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const payload = localOrder.map((id, idx) => ({ id, display_order: idx + 1 }));
      const res = await fetch(`${API_BASE}/api/v1/products/reorder`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const prods = data.data || [];
        setAdminProducts(prods);
        setLocalOrder(prods.map(p => p.id));
        setOrderDirty(false);
        showToast('success', 'Display order saved.');
      } else {
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || b.error || errMsg; } catch (_) {}
        showToast('error', `Failed to save order: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', `Failed to save order: ${err.message || 'Network error'}`);
    }
    setSavingOrder(false);
  };

  const moveProductUp = (index) => {
    if (index === 0) return;
    setLocalOrder(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setOrderDirty(true);
  };

  const moveProductDown = (index) => {
    setLocalOrder(prev => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setOrderDirty(true);
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

  const handleToggleBannerStatus = async (filename) => {
    const current = bannerStatuses[filename] !== false;
    const next = !current;
    const updated = { ...bannerStatuses, [filename]: next };
    setBannerStatuses(updated);
    setAdsSaving(filename);
    try {
      const res = await fetch(`${API_BASE}/api/v1/config/banner_statuses`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ config_value: JSON.stringify(updated) }),
      });
      if (res.ok) {
        showToast('success', `${filename} ${next ? 'enabled' : 'disabled'}.`);
      } else {
        setBannerStatuses(bannerStatuses);
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || b.error || errMsg; } catch (_) {}
        showToast('error', `Failed to update: ${errMsg}`);
      }
    } catch (err) {
      setBannerStatuses(bannerStatuses);
      showToast('error', `Failed to update: ${err.message || 'Network error'}`);
    }
    setAdsSaving(null);
  };

  const handleAdsFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdsUploadFile(file);
    setAdsUploadPreview(URL.createObjectURL(file));
  };

  const handleUploadBanner = async () => {
    if (!adsUploadFile) return;
    setAdsUploading(true);
    const formData = new FormData();
    formData.append('file', adsUploadFile);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/banners/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        const newSrc = json.data.src;
        setUploadedBanners(prev => [...prev.filter(s => s !== newSrc), newSrc]);
        setAdsUploadFile(null);
        setAdsUploadPreview(null);
        showToast('success', `${json.data.filename} uploaded successfully.`);
      } else {
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || errMsg; } catch (_) {}
        showToast('error', `Upload failed: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', `Upload failed: ${err.message || 'Network error'}`);
    }
    setAdsUploading(false);
  };

  const handleDeleteUploadedBanner = async (filename) => {
    setDeletingBanner(filename);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/banners/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setUploadedBanners(prev => prev.filter(s => s !== `/${filename}`));
        showToast('success', `${filename} deleted.`);
      } else {
        let errMsg = `Error ${res.status}`;
        try { const b = await res.json(); errMsg = b.detail || errMsg; } catch (_) {}
        showToast('error', `Delete failed: ${errMsg}`);
      }
    } catch (err) {
      showToast('error', `Delete failed: ${err.message || 'Network error'}`);
    }
    setDeletingBanner(null);
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

  const handleUpdateStock = async (productId) => {
    const raw = editingStocks[productId];
    const qty = parseInt(raw, 10);
    if (isNaN(qty) || qty < 0) return;
    setSavingStockId(productId);
    setStockErrors(prev => { const n = { ...prev }; delete n[productId]; return n; });
    try {
      const res = await fetch(`${API_BASE}/api/v1/products/${productId}/stock`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ quantity_available: qty }),
      });
      if (res.ok) {
        setEditingStocks(prev => { const n = { ...prev }; delete n[productId]; return n; });
        await fetchAdminProducts();
        showToast('success', `Stock updated to ${qty}.`);
      } else {
        let errMsg = `Error ${res.status}`;
        try { const body = await res.json(); errMsg = body.detail || body.error || errMsg; } catch (_) {}
        setStockErrors(prev => ({ ...prev, [productId]: errMsg }));
        showToast('error', `Stock save failed: ${errMsg}`);
      }
    } catch (err) {
      const msg = err.message || 'Network error';
      setStockErrors(prev => ({ ...prev, [productId]: msg }));
      showToast('error', `Stock save failed: ${msg}`);
    }
    setSavingStockId(null);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const price = parseFloat(addProductForm.price);
    if (!addProductForm.name.trim()) { setAddProductError('Name is required.'); return; }
    if (isNaN(price) || price <= 0) { setAddProductError('Enter a valid price.'); return; }
    setAddProductSaving(true);
    setAddProductError('');
    try {
      const initial_stock = addProductForm.initial_stock !== '' ? parseInt(addProductForm.initial_stock, 10) : 0;
      const res = await fetch(`${API_BASE}/api/v1/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...addProductForm, price, initial_stock: isNaN(initial_stock) ? 0 : initial_stock }),
      });
      if (res.ok) {
        setShowAddProduct(false);
        setAddProductForm({ name: '', origin: '', tag: '', description: '', image_url: '', emoji: '', size_name: 'Standard', unit: 'box', price: '', currency: 'SGD', initial_stock: '' });
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

  const openEditProduct = (product) => {
    setEditingProduct(product);
    const firstVariant = product.variants?.[0];
    setEditProductForm({
      name: product.name || '',
      origin: product.origin || '',
      tag: product.tag || '',
      description: product.description || '',
      image_url: product.image_url || '',
      emoji: product.emoji || '',
      season_start: product.season_start || '',
      season_end: product.season_end || '',
      unit: firstVariant?.unit || '',
      price: firstVariant?.price != null ? String(parseFloat(firstVariant.price)) : '',
    });
    setEditProductError('');
    setShowAddProduct(false);
  };

  const handleSaveEditProduct = async (e) => {
    e.preventDefault();
    if (!editProductForm.name.trim()) { setEditProductError('Name is required.'); return; }
    setEditProductSaving(true);
    setEditProductError('');
    try {
      const payload = { ...editProductForm };
      if (payload.price !== '' && payload.price != null) {
        payload.price = parseFloat(payload.price);
        if (isNaN(payload.price) || payload.price <= 0) { setEditProductError('Enter a valid price.'); setEditProductSaving(false); return; }
      } else {
        delete payload.price;
      }
      if (!payload.unit) delete payload.unit;
      const res = await fetch(`${API_BASE}/api/v1/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchAdminProducts();
        showToast('success', `Product "${editProductForm.name}" updated.`);
        setEditingProduct(null);
      } else {
        let msg = `Error ${res.status}`;
        try { const b = await res.json(); msg = b.detail || b.error || msg; } catch (_) {}
        setEditProductError(msg);
      }
    } catch (err) {
      setEditProductError(err.message || 'Network error');
    }
    setEditProductSaving(false);
  };

  const handleResetStock = async (productId) => {
    setResetStockLoading(productId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/products/${productId}/reset-stock`, { method: 'POST', headers });
      if (res.ok) {
        showToast('success', 'Stock reset to 0.');
        setResetStockConfirm(null);
        await fetchAdminProducts();
      } else {
        let msg = `Error ${res.status}`;
        try { const b = await res.json(); msg = b.detail || b.error || msg; } catch (_) {}
        showToast('error', msg);
      }
    } catch (err) {
      showToast('error', err.message || 'Network error');
    }
    setResetStockLoading(null);
  };

  const handleDeleteProduct = async (productId) => {
    setDeletingProductId(productId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/products/${productId}`, { method: 'DELETE', headers });
      if (res.ok) {
        showToast('success', 'Product deleted.');
        setDeleteProductConfirm(null);
        await fetchAdminProducts();
      } else {
        let msg = `Error ${res.status}`;
        try { const b = await res.json(); msg = b.detail || b.error || msg; } catch (_) {}
        showToast('error', msg);
      }
    } catch (err) {
      showToast('error', err.message || 'Network error');
    }
    setDeletingProductId(null);
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
      if (filters.delivery_type?.length)      params.set('delivery_type',      filters.delivery_type.join(','));
      if (filters.payment_status?.length)     params.set('payment_status',     filters.payment_status.join(','));
      if (filters.order_status?.length)       params.set('order_status',       filters.order_status.join(','));
      if (filters.pickup_location_id?.length) params.set('pickup_location_id', filters.pickup_location_id.join(','));
      if (filters.payment_method?.length)     params.set('payment_method',     filters.payment_method.join(','));
      if (filters.delivery_boy_id) params.set('delivery_boy_id', filters.delivery_boy_id);
      if (filters.assigned)        params.set('assigned',        filters.assigned);
      if (filters.date_from)       params.set('date_from',       filters.date_from);
      if (filters.date_to)         params.set('date_to',         filters.date_to);
      if (filters.tag_id)          params.set('tag_id',          filters.tag_id);
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

  const fetchReportOrders = async () => {
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders`, { headers });
      if (res.ok) setReportOrders(await res.json());
    } catch (_) {}
    finally { setReportLoading(false); }
  };

  const MULTI_FILTER_KEYS = new Set(['delivery_type', 'payment_status', 'order_status', 'pickup_location_id', 'payment_method']);

  const handleOrderFilterChange = (key, value) => {
    let updated;
    if (MULTI_FILTER_KEYS.has(key)) {
      if (value === '') {
        updated = { ...orderFilters, [key]: [] };
      } else {
        const current = orderFilters[key] || [];
        updated = {
          ...orderFilters,
          [key]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
        };
      }
    } else {
      updated = { ...orderFilters, [key]: value };
    }
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

  const fetchDeliveryTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-tags`, { headers });
      if (res.ok) setDeliveryTags(await res.json());
    } catch (_) {}
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!tagForm.name.trim()) return;
    setTagLoading(true); setTagError(''); setTagSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-tags`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tagForm.name.trim(),
          color: tagForm.color,
          is_active: tagForm.is_active,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
      setTagSuccess('Tag created!');
      setTagForm({ name: '', color: '#6b7280', is_active: 1 });
      fetchDeliveryTags();
    } catch (err) {
      setTagError(err.message);
    } finally {
      setTagLoading(false);
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (!window.confirm('Delete this tag? It will be removed from all orders.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-tags/${tagId}`, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 204) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
      fetchDeliveryTags();
    } catch (err) {
      showToast('error', `Delete tag failed: ${err.message}`);
    }
  };

  const handleUpdateTag = async (tagId, patch) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/delivery-tags/${tagId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
      fetchDeliveryTags();
    } catch (err) {
      showToast('error', `Update tag failed: ${err.message}`);
    }
  };

  const handleBulkTagAssign = async () => {
    if (orderSelectedIds.length === 0 || bulkTagId === '') return;
    const tagIdPayload = bulkTagId === 'clear' ? null : Number(bulkTagId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-tag`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderSelectedIds, tag_id: tagIdPayload }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
      const data = await res.json();
      const tagName = tagIdPayload === null ? 'cleared' : (deliveryTags.find(t => t.id === tagIdPayload)?.name || 'tag');
      setBulkResult({ success: true, message: `Tag "${tagName}" applied to ${data.count} order(s)` });
      showToast('success', `Tag applied to ${data.count} order(s).`);
      setOrderSelectedIds([]);
      setBulkTagId('');
      fetchAllOrders();
    } catch (err) {
      setBulkResult({ success: false, message: err.message });
      showToast('error', `Tag assign failed: ${err.message}`);
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

    const manualValue = formData.get('expected_value');
    const computedValue = varieties.reduce((sum, v) => {
      const boxes = v.box_count || 0;
      const weight = v.box_weight || 0;
      const price = v.price_per_kg || 0;
      return sum + boxes * weight * price;
    }, 0);

    const payload = {
      total_boxes: totalBoxes,
      expected_value: manualValue ? parseFloat(manualValue) : (computedValue > 0 ? computedValue : null),
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
      {historyOrder && (
        <OrderHistoryModal
          order={historyOrder}
          headers={headers}
          onClose={() => setHistoryOrder(null)}
        />
      )}

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          headers={headers}
          activeProducts={adminProducts.filter(p => p.is_active)}
          pickupLocations={adminPickupLocations}
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
          className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('reports');
            fetchAllOrders(); fetchAbandonedOrders(); fetchAdminPickupLocations();
            fetchDeliveryBoys(); fetchDeliveryTags(); fetchReportOrders(); fetchShipments();
          }}
        >
          📈 Reports
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
          onClick={() => {
            setActiveTab('delivery');
            fetchDeliveryBoys(); fetchUnassignedOrders(); fetchAssignedOrders();
            fetchNullShipmentCount(); fetchDeliveryTags(); fetchShipments(); fetchReportOrders();
          }}
        >
          🛵 Delivery
        </button>
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); fetchDashboard(); }}
        >
          📊 Dashboard
        </button>
      </div>

      <div className="admin-content">
        {error && <div className="error-banner">⚠️ {error}</div>}
        {loading && <MangoLoader text="Loading…" />}

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
              { key: 'ads',           label: '🖼️ Ads' },
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
                                <td colSpan="2"></td>
                              </tr>
                              {(() => {
                                const est = Object.keys(varietyBoxCounts).reduce((sum, pid) => {
                                  const boxes = parseFloat(varietyBoxCounts[pid]) || 0;
                                  const weight = parseFloat(varietyBoxWeights[pid]) || 0;
                                  const price = parseFloat(varietyPricesPerKg[pid]) || 0;
                                  return sum + boxes * weight * price;
                                }, 0);
                                return est > 0 ? (
                                  <tr className="variety-total-row">
                                    <td colSpan="2"><strong>Estimated Cost (₹)</strong></td>
                                    <td colSpan="3">
                                      <span className="total-boxes-value">₹{est.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </td>
                                  </tr>
                                ) : null;
                              })()}
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

            {/* ── Delivery sub-tab nav ── */}
            <div className="manage-sub-nav" style={{ marginBottom: 20 }}>
              <button
                className={`manage-sub-tab${deliverySubTab === 'boys' ? ' active' : ''}`}
                onClick={() => { setDeliverySubTab('boys'); fetchDeliveryBoys(); fetchUnassignedOrders(); fetchAssignedOrders(); fetchNullShipmentCount(); fetchShipments(); }}
              >🛵 Delivery Boys</button>
              <button
                className={`manage-sub-tab${deliverySubTab === 'tags' ? ' active' : ''}`}
                onClick={() => { setDeliverySubTab('tags'); fetchDeliveryTags(); }}
              >🏷️ Tags</button>
              <button
                className={`manage-sub-tab${deliverySubTab === 'delivery-sheet' ? ' active' : ''}`}
                onClick={() => { setDeliverySubTab('delivery-sheet'); fetchReportOrders(); fetchDeliveryTags(); fetchShipments(); }}
              >📋 Delivery Sheet</button>
            </div>

            {/* ── Tags tab ── */}
            {deliverySubTab === 'tags' && (
              <div className="delivery-card">
                <h2>🏷️ Delivery Tags</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                  Create tags to group and label orders for delivery routing.
                </p>

                {/* Create form */}
                <form onSubmit={handleCreateTag} className="db-form" style={{ marginBottom: 24 }}>
                  <div className="db-form-row">
                    <input
                      placeholder="Tag name (e.g. Zone A, Express)"
                      value={tagForm.name}
                      onChange={e => { setTagForm(f => ({ ...f, name: e.target.value })); setTagError(''); setTagSuccess(''); }}
                      required
                      style={{ flex: 1 }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>Colour:</label>
                      <input
                        type="color"
                        value={tagForm.color}
                        onChange={e => setTagForm(f => ({ ...f, color: e.target.value }))}
                        style={{ width: 48, height: 36, border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>Active:</label>
                      <input
                        type="checkbox"
                        checked={tagForm.is_active === 1}
                        onChange={e => setTagForm(f => ({ ...f, is_active: e.target.checked ? 1 : 0 }))}
                      />
                    </div>
                  </div>
                  {tagError && <div className="db-error">{tagError}</div>}
                  {tagSuccess && <div className="db-success">{tagSuccess}</div>}
                  <button type="submit" className="submit-button" disabled={tagLoading}>
                    {tagLoading ? 'Creating…' : '➕ Create Tag'}
                  </button>
                </form>

                {/* Tag list */}
                {deliveryTags.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>No tags yet. Create one above.</p>
                ) : (
                  <table className="shipment-table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tag</th>
                        <th>Price (SGD)</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryTags.map((tag, i) => (
                        <tr key={tag.id} style={!tag.is_active ? { opacity: 0.5 } : undefined}>
                          <td>{i + 1}</td>
                          <td>
                            <span className="delivery-tag-badge" style={{ background: TAG_PALETTE[i % TAG_PALETTE.length] + '22', color: TAG_PALETTE[i % TAG_PALETTE.length], border: `1px solid ${TAG_PALETTE[i % TAG_PALETTE.length]}55` }}>
                              🏷️ {tag.name}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 13, color: '#374151' }}>$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={tagPriceEdits[tag.id] !== undefined ? tagPriceEdits[tag.id] : (tag.price != null ? Number(tag.price).toFixed(2) : '')}
                                onChange={e => setTagPriceEdits(p => ({ ...p, [tag.id]: e.target.value }))}
                                onBlur={async () => {
                                  const val = tagPriceEdits[tag.id];
                                  if (val === undefined) return;
                                  await handleUpdateTag(tag.id, { price: val !== '' ? parseFloat(val) : null });
                                  setTagPriceEdits(p => { const n = { ...p }; delete n[tag.id]; return n; });
                                }}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') e.currentTarget.blur();
                                  if (e.key === 'Escape') setTagPriceEdits(p => { const n = { ...p }; delete n[tag.id]; return n; });
                                }}
                                style={{ width: 80, fontSize: 13, fontWeight: 600, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 5 }}
                              />
                            </div>
                          </td>
                          <td>
                            <button
                              className={tag.is_active ? 'submit-button' : 'cancel-button'}
                              style={{ fontSize: 12, padding: '3px 10px', minWidth: 70 }}
                              onClick={() => handleUpdateTag(tag.id, { is_active: tag.is_active ? 0 : 1 })}
                            >
                              {tag.is_active ? '✅ Active' : '⏸ Inactive'}
                            </button>
                          </td>
                          <td style={{ fontSize: 12, color: '#6b7280' }}>
                            {tag.created_at ? new Date(tag.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <button
                              className="orders-clear-btn"
                              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteTag(tag.id)}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Delivery Boys tab ── */}
            {deliverySubTab === 'boys' && <>

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
                          <td style={{ fontSize: 12 }}>{o.created_at ? new Date(o.created_at).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
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
                <MangoLoader text="Loading assigned orders…" />
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

            </>}

            {/* ── Delivery Sheet sub-tab ── */}
            {deliverySubTab === 'delivery-sheet' && (() => {
              const dsFiltered = reportOrders
                .filter(o => selectedReportShipment === 'all' || o.shipment_id === selectedReportShipment)
                .filter(o => {
                  if (!reportTagFilter) return true;
                  if (reportTagFilter === 'untagged') return !o.delivery_tag_id;
                  return String(o.delivery_tag_id) === reportTagFilter;
                });

              const deliveryOrders = dsFiltered.filter(o => {
                const addrOk = o.delivery_type === 'delivery' ? o.delivery_address : true;
                if (dsStatusFilter.size > 0) return dsStatusFilter.has(o.order_status) && addrOk;
                return o.order_status !== 'cancelled' && o.order_status !== 'pending' && addrOk;
              });

              const stripStd = name => name ? name.split(/\s*[-–]\s*/)[0].trim() : name;
              const allVariants = [];
              deliveryOrders.forEach(o => {
                (o.items || []).forEach(it => {
                  const v = stripStd(it.variant);
                  if (v && !allVariants.includes(v)) allVariants.push(v);
                });
              });
              allVariants.sort();

              const extractPostal = addr => { const m = addr && addr.match(/\b(\d{5,6})\s*$/); return m ? m[1] : ''; };

              const addressMap = {};
              deliveryOrders.forEach(o => {
                const addr = o.delivery_type === 'pickup'
                  ? (o.pickup_location_address || o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                  : o.delivery_address.trim();
                const type = o.delivery_type === 'pickup' ? 'Self Collection' : 'Home Delivery';
                if (!addressMap[addr]) addressMap[addr] = { _name: o.customer_name || '', _phone: o.customer_phone || '', _type: type, _postal: type === 'Home Delivery' ? extractPostal(addr) : '', _tag_name: o.delivery_tag_name || '', _tag_color: o.delivery_tag_color || '', _tag_id: o.delivery_tag_id || null };
                (o.items || []).forEach(it => {
                  const v = stripStd(it.variant);
                  if (v) addressMap[addr][v] = (addressMap[addr][v] || 0) + (it.qty || 0);
                });
              });
              const addresses = Object.keys(addressMap).sort();

              const shipLabel = selectedReportShipment === 'all' ? 'all-shipments' : `shipment-${selectedReportShipment}`;
              const toggleDeliverySort = col => setDeliverySort(p => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));

              const applyTagToAddress = async (addr, tagId) => {
                const orderIds = deliveryOrders
                  .filter(o => {
                    const a = o.delivery_type === 'pickup'
                      ? (o.pickup_location_address || o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                      : o.delivery_address.trim();
                    return a === addr;
                  })
                  .map(o => o.id);
                if (!orderIds.length) return;
                const tagIdPayload = tagId === 'clear' ? null : Number(tagId);
                try {
                  const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-tag`, {
                    method: 'PUT',
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_ids: orderIds, tag_id: tagIdPayload }),
                  });
                  if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
                  const data = await res.json();
                  const tagName = tagIdPayload === null ? 'cleared' : (deliveryTags.find(t => t.id === tagIdPayload)?.name || 'tag');
                  showToast('success', `Tag "${tagName}" applied to ${data.count} order(s) for this address`);
                  fetchReportOrders();
                } catch (err) {
                  showToast('error', `Tag assign failed: ${err.message}`);
                }
              };

              const tagPaletteColor = tagId => {
                const idx = deliveryTags.findIndex(t => t.id === tagId);
                return idx >= 0 ? TAG_PALETTE[idx % TAG_PALETTE.length] : '#6b7280';
              };

              const handleDsBulkStatus = async () => {
                if ((!dsBulkStatus && !dsBulkTag) || dsSelectedAddrs.size === 0) return;
                const orderIds = deliveryOrders
                  .filter(o => {
                    const a = o.delivery_type === 'pickup'
                      ? (o.pickup_location_address || o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                      : o.delivery_address.trim();
                    return dsSelectedAddrs.has(a);
                  })
                  .map(o => o.id);
                if (!orderIds.length) return;
                try {
                  if (dsBulkStatus) {
                    const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-status`, {
                      method: 'PUT',
                      headers: { ...headers, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_ids: orderIds, new_status: dsBulkStatus, note: dsBulkNote || null }),
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.detail || d.error || 'Failed'); }
                    const data = await res.json();
                    showToast('success', `Updated ${data.count} order(s) to "${data.new_status}"`);
                  }
                  if (dsBulkTag) {
                    const tagIdPayload = dsBulkTag === 'clear' ? null : Number(dsBulkTag);
                    const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-tag`, {
                      method: 'PUT',
                      headers: { ...headers, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_ids: orderIds, tag_id: tagIdPayload }),
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
                    const tagName = tagIdPayload === null ? 'cleared' : (deliveryTags.find(t => t.id === tagIdPayload)?.name || 'tag');
                    showToast('success', `Tag "${tagName}" applied to ${orderIds.length} order(s)`);
                  }
                  setDsSelectedAddrs(new Set());
                  setDsBulkStatus('');
                  setDsBulkNote('');
                  setDsBulkTag('');
                  fetchReportOrders();
                } catch (err) {
                  showToast('error', `Bulk update failed: ${err.message}`);
                }
              };

              const deliveryRows = sortByCol(
                addresses.map(addr => {
                  const row = addressMap[addr];
                  const total = allVariants.reduce((s, v) => s + (row[v] || 0), 0);
                  return { addr, tagId: row._tag_id, tagName: row._tag_name, type: row._type, name: row._name, phone: row._phone, postal: row._postal || '', ...Object.fromEntries(allVariants.map(v => [v, row[v] || 0])), total };
                }),
                deliverySort.col, deliverySort.dir
              );

              const shipmentsWithOrders = shipments.filter(s => reportOrders.some(o => o.shipment_id === s.id));

              return (
                <div className="dashboard-section">
                  {/* Shipment + tag filter bar */}
                  <div className="report-shipment-filter-bar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <select value={reportTagFilter} onChange={e => { setReportTagFilter(e.target.value); setDsAddressFilter(null); }} className="orders-filter-select" style={{ fontSize: 12 }}>
                      <option value="">All Tags</option>
                      <option value="untagged">🚫 Untagged</option>
                      {deliveryTags.map(t => <option key={t.id} value={String(t.id)}>🏷️ {t.name}</option>)}
                    </select>
                    {[
                      { value: 'pending',   label: 'Pending' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'shipped',   label: 'Shipped' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'cancelled', label: 'Cancelled' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        className={`report-shipment-btn${dsStatusFilter.has(value) ? ' active' : ''}`}
                        onClick={() => {
                          setDsStatusFilter(prev => {
                            const next = new Set(prev);
                            next.has(value) ? next.delete(value) : next.add(value);
                            return next;
                          });
                          setDsAddressFilter(null);
                        }}
                      >{label}</button>
                    ))}
                    <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
                    <button className={`report-shipment-btn${selectedReportShipment === 'all' ? ' active' : ''}`} onClick={() => { setSelectedReportShipment('all'); setDsAddressFilter(null); }}>All Shipments</button>
                    {shipmentsWithOrders.map(s => (
                      <button key={s.id} className={`report-shipment-btn${selectedReportShipment === s.id ? ' active' : ''}`} onClick={() => { setSelectedReportShipment(s.id); setDsAddressFilter(null); }}>{s.shipment_ref}</button>
                    ))}
                  </div>

                  {/* ── Address drill-down ── */}
                  {dsAddressFilter && (() => {
                    const addrOrders = deliveryOrders.filter(o => {
                      const a = o.delivery_type === 'pickup'
                        ? (o.pickup_location_address || o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                        : o.delivery_address.trim();
                      return a === dsAddressFilter;
                    });
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <button className="cancel-button" onClick={() => { setDsAddressFilter(null); setDsOrderSelectedIds([]); setDsOrderBulkStatus(''); setDsOrderBulkNote(''); }} style={{ fontSize: 13 }}>← Back</button>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{dsAddressFilter}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>({addrOrders.length} order{addrOrders.length !== 1 ? 's' : ''})</span>
                        </div>
                        {dsOrderSelectedIds.length > 0 && (
                          <div className="bulk-update-bar" style={{ marginBottom: 10 }}>
                            <span className="bulk-count">{dsOrderSelectedIds.length} selected</span>
                            <select value={dsOrderBulkStatus} onChange={e => setDsOrderBulkStatus(e.target.value)} className="orders-filter-select">
                              <option value="">— Set Status —</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="pending">Pending</option>
                            </select>
                            <select value={dsOrderBulkTag} onChange={e => setDsOrderBulkTag(e.target.value)} className="orders-filter-select">
                              <option value="">— Set Tag —</option>
                              <option value="clear">🚫 Clear Tag</option>
                              {deliveryTags.filter(t => t.is_active).map(t => (
                                <option key={t.id} value={String(t.id)}>🏷️ {t.name}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={dsOrderBulkNote}
                              onChange={e => setDsOrderBulkNote(e.target.value)}
                              className="bulk-note-input"
                            />
                            <button
                              className="submit-button"
                              disabled={!dsOrderBulkStatus && !dsOrderBulkTag}
                              onClick={async () => {
                                try {
                                  if (dsOrderBulkStatus) {
                                    const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-status`, {
                                      method: 'PUT',
                                      headers: { ...headers, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ order_ids: dsOrderSelectedIds, new_status: dsOrderBulkStatus, note: dsOrderBulkNote || null }),
                                    });
                                    if (!res.ok) { const d = await res.json(); throw new Error(d.detail || d.error || 'Failed'); }
                                    const data = await res.json();
                                    showToast('success', `Updated ${data.count} order(s) to "${data.new_status}"`);
                                  }
                                  if (dsOrderBulkTag) {
                                    const tagIdPayload = dsOrderBulkTag === 'clear' ? null : Number(dsOrderBulkTag);
                                    const res = await fetch(`${API_BASE}/api/v1/admin/orders/bulk-tag`, {
                                      method: 'PUT',
                                      headers: { ...headers, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ order_ids: dsOrderSelectedIds, tag_id: tagIdPayload }),
                                    });
                                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || d.detail || 'Failed'); }
                                    const tagName = tagIdPayload === null ? 'cleared' : (deliveryTags.find(t => t.id === tagIdPayload)?.name || 'tag');
                                    showToast('success', `Tag "${tagName}" applied to ${dsOrderSelectedIds.length} order(s)`);
                                  }
                                  setDsOrderSelectedIds([]);
                                  setDsOrderBulkStatus('');
                                  setDsOrderBulkNote('');
                                  setDsOrderBulkTag('');
                                  fetchReportOrders();
                                } catch (err) {
                                  showToast('error', `Bulk update failed: ${err.message}`);
                                }
                              }}
                            >
                              Update {dsOrderSelectedIds.length} Order(s)
                            </button>
                            <button className="cancel-button" onClick={() => { setDsOrderSelectedIds([]); setDsOrderBulkStatus(''); setDsOrderBulkNote(''); setDsOrderBulkTag(''); }} style={{ marginLeft: 4 }}>
                              Clear
                            </button>
                          </div>
                        )}
                        <div className="report-table-wrap">
                          <table className="report-location-table">
                            <thead>
                              <tr>
                                <th style={{ width: 36, textAlign: 'center', padding: '4px 6px' }}>
                                  <input
                                    type="checkbox"
                                    checked={addrOrders.length > 0 && addrOrders.every(o => dsOrderSelectedIds.includes(o.id))}
                                    onChange={e => setDsOrderSelectedIds(e.target.checked ? addrOrders.map(o => o.id) : [])}
                                    title="Select all"
                                  />
                                </th>
                                <th>Order Ref</th>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {addrOrders.map(o => {
                                const checked = dsOrderSelectedIds.includes(o.id);
                                return (
                                  <tr key={o.id} style={checked ? { background: '#f0fdf4' } : undefined}>
                                    <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={e => setDsOrderSelectedIds(prev =>
                                          e.target.checked ? [...prev, o.id] : prev.filter(id => id !== o.id)
                                        )}
                                      />
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#16a34a', whiteSpace: 'nowrap' }}>{o.order_ref}</td>
                                    <td style={{ fontSize: 12 }}>{o.customer_name}</td>
                                    <td style={{ fontSize: 12 }}>{o.customer_phone || '—'}</td>
                                    <td style={{ fontSize: 12 }}>
                                      {(o.items || []).map((it, i) => (
                                        <div key={i}>{it.name || it.variant} × {it.qty}</div>
                                      ))}
                                    </td>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>${Number(o.total_price || 0).toFixed(2)}</td>
                                    <td><span className={`status-badge status-${o.order_status}`}>{o.order_status}</span></td>
                                    <td><span className={`status-badge ${o.payment_status === 'succeeded' ? 'status-completed' : o.payment_status === 'failed' ? 'status-missing' : 'status-pending'}`}>{o.payment_status}</span></td>
                                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  {!dsAddressFilter && addresses.length === 0 ? (
                    <p style={{ color: '#9ca3af', marginTop: 16 }}>No delivery orders found for this selection.</p>
                  ) : !dsAddressFilter && (
                    <>
                      {dsSelectedAddrs.size > 0 && (
                        <div className="bulk-update-bar" style={{ marginBottom: 10 }}>
                          <span className="bulk-count">{dsSelectedAddrs.size} row{dsSelectedAddrs.size > 1 ? 's' : ''} selected</span>
                          <select value={dsBulkStatus} onChange={e => setDsBulkStatus(e.target.value)} className="orders-filter-select">
                            <option value="">— Set Status —</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="pending">Pending</option>
                          </select>
                          <select value={dsBulkTag} onChange={e => setDsBulkTag(e.target.value)} className="orders-filter-select">
                            <option value="">— Set Tag —</option>
                            <option value="clear">🚫 Clear Tag</option>
                            {deliveryTags.filter(t => t.is_active).map(t => (
                              <option key={t.id} value={String(t.id)}>🏷️ {t.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Note (optional)"
                            value={dsBulkNote}
                            onChange={e => setDsBulkNote(e.target.value)}
                            className="bulk-note-input"
                          />
                          <button className="submit-button" disabled={!dsBulkStatus && !dsBulkTag} onClick={handleDsBulkStatus}>
                            Update Orders
                          </button>
                          <button className="cancel-button" onClick={() => { setDsSelectedAddrs(new Set()); setDsBulkStatus(''); setDsBulkNote(''); setDsBulkTag(''); }} style={{ marginLeft: 4 }}>
                            Clear
                          </button>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <button className="report-download-btn" onClick={() => {
                          const hdrs = ['Tag', 'Address / Collection Point', 'Postal', 'Type', 'Customer', 'Phone', ...allVariants, 'Total'];
                          const rows = deliveryRows.map(r => [r.tagName || '', r.addr, r.postal || '', r.type, r.name, r.phone, ...allVariants.map(v => r[v] || 0), r.total]);
                          rows.push(['', 'TOTAL', '', '', '', '', ...allVariants.map(v => addresses.reduce((s, a) => s + (addressMap[a][v] || 0), 0)), addresses.reduce((s, a) => s + allVariants.reduce((ss, v) => ss + (addressMap[a][v] || 0), 0), 0)]);
                          downloadCSV(`delivery-sheet-${shipLabel}.csv`, hdrs, rows);
                        }}>⬇ Download CSV</button>
                      </div>
                      <div className="report-table-wrap">
                        <table className="report-location-table">
                          <thead>
                            <tr>
                              <th style={{ width: 36, textAlign: 'center', padding: '4px 6px' }}>
                                <input
                                  type="checkbox"
                                  checked={deliveryRows.length > 0 && deliveryRows.every(r => dsSelectedAddrs.has(r.addr))}
                                  onChange={e => {
                                    if (e.target.checked) setDsSelectedAddrs(new Set(deliveryRows.map(r => r.addr)));
                                    else setDsSelectedAddrs(new Set());
                                  }}
                                  title="Select all"
                                />
                              </th>
                              <SortTh label="Tag" colKey="tagName" sort={deliverySort} onSort={toggleDeliverySort} style={{ minWidth: 90 }} />
                              <SortTh label="Address / Collection Point" colKey="addr" sort={deliverySort} onSort={toggleDeliverySort} style={{ minWidth: 200 }} />
                              <SortTh label="Postal" colKey="postal" sort={deliverySort} onSort={toggleDeliverySort} style={{ minWidth: 70 }} />
                              <SortTh label="Type" colKey="type" sort={deliverySort} onSort={toggleDeliverySort} />
                              <SortTh label="Customer" colKey="name" sort={deliverySort} onSort={toggleDeliverySort} />
                              <SortTh label="Phone" colKey="phone" sort={deliverySort} onSort={toggleDeliverySort} />
                              {allVariants.map(v => <SortTh key={v} label={v} colKey={v} sort={deliverySort} onSort={toggleDeliverySort} className="report-col-confirmed" />)}
                              <SortTh label="Total" colKey="total" sort={deliverySort} onSort={toggleDeliverySort} />
                            </tr>
                          </thead>
                          <tbody>
                            {deliveryRows.map(r => {
                              const _rc = r.tagId ? tagPaletteColor(r.tagId) : null;
                              const rowStyle = _rc
                                ? { background: _rc + '18', borderLeft: `3px solid ${_rc}88` }
                                : (r.type === 'Home Delivery' && r.total > 5 ? { background: '#fef9c3', borderLeft: '3px solid #eab308' } : undefined);
                              return (
                              <tr key={r.addr} style={rowStyle}>
                                <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                                  <input
                                    type="checkbox"
                                    checked={dsSelectedAddrs.has(r.addr)}
                                    onChange={e => {
                                      setDsSelectedAddrs(prev => {
                                        const next = new Set(prev);
                                        if (e.target.checked) next.add(r.addr);
                                        else next.delete(r.addr);
                                        return next;
                                      });
                                    }}
                                  />
                                </td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                  {r.tagName
                                    ? <span className="delivery-tag-badge" style={{ background: tagPaletteColor(r.tagId) + '22', color: tagPaletteColor(r.tagId), border: `1px solid ${tagPaletteColor(r.tagId)}55` }}>🏷️ {r.tagName}</span>
                                    : <span style={{ color: '#d1d5db' }}>—</span>}
                                </td>
                                <td className="report-loc-name" style={{ fontSize: 12, cursor: 'pointer', color: '#2563eb', textDecoration: 'underline dotted' }} onClick={() => setDsAddressFilter(r.addr)} title="View all orders for this address">{r.addr}</td>
                                <td style={{ fontSize: 12, fontWeight: 600, color: r.postal ? '#374151' : '#d1d5db', whiteSpace: 'nowrap' }}>{r.postal || '—'}</td>
                                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: r.type === 'Self Collection' ? '#dbeafe' : '#dcfce7', color: r.type === 'Self Collection' ? '#1d4ed8' : '#15803d' }}>{r.type}</span>
                                </td>
                                <td style={{ fontSize: 12 }}>{r.name}</td>
                                <td style={{ fontSize: 12 }}>{r.phone}</td>
                                {allVariants.map(v => <td key={v} className={`report-count${r[v] ? '' : ' zero'}`}>{r[v] || 0}</td>)}
                                <td className="report-row-total">{r.total}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="report-totals-row">
                              <td colSpan={7}><strong>Total</strong></td>
                              {allVariants.map(v => {
                                const colTotal = addresses.reduce((s, a) => s + (addressMap[a][v] || 0), 0);
                                return <td key={v} className="report-count"><strong>{colTotal}</strong></td>;
                              })}
                              <td className="report-row-total"><strong>{addresses.reduce((s, a) => s + allVariants.reduce((ss, v) => ss + (addressMap[a][v] || 0), 0), 0)}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

          </div>
        )}

        {activeTab === 'reports' && (
          <div className="dashboard-section" style={{ paddingBottom: 0 }}>
            <h2>📈 Reports</h2>
            <div className="manage-sub-nav" style={{ marginBottom: 20 }}>
              <button
                className={`manage-sub-tab${reportSubTab === 'all-orders' ? ' active' : ''}`}
                onClick={() => { setReportSubTab('all-orders'); fetchAllOrders(); fetchAbandonedOrders(); fetchAdminPickupLocations(); }}
              >📋 All Orders</button>
              <button
                className={`manage-sub-tab${reportSubTab === 'orders-summary' ? ' active' : ''}`}
                onClick={() => { setReportSubTab('orders-summary'); fetchReportOrders(); fetchShipments(); fetchDeliveryTags(); }}
              >Orders Summary</button>
              <button
                className={`manage-sub-tab${reportSubTab === 'orders-by-type' ? ' active' : ''}`}
                onClick={() => { setReportSubTab('orders-by-type'); fetchReportOrders(); fetchShipments(); fetchDeliveryTags(); }}
              >Orders by Type</button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && reportSubTab === 'all-orders' && (
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
                  <MangoLoader text="Loading abandoned checkouts…" />
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

            {/* ── Address filter banner ── */}
            {addressFilter && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#15803d', fontWeight: 600 }}>Showing orders for:</span>
                <span style={{ color: '#1f2937' }}>{addressFilter}</span>
                <button
                  onClick={() => setAddressFilter('')}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #86efac', borderRadius: 6, padding: '2px 10px', cursor: 'pointer', color: '#15803d', fontWeight: 600, fontSize: 12 }}
                >✕ Clear</button>
              </div>
            )}

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
                      const isActive = (orderFilters[key] || []).includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          className={`filter-chip${isActive ? ' active' : ''}`}
                          onClick={() => handleOrderFilterChange(key, opt.value)}
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

              {/* Secondary row: tags, date range, clear */}
              <div className="orders-filter-row" style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 4 }}>
                <select value={orderFilters.tag_id} onChange={e => handleOrderFilterChange('tag_id', e.target.value)} className="orders-filter-select">
                  <option value="">All Tags</option>
                  <option value="untagged">🚫 Untagged</option>
                  {deliveryTags.map(t => (
                    <option key={t.id} value={t.id}>🏷️ {t.name}</option>
                  ))}
                </select>

                <button
                  className="orders-clear-btn"
                  onClick={() => {
                    const cleared = {
                      delivery_type: [], payment_status: [], order_status: [],
                      pickup_location_id: [], delivery_boy_id: '', assigned: '',
                      payment_method: [], date_from: '', date_to: '', tag_id: '',
                    };
                    setOrderFilters(cleared);
                    setActiveFilters({ delivery_type: false, payment_status: false, order_status: false, pickup_location_id: false, payment_method: false });
                    setOrderSelectedIds([]);
                    setAddressFilter('');
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
                {/* Status update */}
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

                {/* Tag assignment */}
                <div className="bulk-divider" />
                <select
                  value={bulkTagId}
                  onChange={e => setBulkTagId(e.target.value)}
                  className="orders-filter-select"
                >
                  <option value="">— Assign Tag —</option>
                  <option value="clear">🚫 Clear Tag</option>
                  {deliveryTags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  className="submit-button"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                  disabled={bulkTagId === ''}
                  onClick={handleBulkTagAssign}
                >
                  🏷️ Apply Tag
                </button>

                <button className="orders-clear-btn" onClick={() => setOrderSelectedIds([])}>Deselect</button>
              </div>
            )}

            {bulkResult && (
              <div className={bulkResult.success ? 'db-success' : 'db-error'} style={{ margin: '8px 0' }}>
                {bulkResult.message}
              </div>
            )}

            {/* ── Column chooser ── */}
            <div className="orders-col-chooser">
              <span className="orders-col-chooser-label">Show columns:</span>
              {[
                { key: 'tag',        label: 'Tag' },
                { key: 'assignedTo', label: 'Assigned To' },
                { key: 'delCode',    label: 'Del. Code' },
                { key: 'shipment',   label: 'Shipment' },
                { key: 'itemNames',  label: 'Item Names' },
              ].map(({ key, label }) => (
                <label key={key} className="orders-col-toggle">
                  <input
                    type="checkbox"
                    checked={orderColVisibility[key]}
                    onChange={() => setOrderColVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
                  />
                  {label}
                </label>
              ))}
              <button
                className="report-download-btn"
                style={{ marginLeft: 'auto' }}
                disabled={allOrders.length === 0}
                onClick={() => {
                  const filtered = addressFilter
                    ? allOrders.filter(o => {
                        const addr = o.delivery_type === 'pickup'
                          ? (o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                          : (o.delivery_address || '');
                        return addr.trim() === addressFilter;
                      })
                    : allOrders;

                  const headers = [
                    'Order Ref', 'Customer', 'Phone', 'Mode', 'Location / Address',
                    'Order Status', 'Payment Status', 'Payment Method',
                    ...(orderColVisibility.tag        ? ['Tag']         : []),
                    ...(orderColVisibility.assignedTo ? ['Assigned To'] : []),
                    ...(orderColVisibility.delCode    ? ['Del. Code']   : []),
                    ...(orderColVisibility.shipment   ? ['Shipment']    : []),
                    ...(orderColVisibility.itemNames  ? ['Item Names']  : []),
                    'Items', 'Promo Code', 'Discount', 'Total', 'Date',
                  ];

                  const rows = filtered.map(o => [
                    o.order_ref,
                    o.customer_name,
                    o.customer_phone || '',
                    o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup',
                    o.delivery_type === 'pickup'
                      ? (o.pickup_location_name || `Loc #${o.pickup_location_id}`)
                      : (o.delivery_address || ''),
                    o.order_status,
                    o.payment_status,
                    o.payment_method || '',
                    ...(orderColVisibility.tag        ? [o.delivery_tag_name || '']  : []),
                    ...(orderColVisibility.assignedTo ? [o.delivery_boy_name || '']  : []),
                    ...(orderColVisibility.delCode    ? [o.delivery_code || '']      : []),
                    ...(orderColVisibility.shipment   ? [o.shipment_id ? `#${o.shipment_id}` : ''] : []),
                    ...(orderColVisibility.itemNames  ? [(o.items || []).map(it => `${(it.variant || '').split(/[-–]/)[0].trim()} (${it.qty})`).join('; ')] : []),
                    o.items_count,
                    o.promo_code || '',
                    Number(o.discount_amount || 0) > 0 ? Number(o.discount_amount).toFixed(2) : '',
                    o.total_price,
                    o.created_at ? new Date(o.created_at).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
                  ]);

                  const now = new Date().toISOString().slice(0, 10);
                  downloadCSV(`all-orders-${now}.csv`, headers, rows);
                }}
              >
                ⬇ Download CSV
              </button>
            </div>

            {/* ── Orders table ── */}
            {ordersLoading ? (
              <MangoLoader text="Loading orders…" />
            ) : allOrders.length === 0 ? (
              <p style={{ color: '#6b7280', marginTop: 16 }}>No orders match the selected filters.</p>
            ) : (() => {
              const toggleAllOrdersSort = col => setAllOrdersSort(p => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));
              const baseOrders = addressFilter
                ? allOrders.filter(o => {
                    const addr = o.delivery_type === 'pickup'
                      ? (o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                      : (o.delivery_address || '');
                    return addr.trim() === addressFilter;
                  })
                : allOrders;
              const sortableOrders = baseOrders.map(o => ({
                ...o,
                _location: o.delivery_type === 'pickup'
                  ? (o.pickup_location_name || `Collection Point #${o.pickup_location_id}`)
                  : (o.delivery_address || ''),
                _date: o.created_at || '',
                total_price: Number(o.total_price) || 0,
              }));
              const sortedOrders = sortByCol(sortableOrders, allOrdersSort.col, allOrdersSort.dir);
              return (
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
                      <SortTh label="Order Ref" colKey="order_ref" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Customer" colKey="customer_name" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Phone" colKey="customer_phone" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Mode" colKey="delivery_type" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Location / Address" colKey="_location" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Order Status" colKey="order_status" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Payment" colKey="payment_status" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Method" colKey="payment_method" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      {orderColVisibility.tag        && <SortTh label="Tag" colKey="delivery_tag_name" sort={allOrdersSort} onSort={toggleAllOrdersSort} />}
                      {orderColVisibility.assignedTo && <SortTh label="Assigned To" colKey="delivery_boy_name" sort={allOrdersSort} onSort={toggleAllOrdersSort} />}
                      {orderColVisibility.delCode    && <SortTh label="Del. Code" colKey="delivery_code" sort={allOrdersSort} onSort={toggleAllOrdersSort} />}
                      {orderColVisibility.shipment   && <SortTh label="Shipment" colKey="shipment_id" sort={allOrdersSort} onSort={toggleAllOrdersSort} />}
                      {orderColVisibility.itemNames  && <th>Item Names</th>}
                      <SortTh label="Items" colKey="items_count" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Total" colKey="total_price" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                      <SortTh label="Date" colKey="_date" sort={allOrdersSort} onSort={toggleAllOrdersSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.map(o => {
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
                            {orderColVisibility.tag && (
                              <td>
                                {o.delivery_tag_name
                                  ? (() => { const _ti = deliveryTags.findIndex(t => t.id === o.delivery_tag_id); const _tc = _ti >= 0 ? TAG_PALETTE[_ti % TAG_PALETTE.length] : '#6b7280'; return <span className="delivery-tag-badge" style={{ background: _tc + '22', color: _tc, border: `1px solid ${_tc}55` }}>🏷️ {o.delivery_tag_name}</span>; })()
                                  : <span style={{ color: '#d1d5db' }}>—</span>}
                              </td>
                            )}
                            {orderColVisibility.assignedTo && (
                              <td style={{ fontSize: 12 }}>
                                {o.delivery_boy_name
                                  ? <span className="assigned-badge">{o.delivery_boy_name}</span>
                                  : <span style={{ color: '#9ca3af' }}>—</span>}
                              </td>
                            )}
                            {orderColVisibility.delCode && (
                              <td style={{ fontSize: 11, color: '#6b7280' }}>{o.delivery_code || '—'}</td>
                            )}
                            {orderColVisibility.shipment && (
                              <td style={{ fontSize: 12, textAlign: 'center' }}>
                                {o.shipment_id
                                  ? <span className="shipment-id-badge">#{o.shipment_id}</span>
                                  : <span style={{ color: '#9ca3af' }}>—</span>}
                              </td>
                            )}
                            {orderColVisibility.itemNames && (
                              <td className="orders-item-names-cell">
                                {(o.items || []).length === 0
                                  ? <span style={{ color: '#9ca3af' }}>—</span>
                                  : (o.items || []).map((it, idx) => (
                                      <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                                        {(it.variant || '').split(/[-–]/)[0].trim()} <span style={{ color: '#6b7280' }}>({it.qty})</span>
                                      </div>
                                    ))}
                              </td>
                            )}
                            <td style={{ textAlign: 'center', fontSize: 13 }}>
                              <button className="items-toggle-btn" onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>
                                {o.items_count} item{o.items_count !== 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                              </button>
                            </td>
                            <td><strong>₹{o.total_price}</strong></td>
                            <td style={{ fontSize: 12 }}>
                              {o.created_at ? new Date(o.created_at).toLocaleString('en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="order-detail-row">
                              <td colSpan={16}>
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
                                        {o.delivery_fee && Number(o.delivery_fee) > 0 && (
                                          <span>Delivery fee: ₹{o.delivery_fee}</span>
                                        )}
                                        {o.promo_code && Number(o.discount_amount) > 0 && (
                                          <span style={{ color: '#16a34a' }}>
                                            Promo ({o.promo_code}): −₹{Number(o.discount_amount).toFixed(2)}
                                          </span>
                                        )}
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

                                      <button
                                        className="order-history-btn"
                                        onClick={() => setHistoryOrder(o)}
                                      >
                                        🕑 View Order History
                                      </button>

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
                  Showing {sortedOrders.length} order(s) · {orderSelectedIds.length} selected
                </p>
              </div>
              );
            })()}
            </>)}
          </div>
        )}

        {activeTab === 'manage' && manageSubTab === 'products' && (
          <div className="dashboard-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ margin: 0 }}>🥭 Products</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {orderDirty && (
                  <button
                    className="submit-button"
                    style={{ padding: '8px 18px', fontSize: 13, background: '#f59e0b', borderColor: '#f59e0b' }}
                    disabled={savingOrder}
                    onClick={handleSaveOrder}
                  >
                    {savingOrder ? 'Saving…' : '💾 Save Display Order'}
                  </button>
                )}
                <button
                  className="submit-button"
                  style={{ padding: '8px 18px', fontSize: 13 }}
                  onClick={() => { setShowAddProduct(v => !v); setAddProductError(''); }}
                >
                  {showAddProduct ? 'Cancel' : '+ Add Product'}
                </button>
              </div>
            </div>
            {orderDirty && (
              <p style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 6, padding: '6px 12px', marginBottom: 12 }}>
                Display order changed — click <strong>Save Display Order</strong> to apply on the home screen.
              </p>
            )}

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
                    { label: 'Emoji', key: 'emoji', placeholder: 'e.g. 🥭' },
                    { label: 'Size / Variant Name', key: 'size_name', placeholder: 'e.g. 5kg Box' },
                    { label: 'Unit', key: 'unit', placeholder: 'e.g. box' },
                    { label: 'Price (SGD) *', key: 'price', placeholder: 'e.g. 49.90', type: 'number' },
                    { label: 'Initial Stock', key: 'initial_stock', placeholder: 'e.g. 50', type: 'number' },
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
                    Image URL
                    <input
                      type="text"
                      placeholder="e.g. /kesar.jpg or https://…"
                      value={addProductForm.image_url}
                      onChange={e => setAddProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, fontWeight: 400 }}
                    />
                  </label>
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

            {editingProduct && (
              <form onSubmit={handleSaveEditProduct} style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
                padding: '20px 24px', marginBottom: 24, maxWidth: 600,
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Edit Product — {editingProduct.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                  {[
                    { label: 'Name *', key: 'name', placeholder: 'e.g. Kesar' },
                    { label: 'Origin', key: 'origin', placeholder: 'e.g. India' },
                    { label: 'Tag', key: 'tag', placeholder: 'e.g. Premium' },
                    { label: 'Emoji', key: 'emoji', placeholder: 'e.g. 🥭' },
                    { label: 'Season Start', key: 'season_start', placeholder: 'e.g. Apr' },
                    { label: 'Season End', key: 'season_end', placeholder: 'e.g. Jun' },
                    { label: 'Unit', key: 'unit', placeholder: 'e.g. box' },
                  ].map(({ label, key, placeholder }) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                      {label}
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={editProductForm[key]}
                        onChange={e => setEditProductForm(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, fontWeight: 400 }}
                      />
                    </label>
                  ))}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Price
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 29.90"
                      value={editProductForm.price}
                      onChange={e => setEditProductForm(prev => ({ ...prev, price: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, fontWeight: 400 }}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Image URL
                    <input
                      type="text"
                      placeholder="e.g. /kesar.jpg or https://…"
                      value={editProductForm.image_url}
                      onChange={e => setEditProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, fontWeight: 400 }}
                    />
                  </label>
                  <label style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    Description
                    <textarea
                      rows={2}
                      placeholder="Optional description"
                      value={editProductForm.description}
                      onChange={e => setEditProductForm(prev => ({ ...prev, description: e.target.value }))}
                      style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #93c5fd', fontSize: 13, fontWeight: 400, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>
                {editProductError && (
                  <p style={{ color: '#dc2626', fontSize: 12, margin: '10px 0 0', fontWeight: 600 }}>✕ {editProductError}</p>
                )}
                <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                  <button type="submit" className="submit-button" style={{ padding: '8px 22px' }} disabled={editProductSaving}>
                    {editProductSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditingProduct(null)}
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
              <div style={{ overflowX: 'auto' }}>
              <table className="shipment-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Name</th>
                    <th>Origin</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {localOrder.map((productId, idx) => {
                    const product = adminProducts.find(p => p.id === productId);
                    if (!product) return null;
                    const currentPrice = product.variants?.[0]?.price ?? null;
                    const editVal = editingPrices[product.id];
                    const isDirty = editVal !== undefined;
                    const currentStock = product.variants?.[0]?.stock?.quantity_available ?? null;
                    const stockEditVal = editingStocks[product.id];
                    const isStockDirty = stockEditVal !== undefined;
                    return (
                      <tr key={product.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 700, color: '#6b7280', minWidth: 20, textAlign: 'center', fontSize: 13 }}>{idx + 1}</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <button
                                onClick={() => moveProductUp(idx)}
                                disabled={idx === 0}
                                title="Move up"
                                style={{
                                  width: 22, height: 18, padding: 0, border: '1px solid #d1d5db',
                                  borderRadius: 4, background: idx === 0 ? '#f3f4f6' : '#fff',
                                  color: idx === 0 ? '#d1d5db' : '#374151',
                                  cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                  fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >▲</button>
                              <button
                                onClick={() => moveProductDown(idx)}
                                disabled={idx === localOrder.length - 1}
                                title="Move down"
                                style={{
                                  width: 22, height: 18, padding: 0, border: '1px solid #d1d5db',
                                  borderRadius: 4, background: idx === localOrder.length - 1 ? '#f3f4f6' : '#fff',
                                  color: idx === localOrder.length - 1 ? '#d1d5db' : '#374151',
                                  cursor: idx === localOrder.length - 1 ? 'not-allowed' : 'pointer',
                                  fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >▼</button>
                            </div>
                          </div>
                        </td>
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={isStockDirty ? stockEditVal : (currentStock != null ? currentStock : '')}
                                onChange={e => {
                                  setEditingStocks(prev => ({ ...prev, [product.id]: e.target.value }));
                                  setStockErrors(prev => { const n = { ...prev }; delete n[product.id]; return n; });
                                }}
                                onKeyDown={e => e.key === 'Enter' && isStockDirty && handleUpdateStock(product.id)}
                                style={{
                                  width: 62, padding: '4px 6px', borderRadius: 6,
                                  border: `1.5px solid ${stockErrors[product.id] ? '#dc2626' : isStockDirty ? '#16a34a' : '#d1d5db'}`,
                                  fontSize: 13, fontWeight: 600,
                                }}
                              />
                              <button
                                onClick={() => handleUpdateStock(product.id)}
                                disabled={!isStockDirty || savingStockId === product.id}
                                style={{
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: isStockDirty ? '#16a34a' : '#e5e7eb',
                                  color: isStockDirty ? '#fff' : '#9ca3af',
                                  fontWeight: 700, fontSize: 12,
                                  cursor: isStockDirty ? 'pointer' : 'not-allowed',
                                  transition: 'background 0.2s',
                                }}
                              >
                                {savingStockId === product.id ? '…' : 'Save'}
                              </button>
                            </div>
                            {stockErrors[product.id] && (
                              <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                                ✕ {stockErrors[product.id]}
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
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              onClick={() => openEditProduct(product)}
                              style={{
                                padding: '5px 14px', borderRadius: 6, border: '1.5px solid #2563eb',
                                fontWeight: 700, fontSize: 12, letterSpacing: '0.05em',
                                cursor: 'pointer', background: editingProduct?.id === product.id ? '#2563eb' : '#fff',
                                color: editingProduct?.id === product.id ? '#fff' : '#2563eb',
                                transition: 'background 0.2s',
                              }}
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleToggleProductActive(product.id)}
                              style={{
                                padding: '5px 14px', borderRadius: 6, border: 'none',
                                fontWeight: 700, fontSize: 12, letterSpacing: '0.05em',
                                cursor: 'pointer',
                                background: product.is_active ? '#dc2626' : '#16a34a',
                                color: '#fff', transition: 'background 0.2s',
                              }}
                            >
                              {togglingProductId === product.id ? '...' : product.is_active ? 'DISABLE' : 'ENABLE'}
                            </button>
                            {resetStockConfirm === product.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  onClick={() => handleResetStock(product.id)}
                                  disabled={resetStockLoading === product.id}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                >{resetStockLoading === product.id ? '…' : 'Confirm'}</button>
                                <button
                                  onClick={() => setResetStockConfirm(null)}
                                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 11, cursor: 'pointer' }}
                                >✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setResetStockConfirm(product.id)}
                                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #f59e0b', background: '#fff', color: '#b45309', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                title="Reset stock to 0"
                              >
                                🔄 Stock
                              </button>
                            )}
                            {deleteProductConfirm === product.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  disabled={deletingProductId === product.id}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#7f1d1d', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                >{deletingProductId === product.id ? '…' : 'Delete?'}</button>
                                <button
                                  onClick={() => setDeleteProductConfirm(null)}
                                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', fontSize: 11, cursor: 'pointer' }}
                                >✕</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteProductConfirm(product.id)}
                                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid #dc2626', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                                title="Permanently delete product"
                              >
                                🗑 Delete
                              </button>
                            )}
                          </div>
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

        {activeTab === 'manage' && manageSubTab === 'ads' && (() => {
          // Deduplicate: uploaded banners that are already in the static build list
          const staticSrcs = new Set(ALL_BANNERS.map(b => b.src));
          const uploadedSlides = uploadedBanners
            .filter(src => !staticSrcs.has(src))
            .map(src => ({ src, alt: src.replace(/^\//, '').replace(/\.[^.]+$/, ''), uploaded: true }));
          const allBannerSlides = [
            ...ALL_BANNERS.map(b => ({ ...b, uploaded: false })),
            ...uploadedSlides,
          ];

          return (
            <div className="dashboard-section">
              <h2>🖼️ Ads — Banner Images</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                Toggle banners on or off. Only <strong>enabled</strong> banners appear in the homepage carousel.
              </p>

              {/* ── Upload form ── */}
              <div style={{
                background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 10,
                padding: '16px 20px', marginBottom: 28, maxWidth: 480,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📤 Upload New Banner</div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
                  Accepts PNG, JPG, WebP, GIF, AVIF · Max 5 MB.<br />
                  Filename will be prefixed with <code>Banner_</code> if it doesn't already start with "Banner".
                </p>

                <label style={{
                  display: 'inline-block', cursor: 'pointer',
                  background: '#fff', border: '1px solid #d1d5db', borderRadius: 6,
                  padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#374151',
                  marginBottom: 12,
                }}>
                  Choose Image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp"
                    style={{ display: 'none' }}
                    onChange={handleAdsFileChange}
                  />
                </label>

                {adsUploadPreview && (
                  <div style={{ marginBottom: 12 }}>
                    <img
                      src={adsUploadPreview}
                      alt="preview"
                      style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 6, border: '1px solid #e5e7eb' }}
                    />
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {adsUploadFile?.name}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    className="submit-button"
                    style={{ padding: '8px 20px', fontSize: 13 }}
                    disabled={!adsUploadFile || adsUploading}
                    onClick={handleUploadBanner}
                  >
                    {adsUploading ? 'Uploading…' : 'Upload'}
                  </button>
                  {adsUploadFile && (
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}
                      onClick={() => { setAdsUploadFile(null); setAdsUploadPreview(null); }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {/* ── Banner grid ── */}
              {allBannerSlides.length === 0 ? (
                <p style={{ color: '#9ca3af' }}>No banner images found. Upload one above.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                  {allBannerSlides.map(({ src, alt, uploaded }) => {
                    const filename = src.replace(/^\//, '');
                    const enabled = bannerStatuses[filename] !== false;
                    const saving = adsSaving === filename;
                    const deleting = deletingBanner === filename;
                    return (
                      <div
                        key={filename}
                        style={{
                          border: `2px solid ${enabled ? '#16a34a' : '#d1d5db'}`,
                          borderRadius: 10,
                          overflow: 'hidden',
                          width: 220,
                          background: enabled ? '#f0fdf4' : '#f9fafb',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}
                      >
                        <div style={{ position: 'relative', height: 120, background: '#e5e7eb' }}>
                          <img
                            src={src}
                            alt={alt}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: enabled ? 1 : 0.4 }}
                          />
                          <span style={{
                            position: 'absolute', top: 6, right: 6,
                            background: enabled ? '#16a34a' : '#6b7280',
                            color: '#fff', fontSize: 11, fontWeight: 700,
                            padding: '2px 8px', borderRadius: 20,
                          }}>
                            {enabled ? 'ENABLED' : 'DISABLED'}
                          </span>
                          {uploaded && (
                            <span style={{
                              position: 'absolute', top: 6, left: 6,
                              background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700,
                              padding: '2px 7px', borderRadius: 20,
                            }}>
                              UPLOADED
                            </span>
                          )}
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, wordBreak: 'break-all' }}>
                            {filename}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              disabled={saving}
                              onClick={() => handleToggleBannerStatus(filename)}
                              style={{
                                flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13,
                                background: enabled ? '#fee2e2' : '#dcfce7',
                                color: enabled ? '#b91c1c' : '#15803d',
                                transition: 'background 0.2s',
                              }}
                            >
                              {saving ? 'Saving…' : enabled ? 'Disable' : 'Enable'}
                            </button>
                            {uploaded && (
                              <button
                                disabled={deleting}
                                onClick={() => handleDeleteUploadedBanner(filename)}
                                style={{
                                  padding: '6px 10px', borderRadius: 6, border: 'none',
                                  cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13,
                                  background: '#fee2e2', color: '#b91c1c',
                                }}
                                title="Delete this uploaded banner"
                              >
                                {deleting ? '…' : '🗑'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'manage' && manageSubTab === 'promos' && (
          <div className="dashboard-section">
            <PromoManager headers={headers} />
          </div>
        )}

        {activeTab === 'reports' && reportSubTab !== 'all-orders' && (() => {
          const ALL_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
          const STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

          const filteredByShipment = reportOrders
            .filter(o => selectedReportShipment === 'all' || o.shipment_id === selectedReportShipment)
            .filter(o => {
              if (!reportTagFilter) return true;
              if (reportTagFilter === 'untagged') return !o.delivery_tag_id;
              return String(o.delivery_tag_id) === reportTagFilter;
            });

          const validOrders = filteredByShipment.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'pending');
          const totalBoxes = validOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, it) => s + (it.qty || 0), 0), 0);

          // Group by location
          const locationMap = {};
          filteredByShipment.forEach(o => {
            const loc = o.delivery_type === 'pickup'
              ? (o.pickup_location_name || `Location #${o.pickup_location_id}`)
              : 'Home Delivery';
            if (!locationMap[loc]) locationMap[loc] = {};
            const st = o.order_status;
            locationMap[loc][st] = (locationMap[loc][st] || 0) + 1;
          });
          const locations = Object.keys(locationMap).sort((a, b) => a.localeCompare(b));

          // Shipments with orders (to show only relevant ones)
          const shipmentsWithOrders = shipments.filter(s =>
            reportOrders.some(o => o.shipment_id === s.id)
          );

          return (
            <div className="dashboard-section">
              {reportLoading ? (
                <MangoLoader text="Loading report data…" />
              ) : (
                <>
                  {/* Shared: Total boxes banner + shipment filters */}
                  <div className="report-total-banner">
                    <span className="report-total-label">Total Valid Boxes</span>
                    <span className="report-total-value">{totalBoxes}</span>
                    <span className="report-total-note">(excludes Cancelled &amp; Pending orders)</span>
                  </div>

                  <div className="report-shipment-filter-bar" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <select
                      value={reportTagFilter}
                      onChange={e => setReportTagFilter(e.target.value)}
                      className="orders-filter-select"
                      style={{ fontSize: 12 }}
                    >
                      <option value="">All Tags</option>
                      <option value="untagged">🚫 Untagged</option>
                      {deliveryTags.map(t => (
                        <option key={t.id} value={String(t.id)}>🏷️ {t.name}</option>
                      ))}
                    </select>
                    <div style={{ width: 1, height: 20, background: '#e5e7eb', margin: '0 4px' }} />
                    <button
                      className={`report-shipment-btn${selectedReportShipment === 'all' ? ' active' : ''}`}
                      onClick={() => setSelectedReportShipment('all')}
                    >
                      All Shipments
                    </button>
                    {shipmentsWithOrders.map(s => (
                      <button
                        key={s.id}
                        className={`report-shipment-btn${selectedReportShipment === s.id ? ' active' : ''}`}
                        onClick={() => setSelectedReportShipment(s.id)}
                      >
                        {s.shipment_ref}
                      </button>
                    ))}
                  </div>

                  {/* ── Orders Summary tab ── */}
                  {reportSubTab === 'orders-summary' && (() => {
                    const toggleSummarySort = col => setSummarySort(p => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));
                    const summaryRows = sortByCol(
                      locations.map(loc => {
                        const row = locationMap[loc];
                        const total = ALL_STATUSES.reduce((s, st) => s + (row[st] || 0), 0);
                        return { loc, ...Object.fromEntries(ALL_STATUSES.map(st => [st, row[st] || 0])), total };
                      }),
                      summarySort.col, summarySort.dir
                    );
                    return locations.length === 0 ? (
                      <p style={{ color: '#9ca3af', marginTop: 16 }}>No orders found for this selection.</p>
                    ) : (
                      <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <button
                          className="report-download-btn"
                          onClick={() => {
                            const shipLabel = selectedReportShipment === 'all' ? 'all-shipments' : `shipment-${selectedReportShipment}`;
                            const headers = ['Location', ...ALL_STATUSES.map(st => STATUS_LABELS[st]), 'Total Orders'];
                            const rows = summaryRows.map(r => [r.loc, ...ALL_STATUSES.map(st => r[st]), r.total]);
                            const totalsRow = ['Total', ...ALL_STATUSES.map(st => locations.reduce((s, loc) => s + (locationMap[loc][st] || 0), 0)), filteredByShipment.length];
                            rows.push(totalsRow);
                            downloadCSV(`orders-summary-${shipLabel}.csv`, headers, rows);
                          }}
                        >
                          ⬇ Download CSV
                        </button>
                      </div>
                      <div className="report-table-wrap">
                        <table className="report-location-table">
                          <thead>
                            <tr>
                              <SortTh label="Location" colKey="loc" sort={summarySort} onSort={toggleSummarySort} />
                              {ALL_STATUSES.map(st => (
                                <SortTh key={st} label={STATUS_LABELS[st]} colKey={st} sort={summarySort} onSort={toggleSummarySort} className={`report-col-${st}`} />
                              ))}
                              <SortTh label="Total Orders" colKey="total" sort={summarySort} onSort={toggleSummarySort} />
                            </tr>
                          </thead>
                          <tbody>
                            {summaryRows.map(r => {
                              const isDrillRow = summaryOrderDrill && summaryOrderDrill.loc === r.loc;
                              return (
                                <tr key={r.loc} className={isDrillRow ? 'type-row-drilled' : ''}>
                                  <td className="report-loc-name">{r.loc}</td>
                                  {ALL_STATUSES.map(st => (
                                    <td key={st} className={`report-count${r[st] ? '' : ' zero'}`}>
                                      {r[st] ? (
                                        <button
                                          className={`type-count-btn${isDrillRow && summaryOrderDrill.status === st ? ' active' : ''}`}
                                          onClick={() => setSummaryOrderDrill(
                                            isDrillRow && summaryOrderDrill.status === st ? null : { loc: r.loc, status: st }
                                          )}
                                        >{r[st]}</button>
                                      ) : 0}
                                    </td>
                                  ))}
                                  <td className="report-row-total">
                                    {r.total ? (
                                      <button
                                        className={`type-count-btn${isDrillRow && summaryOrderDrill.status === 'total' ? ' active' : ''}`}
                                        onClick={() => setSummaryOrderDrill(
                                          isDrillRow && summaryOrderDrill.status === 'total' ? null : { loc: r.loc, status: 'total' }
                                        )}
                                      >{r.total}</button>
                                    ) : 0}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="report-totals-row">
                              <td><strong>Total</strong></td>
                              {ALL_STATUSES.map(st => {
                                const colTotal = locations.reduce((s, loc) => s + (locationMap[loc][st] || 0), 0);
                                return <td key={st} className="report-count"><strong>{colTotal}</strong></td>;
                              })}
                              <td className="report-row-total"><strong>{filteredByShipment.length}</strong></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {summaryOrderDrill && (() => {
                        const { loc, status } = summaryOrderDrill;
                        const drillOrders = filteredByShipment.filter(o => {
                          const oLoc = o.delivery_type === 'pickup'
                            ? (o.pickup_location_name || `Location #${o.pickup_location_id}`)
                            : 'Home Delivery';
                          if (oLoc !== loc) return false;
                          if (status === 'total') return true;
                          return o.order_status === status;
                        });
                        const statusLabel = status === 'total' ? 'All Statuses' : STATUS_LABELS[status];
                        return (
                          <div className="type-drill-panel">
                            <div className="type-drill-header">
                              <span><strong>{loc}</strong> — {statusLabel} · {drillOrders.length} order{drillOrders.length !== 1 ? 's' : ''}</span>
                              <button className="type-drill-close" onClick={() => setSummaryOrderDrill(null)}>✕ Close</button>
                            </div>
                            {drillOrders.length === 0 ? (
                              <p style={{ color: '#9ca3af', padding: '12px 0' }}>No orders found.</p>
                            ) : (
                              <div style={{ overflowX: 'auto' }}>
                                <table className="shipment-table orders-table" style={{ marginTop: 0 }}>
                                  <thead>
                                    <tr>
                                      <th>Order Ref</th>
                                      <th>Customer</th>
                                      <th>Status</th>
                                      <th>Items</th>
                                      <th>Total</th>
                                      <th>Mode</th>
                                      <th>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {drillOrders.map(o => {
                                      const allItemsSummary = (o.items || []).map(it => `${it.variant} ×${it.qty}`).join(', ');
                                      const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString() : '—';
                                      return (
                                        <tr key={o.id}>
                                          <td><strong>{o.order_ref}</strong></td>
                                          <td>{o.customer_name}</td>
                                          <td>
                                            <span className={`status-badge status-${o.order_status}`}>
                                              {STATUS_LABELS[o.order_status] || o.order_status}
                                            </span>
                                          </td>
                                          <td style={{ fontSize: 12, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.4 }}>{allItemsSummary}</td>
                                          <td>${o.total_price}</td>
                                          <td>{o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}</td>
                                          <td style={{ fontSize: 12, color: '#6b7280' }}>{dateStr}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      </>
                    );
                  })()}

                  {/* ── Orders by Type tab ── */}
                  {reportSubTab === 'orders-by-type' && (() => {
                    // Build product map: variant name → { status → box qty }
                    const productMap = {};
                    filteredByShipment.forEach(o => {
                      (o.items || []).forEach(it => {
                        const name = it.variant || 'Unknown';
                        if (!productMap[name]) {
                          productMap[name] = {};
                          ALL_STATUSES.forEach(st => { productMap[name][st] = 0; });
                        }
                        productMap[name][o.order_status] = (productMap[name][o.order_status] || 0) + (it.qty || 0);
                      });
                    });
                    const productNames = Object.keys(productMap).sort();
                    const toggleTypeSort = col => setTypeSort(p => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));
                    const typeRows = sortByCol(
                      productNames.map(name => {
                        const row = productMap[name];
                        const total = ALL_STATUSES.reduce((s, st) => s + (row[st] || 0), 0);
                        const valid = (row.confirmed || 0) + (row.shipped || 0) + (row.delivered || 0);
                        return { name, ...Object.fromEntries(ALL_STATUSES.map(st => [st, row[st] || 0])), total, valid };
                      }),
                      typeSort.col, typeSort.dir
                    );
                    return productNames.length === 0 ? (
                      <p style={{ color: '#9ca3af', marginTop: 16 }}>No orders found for this selection.</p>
                    ) : (
                      <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <button
                          className="report-download-btn"
                          onClick={() => {
                            const shipLabel = selectedReportShipment === 'all' ? 'all-shipments' : `shipment-${selectedReportShipment}`;
                            const headers = ['Product', ...ALL_STATUSES.map(st => `${STATUS_LABELS[st]} Boxes`), 'Total Boxes', 'Valid Boxes'];
                            const rows = typeRows.map(r => [r.name, ...ALL_STATUSES.map(st => r[st]), r.total, r.valid]);
                            const totalsRow = [
                              'Total',
                              ...ALL_STATUSES.map(st => productNames.reduce((s, n) => s + (productMap[n][st] || 0), 0)),
                              productNames.reduce((s, n) => s + ALL_STATUSES.reduce((ss, st) => ss + (productMap[n][st] || 0), 0), 0),
                              totalBoxes,
                            ];
                            rows.push(totalsRow);
                            downloadCSV(`orders-by-type-${shipLabel}.csv`, headers, rows);
                          }}
                        >
                          ⬇ Download CSV
                        </button>
                      </div>
                      <div className="report-table-wrap">
                        <table className="report-location-table">
                          <thead>
                            <tr>
                              <SortTh label="Product" colKey="name" sort={typeSort} onSort={toggleTypeSort} />
                              {ALL_STATUSES.map(st => (
                                <SortTh key={st} label={`${STATUS_LABELS[st]} Boxes`} colKey={st} sort={typeSort} onSort={toggleTypeSort} className={`report-col-${st}`} />
                              ))}
                              <SortTh label="Total Boxes" colKey="total" sort={typeSort} onSort={toggleTypeSort} />
                              <SortTh label="Valid Boxes" colKey="valid" sort={typeSort} onSort={toggleTypeSort} />
                            </tr>
                          </thead>
                          <tbody>
                            {typeRows.map(r => {
                              const isDrillRow = typeOrderDrill && typeOrderDrill.variantName === r.name;
                              return (
                                <tr key={r.name} className={isDrillRow ? 'type-row-drilled' : ''}>
                                  <td className="report-loc-name">{r.name}</td>
                                  {ALL_STATUSES.map(st => (
                                    <td key={st} className={`report-count${r[st] ? '' : ' zero'}`}>
                                      {r[st] ? (
                                        <button
                                          className={`type-count-btn${isDrillRow && typeOrderDrill.status === st ? ' active' : ''}`}
                                          onClick={() => setTypeOrderDrill(
                                            isDrillRow && typeOrderDrill.status === st ? null : { variantName: r.name, status: st }
                                          )}
                                        >{r[st]}</button>
                                      ) : 0}
                                    </td>
                                  ))}
                                  <td className="report-row-total">
                                    {r.total ? (
                                      <button
                                        className={`type-count-btn${isDrillRow && typeOrderDrill.status === 'total' ? ' active' : ''}`}
                                        onClick={() => setTypeOrderDrill(
                                          isDrillRow && typeOrderDrill.status === 'total' ? null : { variantName: r.name, status: 'total' }
                                        )}
                                      >{r.total}</button>
                                    ) : 0}
                                  </td>
                                  <td className="report-row-total" style={{ color: '#16a34a' }}>
                                    {r.valid ? (
                                      <button
                                        className={`type-count-btn green${isDrillRow && typeOrderDrill.status === 'valid' ? ' active' : ''}`}
                                        onClick={() => setTypeOrderDrill(
                                          isDrillRow && typeOrderDrill.status === 'valid' ? null : { variantName: r.name, status: 'valid' }
                                        )}
                                      >{r.valid}</button>
                                    ) : 0}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="report-totals-row">
                              <td><strong>Total</strong></td>
                              {ALL_STATUSES.map(st => {
                                const colTotal = productNames.reduce((s, n) => s + (productMap[n][st] || 0), 0);
                                return <td key={st} className="report-count"><strong>{colTotal}</strong></td>;
                              })}
                              <td className="report-row-total">
                                <strong>{productNames.reduce((s, n) => s + ALL_STATUSES.reduce((ss, st) => ss + (productMap[n][st] || 0), 0), 0)}</strong>
                              </td>
                              <td className="report-row-total" style={{ color: '#16a34a' }}>
                                <strong>{totalBoxes}</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {typeOrderDrill && (() => {
                        const { variantName, status } = typeOrderDrill;
                        const validStatuses = ['confirmed', 'shipped', 'delivered'];
                        const drillOrders = filteredByShipment.filter(o => {
                          if (!(o.items || []).some(it => it.variant === variantName)) return false;
                          if (status === 'total') return true;
                          if (status === 'valid') return validStatuses.includes(o.order_status);
                          return o.order_status === status;
                        });
                        const statusLabel = status === 'total'
                          ? 'All Statuses'
                          : status === 'valid'
                            ? 'Valid (Confirmed + Shipped + Delivered)'
                            : STATUS_LABELS[status];
                        return (
                          <div className="type-drill-panel">
                            <div className="type-drill-header">
                              <span><strong>{variantName}</strong> — {statusLabel} · {drillOrders.length} order{drillOrders.length !== 1 ? 's' : ''}</span>
                              <button className="type-drill-close" onClick={() => setTypeOrderDrill(null)}>✕ Close</button>
                            </div>
                            {drillOrders.length === 0 ? (
                              <p style={{ color: '#9ca3af', padding: '12px 0' }}>No orders found.</p>
                            ) : (
                              <div style={{ overflowX: 'auto' }}>
                                <table className="shipment-table orders-table" style={{ marginTop: 0 }}>
                                  <thead>
                                    <tr>
                                      <th>Order Ref</th>
                                      <th>Customer</th>
                                      <th>Status</th>
                                      <th>Qty ({variantName})</th>
                                      <th>All Items</th>
                                      <th>Total</th>
                                      <th>Type</th>
                                      <th>Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {drillOrders.map(o => {
                                      const variantQty = (o.items || [])
                                        .filter(it => it.variant === variantName)
                                        .reduce((s, it) => s + (it.qty || 0), 0);
                                      const allItemsSummary = (o.items || []).map(it => `${it.variant} ×${it.qty}`).join(', ');
                                      const dateStr = o.created_at ? new Date(o.created_at).toLocaleDateString() : '—';
                                      return (
                                        <tr key={o.id}>
                                          <td><strong>{o.order_ref}</strong></td>
                                          <td>{o.customer_name}</td>
                                          <td>
                                            <span className={`status-badge status-${o.order_status}`}>
                                              {STATUS_LABELS[o.order_status] || o.order_status}
                                            </span>
                                          </td>
                                          <td><strong>{variantQty}</strong></td>
                                          <td style={{ fontSize: 12, maxWidth: 220, whiteSpace: 'normal', lineHeight: 1.4 }}>{allItemsSummary}</td>
                                          <td>${o.total_price}</td>
                                          <td>{o.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}</td>
                                          <td style={{ fontSize: 12, color: '#6b7280' }}>{dateStr}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
