import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { API_BASE } from '../services/api';
import MangoLoader from './MangoLoader';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  succeeded: '#10b981',
  pending:   '#f59e0b',
  failed:    '#ef4444',
  cancelled: '#6b7280',
  unknown:   '#a78bfa',
};

export default function PaymentTracker({ onOrderClick }) {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    shipment_box_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_ref: '',
    description: '',
  });

  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'pending') {
      fetchPendingPayments();
    } else if (activeTab === 'by-shipment') {
      fetchShipments();
    }
  }, [activeTab]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/payments/dashboard`, { headers });
      if (!response.ok) throw new Error('Failed to fetch payment dashboard');
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
      const response = await fetch(`${API_BASE}/api/v1/admin/shipments`, { headers });
      if (!response.ok) throw new Error('Failed to fetch shipments');
      const data = await response.json();
      setShipments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSummary = async (shipmentId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/admin/shipments/${shipmentId}/payments`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setPaymentSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch payment summary:', err);
    }
  };

  const fetchPendingPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/admin/payments/pending`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to fetch pending payments');
      const data = await response.json();
      setPendingPayments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePieClick = (data) => {
    if (!data || !data.status) return;
    if (data.status === 'pending') {
      setActiveTab('pending');
    } else {
      setActiveTab('by-shipment');
    }
  };

  const handleShipmentClick = (shipment) => {
    setSelectedShipment(shipment);
    fetchPaymentSummary(shipment.id);
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value
    }));
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(paymentData),
      });
      if (!response.ok) throw new Error('Failed to record payment');
      alert('Payment recorded successfully!');
      setPaymentData({
        shipment_box_id: '',
        amount: '',
        payment_method: 'cash',
        transaction_ref: '',
        description: '',
      });
      setShowPaymentForm(false);
      if (selectedShipment) {
        await fetchPaymentSummary(selectedShipment.id);
      }
      await fetchPendingPayments();
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-tracker">
      <h2>💰 Payment Tracker</h2>

      {error && <div className="error-banner">⚠️ {error}</div>}
      {loading && <MangoLoader text="Loading payments…" />}

      <div className="admin-nav">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          ⏳ Pending Payments
        </button>
        <button
          className={`nav-tab ${activeTab === 'by-shipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('by-shipment')}
        >
          📦 By Shipment
        </button>
      </div>

      {activeTab === 'dashboard' && dashboardData && !loading && (
        <div className="payment-dashboard-section">
          <div className="dash-row" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 20 }}>

            {/* Payment Status Pie Chart */}
            <div className="dash-chart-card" style={{ flex: '1 1 300px' }}>
              <h3 className="dash-chart-title">Payment Status</h3>
              <p style={{ fontSize: 11, color: '#888', margin: '-4px 0 8px', textAlign: 'center' }}>
                Click a slice to view payments
              </p>
              {dashboardData.payment_status.length === 0 ? (
                <p className="no-data">No order data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={dashboardData.payment_status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={95}
                      paddingAngle={3}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                      onClick={handlePieClick}
                      cursor="pointer"
                    >
                      {dashboardData.payment_status.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_COLORS[entry.status] || '#60a5fa'}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [val, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Owners Bar Chart */}
            <div className="dash-chart-card" style={{ flex: '1 1 300px' }}>
              <h3 className="dash-chart-title">Payments by Owner</h3>
              {dashboardData.payment_owners.length === 0 ? (
                <p className="no-data">No owner data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={dashboardData.payment_owners}
                    margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="owner"
                      tick={{ fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>
        </div>
      )}

      {activeTab === 'pending' && pendingPayments && !loading && (
        <div className="pending-payments-section">
          <div className="payment-summary-header">
            <div className="summary-stat">
              <span className="label">Pending Records:</span>
              <span className="value">{pendingPayments.pending_records}</span>
            </div>
            <div className="summary-stat">
              <span className="label">Total Pending:</span>
              <span className="value" style={{ color: '#f59e0b' }}>
                ₹{pendingPayments.total_pending_amount.toFixed(2)}
              </span>
            </div>
          </div>

          {pendingPayments.pending_records === 0 ? (
            <p className="no-data">✅ No pending payments! All collected.</p>
          ) : (
            <div className="payment-details-list">
              {pendingPayments.details.map((payment) => (
                <div key={payment.order_id} className="payment-item">
                  <div className="payment-info">
                    {onOrderClick ? (
                      <button
                        className="order-ref-link"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#16a34a', textDecoration: 'underline dotted', fontWeight: 700, fontSize: 'inherit' }}
                        onClick={() => onOrderClick(payment.order_id)}
                      >
                        {payment.order_ref}
                      </button>
                    ) : (
                      <strong>{payment.order_ref}</strong>
                    )}
                    <span className="payment-badge pending">To Be Received</span>
                  </div>
                  <p><strong>👤 Customer:</strong> {payment.customer_name}{payment.customer_phone ? ` · ${payment.customer_phone}` : ''}</p>
                  <p><strong>💵 Amount:</strong> ₹{payment.amount.toFixed(2)}</p>
                  {payment.payment_received_by && (
                    <p><strong>🧑‍💼 Assigned to:</strong> {payment.payment_received_by}</p>
                  )}
                  <p><strong>📅 Date:</strong> {new Date(payment.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'by-shipment' && !loading && (
        <div className="by-shipment-section">
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
                    </div>
                    <span className={`status-badge status-${shipment.status}`}>
                      {shipment.status.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleShipmentClick(shipment)}
                    className="view-details-button"
                  >
                    💰 View Payments
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedShipment && paymentSummary && (
            <div className="modal-overlay" onClick={() => setSelectedShipment(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                  className="close-button"
                  onClick={() => setSelectedShipment(null)}
                >
                  ✕
                </button>

                <h2>💰 {selectedShipment.shipment_ref} - Payment Summary</h2>

                <div className="payment-stats">
                  <div className="stat-card">
                    <h3>Total Records</h3>
                    <p className="stat-value">{paymentSummary.total_payment_records}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Pending</h3>
                    <p className="stat-value" style={{ color: '#f59e0b' }}>
                      {paymentSummary.pending_count}
                    </p>
                  </div>
                  <div className="stat-card">
                    <h3>Paid</h3>
                    <p className="stat-value" style={{ color: '#10b981' }}>
                      {paymentSummary.paid_count}
                    </p>
                  </div>
                  <div className="stat-card">
                    <h3>Collection %</h3>
                    <p className="stat-value" style={{ color: '#3b82f6' }}>
                      {paymentSummary.collection_percentage}%
                    </p>
                  </div>
                </div>

                <div className="payment-summary">
                  <div className="summary-item">
                    <span className="label">Pending Amount:</span>
                    <span className="amount" style={{ color: '#f59e0b' }}>
                      ₹{paymentSummary.pending_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Paid Amount:</span>
                    <span className="amount" style={{ color: '#10b981' }}>
                      ₹{paymentSummary.paid_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="summary-item" style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                    <span className="label"><strong>Total Amount:</strong></span>
                    <span className="amount"><strong>₹{paymentSummary.total_amount.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className="progress-bar" style={{ marginTop: '20px' }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${paymentSummary.collection_percentage}%` }}
                  ></div>
                </div>
                <p style={{ textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '12px' }}>
                  {paymentSummary.collection_percentage}% Collected
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
