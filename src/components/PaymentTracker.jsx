import { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { API_BASE } from '../services/api';

export default function PaymentTracker() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [pendingPayments, setPendingPayments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    shipment_box_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_ref: '',
    description: '',
  });

  const token = localStorage.getItem('admin_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingPayments();
    } else if (activeTab === 'by-shipment') {
      fetchShipments();
    }
  }, [activeTab]);

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
      {loading && <div className="loading">⏳ Loading...</div>}

      <div className="admin-nav">
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
                <div key={payment.payment_id} className="payment-item">
                  <div className="payment-info">
                    <strong>{payment.shipment_ref}</strong>
                    <span className="payment-badge pending">Pending</span>
                  </div>
                  <p><strong>📦 Box:</strong> {payment.box_number}</p>
                  <p><strong>💵 Amount:</strong> ₹{payment.amount.toFixed(2)}</p>
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
