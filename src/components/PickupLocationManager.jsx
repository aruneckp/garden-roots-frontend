import { useState, useEffect, useRef } from 'react';
import './AdminDashboard.css';
import { API_BASE } from '../services/api';
import MangoLoader from './MangoLoader';

const EMPTY_FORM = {
  name: '',
  address: '',
  phone: '',
  whatsapp_phone: '',
  email: '',
  manager_name: '',
  location_type: 'retail',
  capacity: 100,
  collection_hours: '',
  notes: '',
};

export default function PickupLocationManager() {
  const [locations, setLocations] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (showForm) firstInputRef.current?.focus();
  }, [showForm]);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [formData, setFormData] = useState(EMPTY_FORM);

  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/pickup-locations`, { headers });
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) : value
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
    setError('');
  };

  const openEditForm = (location) => {
    setEditingId(location.id);
    setFormData({
      name: location.name || '',
      address: location.address || '',
      phone: location.phone || '',
      whatsapp_phone: location.whatsapp_phone || '',
      email: location.email || '',
      manager_name: location.manager_name || '',
      location_type: location.location_type || 'retail',
      capacity: location.capacity || 100,
      collection_hours: location.collection_hours || '',
      notes: location.notes || '',
    });
    setShowForm(true);
    setError('');
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = editingId
        ? `${API_BASE}/api/v1/admin/pickup-locations/${editingId}`
        : `${API_BASE}/api/v1/admin/pickup-locations`;
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, { method, headers, body: JSON.stringify(formData) });
      if (!response.ok) throw new Error(editingId ? 'Failed to update location' : 'Failed to create location');
      cancelForm();
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (locationId, locationName) => {
    if (!window.confirm(`Delete "${locationName}"? This cannot be undone.`)) return;
    setDeletingId(locationId);
    try {
      const response = await fetch(`${API_BASE}/api/v1/admin/pickup-locations/${locationId}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete location');
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getOccupancy = async (locationId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/admin/pickup-locations/${locationId}/occupancy`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedLocation(data);
      }
    } catch (err) {
      console.error('Failed to get occupancy:', err);
    }
  };

  return (
    <div className="location-manager">
      <div className="location-header">
        <h2>📍 Pickup Location Manager</h2>
        <button className="submit-button" onClick={showForm ? cancelForm : openAddForm}>
          {showForm ? '✕ Cancel' : '➕ Add Location'}
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}
      {loading && <MangoLoader text="Loading locations…" />}

      {showForm && (
        <form onSubmit={handleSubmit} className="create-form">
          <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>
            {editingId ? '✏️ Edit Location' : '➕ New Location'}
          </h3>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="name">Location Name *</label>
              <input
                ref={firstInputRef}
                id="name" name="name" value={formData.name}
                onChange={handleInputChange} placeholder="e.g., Mumbai Central Showroom" required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="location_type">Type</label>
              <select name="location_type" value={formData.location_type} onChange={handleInputChange}>
                <option value="retail">Retail Store</option>
                <option value="warehouse">Warehouse</option>
                <option value="franchise">Franchise</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Address *</label>
            <input
              id="address" name="address" value={formData.address}
              onChange={handleInputChange} placeholder="Full address" required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Contact number" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="whatsapp_phone">WhatsApp Number</label>
              <input id="whatsapp_phone" name="whatsapp_phone" value={formData.whatsapp_phone} onChange={handleInputChange} placeholder="e.g. 6581601289 (no + or spaces)" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="Email address" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="manager_name">Manager Name</label>
              <input id="manager_name" name="manager_name" value={formData.manager_name} onChange={handleInputChange} placeholder="Location manager" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="capacity">Capacity (boxes)</label>
              <input id="capacity" name="capacity" type="number" min="1" value={formData.capacity} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="collection_hours">Collection Hours</label>
            <input
              id="collection_hours" name="collection_hours" value={formData.collection_hours}
              onChange={handleInputChange} placeholder="e.g. Mon–Sat: 10 AM – 10 PM"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any special notes about this location" rows="3" />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="submit-button" disabled={loading}>
              {editingId ? '💾 Save Changes' : '✅ Create Location'}
            </button>
            <button type="button" onClick={cancelForm}
              style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="locations-grid">
        {locations.length === 0 ? (
          <p>No pickup locations found. Create one to get started!</p>
        ) : (
          locations.map(location => {
            const isOpen = expandedIds.has(location.id);
            return (
              <div key={location.id} className="location-card">
                <div
                  className="location-header-card"
                  onClick={() => toggleExpand(location.id)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <h3 style={{ margin: 0 }}>
                    {location.location_type === 'retail' && '🏪'}
                    {location.location_type === 'warehouse' && '🏭'}
                    {location.location_type === 'franchise' && '🏢'}
                    {' '}{location.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="location-type-badge">{location.location_type}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <>
                    <div className="location-details">
                      <p><strong>📍 Address:</strong> {location.address}</p>
                      <p><strong>📱 Phone:</strong> {location.phone || 'N/A'}</p>
                      <p><strong>💬 WhatsApp:</strong> {location.whatsapp_phone || 'N/A'}</p>
                      <p><strong>📧 Email:</strong> {location.email || 'N/A'}</p>
                      <p><strong>👤 Manager:</strong> {location.manager_name || 'N/A'}</p>
                      <p><strong>🕐 Collection Hours:</strong> {location.collection_hours || 'N/A'}</p>

                      <div className="capacity-bar">
                        <p><strong>Capacity: {location.capacity} boxes</strong></p>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(location.current_boxes / location.capacity * 100) || 0}%` }}
                          />
                        </div>
                        <p className="capacity-text">Currently: {location.current_boxes} boxes ({Math.round((location.current_boxes / location.capacity * 100) || 0)}%)</p>
                      </div>

                      {location.notes && <p><strong>📝 Notes:</strong> {location.notes}</p>}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="view-details-button" onClick={() => getOccupancy(location.id)}>
                        📊 View Occupancy
                      </button>
                      <button
                        className="view-details-button"
                        style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}
                        onClick={() => openEditForm(location)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="view-details-button"
                        style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                        onClick={() => handleDelete(location.id, location.name)}
                        disabled={deletingId === location.id}
                      >
                        {deletingId === location.id ? '...' : '🗑 Delete'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedLocation && (
        <div className="modal-overlay" onClick={() => setSelectedLocation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedLocation(null)}>✕</button>
            <h2>📊 {selectedLocation.location_name} - Occupancy</h2>

            <div className="occupancy-grid">
              <div className="stat-card">
                <h3>Total Capacity</h3>
                <p className="stat-value">{selectedLocation.capacity}</p>
              </div>
              <div className="stat-card">
                <h3>Boxes Stored</h3>
                <p className="stat-value">{selectedLocation.boxes_stored}</p>
              </div>
              <div className="stat-card">
                <h3>Occupancy</h3>
                <p className="stat-value" style={{ color: '#10b981' }}>
                  {selectedLocation.occupancy_percentage}%
                </p>
              </div>
              <div className="stat-card">
                <h3>Pending</h3>
                <p className="stat-value" style={{ color: '#f59e0b' }}>
                  {selectedLocation.pending_boxes}
                </p>
              </div>
              <div className="stat-card">
                <h3>In Transit</h3>
                <p className="stat-value" style={{ color: '#3b82f6' }}>
                  {selectedLocation.in_transit_boxes}
                </p>
              </div>
            </div>

            <div className="capacity-bar" style={{ marginTop: '20px' }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${selectedLocation.occupancy_percentage}%` }} />
              </div>
              <p style={{ textAlign: 'center', marginTop: '10px', color: '#666' }}>
                {selectedLocation.boxes_stored} of {selectedLocation.capacity} boxes
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
