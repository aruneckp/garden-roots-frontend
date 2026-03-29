import { useState, useEffect } from 'react';
import './AdminDashboard.css';

export default function PickupLocationManager() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    manager_name: '',
    location_type: 'retail',
    capacity: 100,
    notes: '',
  });

  const token = localStorage.getItem('admin_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/pickup-locations', { headers });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/pickup-locations', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create location');
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        manager_name: '',
        location_type: 'retail',
        capacity: 100,
        notes: '',
      });
      setShowForm(false);
      await fetchLocations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancy = async (locationId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/pickup-locations/${locationId}/occupancy`,
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
        <button
          className="submit-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '➕ Add Location'}
        </button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}
      {loading && <div className="loading">⏳ Loading...</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="name">Location Name *</label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai Central Showroom"
                required
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
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Full address"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Contact number"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="manager_name">Manager Name</label>
              <input
                id="manager_name"
                name="manager_name"
                value={formData.manager_name}
                onChange={handleInputChange}
                placeholder="Location manager"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="capacity">Capacity (boxes)</label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any special notes about this location"
              rows="3"
            ></textarea>
          </div>

          <button type="submit" className="submit-button" disabled={loading}>
            ✅ Create Location
          </button>
        </form>
      )}

      <div className="locations-grid">
        {locations.length === 0 ? (
          <p>No pickup locations found. Create one to get started!</p>
        ) : (
          locations.map(location => (
            <div key={location.id} className="location-card">
              <div className="location-header-card">
                <h3>
                  {location.location_type === 'retail' && '🏪'}
                  {location.location_type === 'warehouse' && '🏭'}
                  {location.location_type === 'franchise' && '🏢'}
                  {' '}{location.name}
                </h3>
                <span className="location-type-badge">{location.location_type}</span>
              </div>

              <div className="location-details">
                <p><strong>📍 Address:</strong> {location.address}</p>
                <p><strong>📱 Phone:</strong> {location.phone || 'N/A'}</p>
                <p><strong>📧 Email:</strong> {location.email || 'N/A'}</p>
                <p><strong>👤 Manager:</strong> {location.manager_name || 'N/A'}</p>

                <div className="capacity-bar">
                  <p><strong>Capacity: {location.capacity} boxes</strong></p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(location.current_boxes / location.capacity * 100) || 0}%` }}
                    ></div>
                  </div>
                  <p className="capacity-text">Currently: {location.current_boxes} boxes ({Math.round((location.current_boxes / location.capacity * 100) || 0)}%)</p>
                </div>

                {location.notes && <p><strong>📝 Notes:</strong> {location.notes}</p>}
              </div>

              <button
                className="view-details-button"
                onClick={() => getOccupancy(location.id)}
              >
                📊 View Occupancy
              </button>
            </div>
          ))
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
                <div
                  className="progress-fill"
                  style={{ width: `${selectedLocation.occupancy_percentage}%` }}
                ></div>
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
