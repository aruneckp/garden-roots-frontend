import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import PickupLocationManager from './PickupLocationManager';
import PaymentTracker from './PaymentTracker';

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
  const [loadingVariants, setLoadingVariants] = useState(false);

  const token = localStorage.getItem('admin_token');
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

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/dashboard/summary', {
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
      const response = await fetch('http://localhost:8000/api/v1/admin/shipments', {
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
        `http://localhost:8000/api/v1/admin/shipments/${shipmentId}/summary`,
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
      const response = await fetch('http://localhost:8000/api/v1/products');
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
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/variants`);
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
      const response = await fetch('http://localhost:8000/api/v1/admin/shipments', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create shipment');
      e.target.reset();
      setProductVariants([]);
      setVarietyBoxCounts({});
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
    localStorage.removeItem('admin_token');
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
