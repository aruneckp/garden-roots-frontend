import { useState, useEffect, useRef } from 'react';
import { deliveryFeeApi } from '../services/api';
import { formatDeliveryFee } from '../utils/simple-delivery-fee';

const ZONE_STYLES = {
  'Near Area':     { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', emoji: '🌿' },
  'Standard Area': { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', emoji: '📦' },
};

const DEFAULT_STYLE = ZONE_STYLES['Standard Area'];

/**
 * Displays the auto-detected street address, area, and delivery fee
 * for a given Singapore postal code.
 *
 * Props:
 *   postalCode          – 6-digit string from parent (Checkout manages the input)
 *   onDeliveryFeeChange – called with fee (number) when resolved
 *   onAreaChange        – called with area name (string) when resolved / cleared
 *   onStreetChange      – called with street address (string) when resolved / cleared
 */
export default function SimpleDeliveryFee({
  postalCode,
  cartTotal,
  onDeliveryFeeChange,
  onAreaChange,
  onStreetChange,
  onFreeThresholdChange,
  isFreeDelivery,
}) {
  const [result,  setResult]  = useState(null);   // { fee, area, street, zone }
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!postalCode || postalCode.length !== 6) {
      setResult(null);
      setError(null);
      if (onAreaChange)   onAreaChange('');
      if (onStreetChange) onStreetChange('');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await deliveryFeeApi.getFee(postalCode, cartTotal);
        setResult(data);
        if (onDeliveryFeeChange)    onDeliveryFeeChange(data.fee);
        if (onAreaChange)           onAreaChange(data.area   || '');
        if (onStreetChange)         onStreetChange(data.street || '');
        if (onFreeThresholdChange)  onFreeThresholdChange(data.free_threshold ?? null);
      } catch (err) {
        setError('Could not detect your address. Please try again.');
        setResult(null);
        if (onAreaChange)   onAreaChange('');
        if (onStreetChange) onStreetChange('');
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [postalCode, cartTotal, onDeliveryFeeChange, onAreaChange, onStreetChange]);

  const zoneStyle = result ? (ZONE_STYLES[result.zone] ?? DEFAULT_STYLE) : DEFAULT_STYLE;

  return (
    <div style={{ marginTop: 4, marginBottom: 4 }}>
      {/* Loading */}
      {loading && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          fontSize: 13, color: '#6B7280',
        }}>
          Detecting your address…
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: 13, color: '#DC2626',
        }}>
          {error}
        </div>
      )}

      {/* Result — street address + zone + fee */}
      {result && !loading && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderRadius: 8,
          background: zoneStyle.bg, border: `1px solid ${zoneStyle.border}`,
        }}>
          <span style={{ fontSize: 20 }}>{zoneStyle.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: zoneStyle.color, wordBreak: 'break-word' }}>
              {result.street || result.area || result.zone}
            </div>
            {result.area && (
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {result.area} · {result.zone}
              </div>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: 17, color: isFreeDelivery ? '#16a34a' : zoneStyle.color, flexShrink: 0 }}>
            {isFreeDelivery ? 'Free 🎉' : formatDeliveryFee(result.fee)}
          </div>
        </div>
      )}
    </div>
  );
}
