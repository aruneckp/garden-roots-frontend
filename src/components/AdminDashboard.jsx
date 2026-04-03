import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import PickupLocationManager from './PickupLocationManager';
import PaymentTracker from './PaymentTracker';
import { API_BASE } from '../services/api';

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

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shipmentSummary, setShipmentSummary] = useState(null);
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
  const [expandedOrderId, setExpandedOrderId] = useState(null);
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

  const token = localStorage.getItem('user_token');
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
    if (activeTab === 'shipments') {
      fetchShipments();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'create') {
      fetchAllProducts();
    }
  }, [activeTab]);

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
      fetchAdminPickupLocations();
      fetchDeliveryBoys();
      if (shipments.length === 0) fetchShipments();
    }
  }, [activeTab]);

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
    } catch (err) {
      alert('Failed to update shipment: ' + err.message);
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
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Failed'); }
      const data = await res.json();
      setBulkResult({ success: true, message: `Updated ${data.count} order(s) to "${data.new_status}" by ${data.changed_by}` });
      setOrderSelectedIds([]);
      setBulkStatus('');
      setBulkNote('');
      fetchAllOrders();
    } catch (err) {
      setBulkResult({ success: false, message: err.message });
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
    } catch (err) { setDbError(err.message); }
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
    } catch (err) { setAssignResult({ error: err.message }); }
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

  const fetchShipmentSummary = async (shipmentId) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/admin/shipments/${shipmentId}/summary`,
        { headers }
      );
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', errorData);
        throw new Error(`Failed to fetch summary: ${response.status}`);
      }
      const data = await response.json();
      console.log('Shipment Summary Data:', data);
      setShipmentSummary(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      setShipmentSummary(null);
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

  const handleViewDetails = (shipment) => {
    setSelectedShipment(shipment);
    fetchShipmentSummary(shipment.id);
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
      alert('Shipment created successfully!');
      fetchShipments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('admin_user');
    onLogout();
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-content">
          <h1>🌿 Garden Roots Admin</h1>
          <div className="user-info">
            <span>{user.username}</span>
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
          className={`nav-tab ${activeTab === 'shipments' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipments')}
        >
          📦 Shipments
        </button>
        <button
          className={`nav-tab ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          📍 Locations
        </button>
        <button
          className={`nav-tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💰 Payments
        </button>
        <button
          className={`nav-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Create
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
        {loading && !shipmentSummary && <div className="loading">⏳ Loading...</div>}

        {activeTab === 'dashboard' && dashboardData && !loading && (
          <div className="dashboard-section">
            <h2>📈 Shipment Summary Dashboard</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Shipments</h3>
                <p className="stat-value">{dashboardData.total_shipments}</p>
              </div>
              <div className="stat-card">
                <h3>✅ Completed</h3>
                <p className="stat-value" style={{ color: '#22c55e' }}>
                  {dashboardData.completed_shipments}
                </p>
              </div>
              <div className="stat-card">
                <h3>⏳ Pending</h3>
                <p className="stat-value" style={{ color: '#f59e0b' }}>
                  {dashboardData.pending_shipments}
                </p>
              </div>
              <div className="stat-card">
                <h3>🚚 In Transit</h3>
                <p className="stat-value" style={{ color: '#3b82f6' }}>
                  {dashboardData.in_transit_shipments}
                </p>
              </div>
              <div className="stat-card">
                <h3>📦 Total Boxes</h3>
                <p className="stat-value">{dashboardData.total_boxes}</p>
              </div>
              <div className="stat-card">
                <h3>💰 Revenue</h3>
                <p className="stat-value" style={{ color: '#10b981' }}>
                  ₹{dashboardData.total_delivery_revenue.toFixed(2)}
                </p>
              </div>
            </div>

            <h3 style={{ marginTop: '30px' }}>📋 Shipment Summary</h3>
            <table className="shipment-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Total Boxes</th>
                  <th>Direct</th>
                  <th>Collection</th>
                  <th>Damaged</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.shipment_summaries && dashboardData.shipment_summaries.map((summary) => (
                  <tr key={summary.shipment_ref}>
                    <td><strong>{summary.shipment_ref}</strong></td>
                    <td>{summary.total_boxes}</td>
                    <td>{summary.direct_delivery}</td>
                    <td>{summary.self_collection}</td>
                    <td>{summary.damaged}</td>
                    <td>₹{summary.revenue.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-${summary.status}`}>
                        {summary.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'shipments' && !loading && (
          <div className="shipments-section">
            <h2>📦 All Shipments</h2>

            <div className="shipments-list">
              {shipments.length === 0 ? (
                <p>No shipments found</p>
              ) : (
                shipments.map((shipment) => (
                  <div key={shipment.id} className="shipment-card">
                    <div className="shipment-header">
                      <div>
                        <h3>{shipment.shipment_ref}</h3>
                        <p>📦 Total Boxes: {shipment.total_boxes}</p>
                        {shipment.variety_names && shipment.variety_names.length > 0 && (
                          <p className="shipment-varieties">🍋 Varieties: {shipment.variety_names.join(', ')}</p>
                        )}
                        {shipment.notes && <p className="shipment-notes">📝 {shipment.notes}</p>}
                      </div>
                      <span className={`status-badge status-${shipment.status}`}>
                        {shipment.status.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewDetails(shipment)}
                      className="view-details-button"
                    >
                      👁️ View Details
                    </button>
                  </div>
                ))
              )}
            </div>

            {selectedShipment && shipmentSummary && (
              <div className="modal-overlay" onClick={() => setSelectedShipment(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="close-button"
                    onClick={() => setSelectedShipment(null)}
                  >
                    ✕
                  </button>

                  <h2>📦 {shipmentSummary.shipment_ref} - Details</h2>

                    <div className="summary-stats">
                    <div className="summary-stat">
                      <label>Total Boxes:</label>
                      <span>{shipmentSummary.total_boxes || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <label>Direct Delivery:</label>
                      <span style={{ color: '#2d5a3d', fontWeight: 'bold' }}>{shipmentSummary.boxes_delivered_direct || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <label>Self Collection:</label>
                      <span>{shipmentSummary.boxes_collected_self || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <label>Damaged:</label>
                      <span>{shipmentSummary.boxes_damaged || 0}</span>
                    </div>
                    <div className="summary-stat">
                      <label>Total Revenue:</label>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{(shipmentSummary.total_delivery_revenue || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {shipmentSummary.varieties && shipmentSummary.varieties.length > 0 && (
                    <div className="varieties-section">
                      <h3>🍋 Mango Varieties in This Shipment</h3>
                      <table className="varieties-table">
                        <thead>
                          <tr>
                            <th>Variety</th>
                            <th>Boxes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shipmentSummary.varieties.map((v, idx) => (
                            <tr key={idx}>
                              <td><strong>{v.variety_name}</strong></td>
                              <td>{v.box_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {shipmentSummary.spoc_contact && (
                    <div className="spoc-section">
                      <h3>👤 SPOC Contact</h3>
                      <div className="contact-details">
                        <p><strong>Name:</strong> {shipmentSummary.spoc_contact.name}</p>
                        <p><strong>Phone:</strong> <a href={`tel:${shipmentSummary.spoc_contact.phone}`}>{shipmentSummary.spoc_contact.phone}</a></p>
                        <p><strong>Email:</strong> <a href={`mailto:${shipmentSummary.spoc_contact.email}`}>{shipmentSummary.spoc_contact.email}</a></p>
                        <p><strong>Location:</strong> {shipmentSummary.spoc_contact.location}</p>
                      </div>
                    </div>
                  )}

                  <h3>📍 Delivery Summary by Location</h3>
                  {shipmentSummary.summary_by_location && shipmentSummary.summary_by_location.length > 0 ? (
                    <table className="location-table">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Boxes</th>
                          <th>Direct</th>
                          <th>Collection</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipmentSummary.summary_by_location.map((loc, idx) => (
                          <tr key={idx}>
                            <td><strong>{loc.location}</strong></td>
                            <td>{loc.boxes_count}</td>
                            <td style={{ color: '#2d5a3d', fontWeight: 'bold' }}>{loc.direct_delivery_count}</td>
                            <td>{loc.self_collection_count}</td>
                            <td>₹{(loc.total_revenue || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="no-data">No location data available</p>
                  )}

                  <h3>📦 Delivery Details ({shipmentSummary.delivery_locations?.length || 0} entries)</h3>
                  {shipmentSummary.delivery_locations && shipmentSummary.delivery_locations.length > 0 ? (
                    <div className="delivery-details-list">
                      {shipmentSummary.delivery_locations.slice(0, 20).map((delivery, idx) => (
                        <div key={idx} className="delivery-item">
                          <div className="delivery-info">
                            <strong>{delivery.box_number}</strong>
                            <span className={`delivery-type ${delivery.delivery_type === 'Direct Delivery' ? 'direct' : 'collection'}`}>
                              {delivery.delivery_type}
                            </span>
                          </div>
                          <p><strong>📍 Location:</strong> {delivery.location}</p>
                          <p><strong>👤 Receiver:</strong> {delivery.receiver}</p>
                          <p><strong>📱 Phone:</strong> {delivery.phone}</p>
                          {delivery.delivery_date && <p><strong>📅 Date:</strong> {new Date(delivery.delivery_date).toLocaleDateString()}</p>}
                          <p><strong>💰 Charge:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{delivery.charge.toFixed(2)}</span></p>
                        </div>
                      ))}
                      {shipmentSummary.delivery_locations.length > 20 && (
                        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
                          ... and {shipmentSummary.delivery_locations.length - 20} more deliveries
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="no-data">No deliveries logged yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'locations' && !loading && (
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
            <h2>📋 All Orders</h2>

            {/* ── Filter panel ── */}
            <div className="orders-filter-panel">
              <div className="orders-filter-row">
                <select value={orderFilters.delivery_type} onChange={e => handleOrderFilterChange('delivery_type', e.target.value)} className="orders-filter-select">
                  <option value="">All Modes</option>
                  <option value="delivery">Home Delivery</option>
                  <option value="pickup">Self Pickup</option>
                </select>

                <select value={orderFilters.payment_status} onChange={e => handleOrderFilterChange('payment_status', e.target.value)} className="orders-filter-select">
                  <option value="">All Payment</option>
                  <option value="pending">Pending</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                </select>

                <select value={orderFilters.order_status} onChange={e => handleOrderFilterChange('order_status', e.target.value)} className="orders-filter-select">
                  <option value="">All Order Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select value={orderFilters.pickup_location_id} onChange={e => handleOrderFilterChange('pickup_location_id', e.target.value)} className="orders-filter-select">
                  <option value="">All Locations</option>
                  {adminPickupLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="orders-filter-row">
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

                <select value={orderFilters.payment_method} onChange={e => handleOrderFilterChange('payment_method', e.target.value)} className="orders-filter-select">
                  <option value="">All Pay Methods</option>
                  <option value="card">Card</option>
                  <option value="paynow">PayNow</option>
                  <option value="cash">Cash</option>
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
                            style={{ cursor: 'pointer', background: isSelected ? '#f0fdf4' : undefined }}
                          >
                            <td onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleOrderRowSelect(o.id)} />
                            </td>
                            <td onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}>
                              <strong className="order-ref-link">{o.order_ref}</strong>
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
                            <td style={{ fontSize: 12 }}>{o.payment_method || '—'}</td>
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
                <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
                  Showing {allOrders.length} order(s) · {orderSelectedIds.length} selected
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && !loading && (
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
    </div>
  );
}
