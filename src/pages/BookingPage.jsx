import { useBooking } from '../context/BookingContext';
import { VEHICLE_TYPES } from '../data/services';
import { MAJOR_CITIES } from '../data/locations';
import { useState, useRef } from 'react';

const haversineDistance = (city1, city2) => {
  const R = 6371;
  const dLat = ((city2.lat - city1.lat) * Math.PI) / 180;
  const dLng = ((city2.lng - city1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((city1.lat * Math.PI) / 180) *
      Math.cos((city2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const filterCities = (query) => {
  if (query.length < 2) return [];
  return MAJOR_CITIES.filter(
    (c) =>
      c.name.toLowerCase().startsWith(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);
};

export default function BookingPage() {
  const { setPage, currentBooking, setCurrentBooking, showToast } = useBooking();

  const [fromText, setFromText] = useState(currentBooking.fromLocation || '');
  const [toText, setToText] = useState(currentBooking.toLocation || '');
  const [fromCity, setFromCity] = useState(null);
  const [toCity, setToCity] = useState(null);
  const [fromSugg, setFromSugg] = useState([]);
  const [toSugg, setToSugg] = useState([]);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const fromTimer = useRef(null);
  const toTimer = useRef(null);

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [date, setDate] = useState(currentBooking.date || '');
  const [time, setTime] = useState(currentBooking.time || '');
  const [weight, setWeight] = useState(currentBooking.weight || '');
  const [notes, setNotes] = useState(currentBooking.notes || '');

  const distance = fromCity && toCity ? haversineDistance(fromCity, toCity) : null;

  const getFare = () => {
    if (!selectedVehicle || !distance) return null;
    const v = VEHICLE_TYPES.find((v) => v.id === selectedVehicle);
    return {
      base: v.basePrice,
      distanceCharge: Math.round(distance * v.perKmPrice),
      total: v.basePrice + Math.round(distance * v.perKmPrice),
    };
  };

  const fare = getFare();

  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromText(val);
    setFromCity(null);
    const s = filterCities(val);
    setFromSugg(s);
    setShowFrom(s.length > 0);
  };

  const handleToChange = (e) => {
    const val = e.target.value;
    setToText(val);
    setToCity(null);
    const s = filterCities(val);
    setToSugg(s);
    setShowTo(s.length > 0);
  };

  const selectFrom = (city) => {
    setFromText(city.name);
    setFromCity(city);
    setShowFrom(false);
  };

  const selectTo = (city) => {
    setToText(city.name);
    setToCity(city);
    setShowTo(false);
  };

  const handleProceedToCheckout = () => {
    if (!fromText || !toText || !date || !time || !selectedVehicle) {
      showToast('Please fill in all booking details', 'error');
      return;
    }
    const vehicle = VEHICLE_TYPES.find((v) => v.id === selectedVehicle);
    setCurrentBooking({
      fromLocation: fromText,
      toLocation: toText,
      vehicleType: selectedVehicle,
      vehicleName: vehicle.name,
      date,
      time,
      weight,
      notes,
      distance: distance || 50,
      baseFare: vehicle.basePrice,
      distanceCharge: Math.round((distance || 50) * vehicle.perKmPrice),
      fare: vehicle.basePrice + Math.round((distance || 50) * vehicle.perKmPrice),
    });
    showToast('Proceeding to checkout...', 'success');
    setTimeout(() => setPage('checkout'), 500);
  };

  const dropdownStyle = {
    position: 'absolute', top: '100%', left: 0, right: 0,
    background: 'white', border: '1px solid var(--border)',
    borderRadius: '8px', boxShadow: 'var(--shadow)',
    listStyle: 'none', margin: 0, padding: 0,
    zIndex: 200, maxHeight: '220px', overflowY: 'auto',
  };

  const suggItemBase = {
    padding: '10px 14px', cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  };

  return (
    <div className="page-container">
      <div className="booking-page">
        <h1>📦 Book Your Lorry</h1>

        <div className="booking-form-full">
          <h3 style={{ marginBottom: '24px' }}>Trip Details</h3>

          <div className="form-row">
            {/* From */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>From Location</label>
              <input
                type="text"
                placeholder="Enter pickup city"
                value={fromText}
                onChange={handleFromChange}
                onFocus={() => fromSugg.length > 0 && setShowFrom(true)}
                onBlur={() => { fromTimer.current = setTimeout(() => setShowFrom(false), 150); }}
                autoComplete="off"
              />
              {showFrom && (
                <ul style={dropdownStyle}>
                  {fromSugg.map((city) => (
                    <li
                      key={city.id}
                      onMouseDown={() => selectFrom(city)}
                      style={suggItemBase}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontWeight: 500 }}>{city.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{city.state}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* To */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label>To Location</label>
              <input
                type="text"
                placeholder="Enter dropoff city"
                value={toText}
                onChange={handleToChange}
                onFocus={() => toSugg.length > 0 && setShowTo(true)}
                onBlur={() => { toTimer.current = setTimeout(() => setShowTo(false), 150); }}
                autoComplete="off"
              />
              {showTo && (
                <ul style={dropdownStyle}>
                  {toSugg.map((city) => (
                    <li
                      key={city.id}
                      onMouseDown={() => selectTo(city)}
                      style={suggItemBase}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <span style={{ fontWeight: 500 }}>{city.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{city.state}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {distance && (
            <p style={{ fontSize: '13px', color: 'var(--primary)', marginTop: '-8px', marginBottom: '16px', fontWeight: 600 }}>
              📏 Estimated distance: {distance} km
            </p>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Weight (kg)</label>
              <input
                type="number"
                placeholder="Approx weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Special Notes (Optional)</label>
            <textarea
              placeholder="Any special handling instructions?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Select Vehicle Type</h3>
          <div className="vehicle-options">
            {VEHICLE_TYPES.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`vehicle-option ${selectedVehicle === vehicle.id ? 'selected' : ''}`}
                onClick={() => setSelectedVehicle(vehicle.id)}
              >
                <div className="icon">{vehicle.emoji}</div>
                <h4 style={{ marginBottom: '4px' }}>{vehicle.name}</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '8px' }}>
                  {vehicle.capacity}
                </p>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                  ₹{vehicle.basePrice} + ₹{vehicle.perKmPrice}/km
                </div>
              </div>
            ))}
          </div>
        </div>

        {fare && (
          <div className="fare-estimate">
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ color: 'white', marginBottom: '4px' }}>Fare Estimate</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
                {fromText} → {toText} • {distance} km
              </p>
            </div>
            <div className="fare-breakdown">
              <div className="fare-item">
                <span>Base Fare</span>
                <span>₹{fare.base}</span>
              </div>
              <div className="fare-item">
                <span>Distance ({distance} km)</span>
                <span>₹{fare.distanceCharge}</span>
              </div>
            </div>
            <div className="fare-total">₹{fare.total}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-outline" onClick={() => setPage('home')} style={{ flex: 1 }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleProceedToCheckout} style={{ flex: 1 }}>
            Proceed to Payment →
          </button>
        </div>
      </div>
    </div>
  );
}
