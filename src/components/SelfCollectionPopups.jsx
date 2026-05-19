import { useState, useEffect } from 'react';
import { API_BASE } from '../services/api';
import { useApp } from '../context/AppContext';
import MangoLoader from './MangoLoader';

export default function SelfCollectionPopups() {
  const { setSiteConfig } = useApp();
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // ── Common message (all locations) ──────────────────────────
  const [commonMsg, setCommonMsg] = useState('');
  const [commonDraft, setCommonDraft] = useState('');
  const [commonSaving, setCommonSaving] = useState(false);
  const [commonSaved, setCommonSaved] = useState(false);

  // ── Per-location messages ────────────────────────────────────
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [configRes, locRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/config`),
        fetch(`${API_BASE}/api/v1/admin/pickup-locations`, { headers }),
      ]);

      if (configRes.ok) {
        const json = await configRes.json();
        const msg = json.data?.self_collection_common_message || '';
        setCommonMsg(msg);
        setCommonDraft(msg);
      }

      if (!locRes.ok) throw new Error('Failed to fetch pickup locations');
      const locs = await locRes.json();
      setLocations(locs);
      const initial = {};
      locs.forEach(l => { initial[l.id] = l.notification_message || ''; });
      setDrafts(initial);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save common message via PATCH /api/v1/config/self_collection_common_message
  const saveCommon = async () => {
    setCommonSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/config/self_collection_common_message`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ config_value: commonDraft }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const b = await res.json(); detail = b.detail || b.error || detail; } catch (_) {}
        throw new Error(`Failed to save common message: ${detail}`);
      }
      // Re-fetch from server to confirm DB persistence
      const verifyRes = await fetch(`${API_BASE}/api/v1/config`);
      if (verifyRes.ok) {
        const json = await verifyRes.json();
        const persisted = json.data?.self_collection_common_message || '';
        setCommonMsg(persisted);
        setCommonDraft(persisted);
        setSiteConfig(prev => ({ ...prev, self_collection_common_message: persisted }));
      } else {
        setCommonMsg(commonDraft);
        setSiteConfig(prev => ({ ...prev, self_collection_common_message: commonDraft }));
      }
      setCommonSaved(true);
      setTimeout(() => setCommonSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommonSaving(false);
    }
  };

  const clearCommon = () => setCommonDraft('');

  // Save per-location message via PUT /api/v1/admin/pickup-locations/{id}
  const handleSave = async (locationId) => {
    setSaving(locationId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/pickup-locations/${locationId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notification_message: drafts[locationId] || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setLocations(prev => prev.map(l => (l.id === locationId ? updated : l)));
      setSaved(prev => ({ ...prev, [locationId]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [locationId]: false })), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const isDirty = (loc) => (drafts[loc.id] ?? '') !== (loc.notification_message || '');
  const isActive = (msg) => !!(msg && msg.trim());

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '4px 0 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>🔔 SelfCollection PopUps</h2>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          Popup messages shown to customers when selecting a self-collection point at checkout.
          Set a common message, location-specific messages, or both — customers will see whichever are active.
        </p>
      </div>

      {/* Error / retry */}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>⚠️ {error}</span>
          <button onClick={fetchAll} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            ↻ Retry
          </button>
        </div>
      )}

      {loading && <MangoLoader text="Loading…" />}

      {!loading && (
        <>
          {/* ── Common message card ─────────────────────────── */}
          <div style={{ background: '#fff', border: `1.5px solid ${isActive(commonMsg) ? '#86efac' : '#e5e7eb'}`, borderRadius: 12, padding: '18px 20px', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>🌐 Common Message</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Shown for every self-collection point, regardless of location</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                background: isActive(commonMsg) ? '#dcfce7' : '#f3f4f6',
                color: isActive(commonMsg) ? '#15803d' : '#6b7280',
                border: `1px solid ${isActive(commonMsg) ? '#86efac' : '#e5e7eb'}`,
              }}>
                {isActive(commonMsg) ? '🟢 Active' : '⚪ Inactive'}
              </span>
            </div>

            <textarea
              rows={3}
              placeholder="Enter a message shown to all customers selecting any self-collection point… leave empty to disable."
              value={commonDraft}
              onChange={e => setCommonDraft(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: '#111827', fontFamily: 'inherit', background: '#fafafa' }}
            />

            {commonDraft.trim() && (
              <div style={{ margin: '10px 0 0', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 13, color: '#15803d', lineHeight: 1.55 }}>
                <strong>Preview:</strong> 📢 {commonDraft}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <button
                onClick={saveCommon}
                disabled={commonSaving || commonDraft === commonMsg}
                style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: commonDraft !== commonMsg ? 'pointer' : 'not-allowed',
                  background: commonDraft !== commonMsg ? '#16a34a' : '#d1d5db', color: '#fff', opacity: commonSaving ? 0.7 : 1,
                }}
              >
                {commonSaving ? 'Saving…' : commonSaved ? '✅ Saved!' : '💾 Save'}
              </button>
              {commonDraft.trim() && (
                <button onClick={clearCommon} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  🗑 Clear
                </button>
              )}
              {commonSaved && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Changes saved!</span>}
            </div>
          </div>

          {/* ── Divider ─────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' }}>LOCATION-SPECIFIC MESSAGES</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          {/* ── Per-location cards ───────────────────────────── */}
          {!error && locations.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 14 }}>No pickup locations found.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {locations.map(loc => (
              <div
                key={loc.id}
                style={{
                  background: '#fff',
                  border: `1.5px solid ${isActive(loc.notification_message) ? '#fcd34d' : '#e5e7eb'}`,
                  borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>📍 {loc.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{loc.address}</div>
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                    background: isActive(loc.notification_message) ? '#fef9c3' : '#f3f4f6',
                    color: isActive(loc.notification_message) ? '#92400e' : '#6b7280',
                    border: `1px solid ${isActive(loc.notification_message) ? '#fcd34d' : '#e5e7eb'}`,
                  }}>
                    {isActive(loc.notification_message) ? '🟡 Active' : '⚪ Inactive'}
                  </span>
                </div>

                <textarea
                  rows={3}
                  placeholder="Enter a message specific to this location… leave empty to disable."
                  value={drafts[loc.id] ?? ''}
                  onChange={e => setDrafts(prev => ({ ...prev, [loc.id]: e.target.value }))}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: '#111827', fontFamily: 'inherit', background: '#fafafa' }}
                />

                {drafts[loc.id]?.trim() && (
                  <div style={{ margin: '10px 0 0', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13, color: '#92400e', lineHeight: 1.55 }}>
                    <strong>Preview:</strong> 🔔 {drafts[loc.id]}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                  <button
                    onClick={() => handleSave(loc.id)}
                    disabled={saving === loc.id || !isDirty(loc)}
                    style={{
                      padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
                      cursor: isDirty(loc) ? 'pointer' : 'not-allowed',
                      background: isDirty(loc) ? '#d97706' : '#d1d5db', color: '#fff', opacity: saving === loc.id ? 0.7 : 1,
                    }}
                  >
                    {saving === loc.id ? 'Saving…' : saved[loc.id] ? '✅ Saved!' : '💾 Save'}
                  </button>
                  {drafts[loc.id]?.trim() && (
                    <button
                      onClick={() => setDrafts(prev => ({ ...prev, [loc.id]: '' }))}
                      disabled={saving === loc.id}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >
                      🗑 Clear
                    </button>
                  )}
                  {saved[loc.id] && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Changes saved!</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
