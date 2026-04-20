import { useState, useEffect } from 'react';
import { promoApi, userApi } from '../services/api';

const EMPTY_FORM = {
  code: '',
  promo_type: 'global',
  discount_type: 'fixed',
  discount_value: '',
  expiry_date: '',
  min_order_amount: '0',
  redemption_limit: '1',
  specific_user_id: '',
  specific_location_id: '',
};

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

export default function PromoManager({ headers, pickupLocations = [] }) {
  const [promos,  setPromos]  = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(null);
  const [editId,  setEditId]  = useState(null);
  const [promoSort, setPromoSort] = useState({ col: null, dir: 'asc' });

  const token = () =>
    headers?.Authorization?.replace('Bearer ', '') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('user_token') ||
    '';

  const fetchPromos = async () => {
    setLoading(true);
    try {
      const res = await promoApi.listPromos(token());
      setPromos(res?.data ?? res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userApi.listUsers(token());
      const list = res?.data ?? res;
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('fetchUsers failed:', e.message);
    }
  };

  useEffect(() => { fetchPromos(); fetchUsers(); }, []);

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.code || !form.discount_value || !form.expiry_date) {
      setError('Code, discount value and expiry date are required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        code:                 form.code.toUpperCase().trim(),
        promo_type:           form.promo_type,
        discount_type:        form.discount_type,
        discount_value:       parseFloat(form.discount_value),
        expiry_date:          new Date(form.expiry_date).toISOString(),
        min_order_amount:     parseFloat(form.min_order_amount || 0),
        redemption_limit:     parseInt(form.redemption_limit || 1, 10),
        specific_user_id:     form.promo_type === 'user_specific' && form.specific_user_id ? parseInt(form.specific_user_id, 10) : null,
        specific_location_id: form.promo_type === 'location_specific' && form.specific_location_id ? parseInt(form.specific_location_id, 10) : null,
      };

      if (editId) {
        await promoApi.updatePromo(token(), editId, {
          expiry_date:      payload.expiry_date,
          min_order_amount: payload.min_order_amount,
          redemption_limit: payload.redemption_limit,
          discount_value:   payload.discount_value,
        });
        setSuccess(`Promo '${payload.code}' updated`);
      } else {
        await promoApi.createPromo(token(), payload);
        setSuccess(`Promo '${payload.code}' created`);
      }

      setForm(EMPTY_FORM);
      setEditId(null);
      fetchPromos();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await promoApi.updatePromo(token(), promo.id, { is_active: promo.is_active === 1 ? 0 : 1 });
      fetchPromos();
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (promo) => {
    setEditId(promo.id);
    setForm({
      code:                 promo.code,
      promo_type:           promo.promo_type,
      discount_type:        promo.discount_type,
      discount_value:       String(promo.discount_value),
      expiry_date:          promo.expiry_date?.slice(0, 10) || '',
      min_order_amount:     String(promo.min_order_amount),
      redemption_limit:     String(promo.redemption_limit),
      specific_user_id:     promo.specific_user_id ? String(promo.specific_user_id) : '',
      specific_location_id: promo.specific_location_id ? String(promo.specific_location_id) : '',
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_FORM); setError(null); };

  const fieldStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>🎟️ Promo Codes</h2>

      {/* Create / Edit form */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>{editId ? `Edit Promo #${editId}` : 'Create New Promo Code'}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <label style={labelStyle}>Code *</label>
            <input style={{ ...fieldStyle, textTransform: 'uppercase', fontFamily: 'monospace' }}
              value={form.code} onChange={e => handleField('code', e.target.value.toUpperCase())}
              placeholder="SUMMER20" disabled={!!editId} />
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            <select style={fieldStyle} value={form.promo_type} onChange={e => handleField('promo_type', e.target.value)} disabled={!!editId}>
              <option value="global">Global (anyone)</option>
              <option value="user_specific">User Specific</option>
              <option value="location_specific">Location Specific</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Discount Type</label>
            <select style={fieldStyle} value={form.discount_type} onChange={e => handleField('discount_type', e.target.value)} disabled={!!editId}>
              <option value="fixed">Fixed ($)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Discount Value * {form.discount_type === 'percentage' ? '(%)' : '($)'}</label>
            <input style={fieldStyle} type="number" min="0" step="0.01"
              value={form.discount_value} onChange={e => handleField('discount_value', e.target.value)}
              placeholder={form.discount_type === 'percentage' ? '10' : '5.00'} />
          </div>

          <div>
            <label style={labelStyle}>Expiry Date * (SST)</label>
            <input style={fieldStyle} type="date" value={form.expiry_date}
              onChange={e => handleField('expiry_date', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Min Order Amount ($)</label>
            <input style={fieldStyle} type="number" min="0" step="0.01"
              value={form.min_order_amount} onChange={e => handleField('min_order_amount', e.target.value)}
              placeholder="0" />
          </div>

          <div>
            <label style={labelStyle}>Redemption Limit (per user)</label>
            <input style={fieldStyle} type="number" min="1" step="1"
              value={form.redemption_limit} onChange={e => handleField('redemption_limit', e.target.value)}
              placeholder="1" />
          </div>

          {form.promo_type === 'user_specific' && (
            <div>
              <label style={labelStyle}>User *</label>
              <select style={fieldStyle} value={form.specific_user_id}
                onChange={e => handleField('specific_user_id', e.target.value)} disabled={!!editId}>
                <option value="">— Select user —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.promo_type === 'location_specific' && (
            <div>
              <label style={labelStyle}>Pickup Location</label>
              <select style={fieldStyle} value={form.specific_location_id}
                onChange={e => handleField('specific_location_id', e.target.value)} disabled={!!editId}>
                <option value="">— Select location —</option>
                {pickupLocations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error  && <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13 }}>⚠️ {error}</div>}
        {success && <div style={{ marginTop: 12, color: '#16a34a', fontSize: 13 }}>✅ {success}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: '9px 22px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {saving ? 'Saving…' : editId ? 'Update Promo' : 'Create Promo'}
          </button>
          {editId && (
            <button onClick={cancelEdit}
              style={{ padding: '9px 18px', borderRadius: 8, background: '#f3f4f6', border: '1px solid #d1d5db', fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Promo list */}
      {loading ? (
        <div>Loading promos…</div>
      ) : promos.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No promo codes yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {[
                  { label: 'Code', key: 'code' },
                  { label: 'Type', key: 'promo_type' },
                  { label: 'Discount', key: 'discount_value' },
                  { label: 'Min Order', key: 'min_order_amount' },
                  { label: 'Expiry', key: 'expiry_date' },
                  { label: 'Limit', key: 'redemption_limit' },
                  { label: 'Used', key: 'total_used' },
                  { label: 'Status', key: '_status' },
                  { label: 'Actions', key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    style={{
                      padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151',
                      cursor: key ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                    onClick={() => key && setPromoSort(p => ({ col: key, dir: p.col === key && p.dir === 'asc' ? 'desc' : 'asc' }))}
                  >
                    {label}
                    {key && (
                      <span style={{ marginLeft: 4, fontSize: 10, opacity: promoSort.col === key ? 1 : 0.25 }}>
                        {promoSort.col === key && promoSort.dir === 'desc' ? '▼' : '▲'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortByCol(
                promos.map(p => ({ ...p, _status: p.is_active === 1 && !(new Date() > new Date(p.expiry_date)) ? 'Active' : new Date() > new Date(p.expiry_date) ? 'Expired' : 'Inactive' })),
                promoSort.col, promoSort.dir
              ).map(p => {
                const expired = new Date() > new Date(p.expiry_date);
                const active = p.is_active === 1 && !expired;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', background: active ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{p.code}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {p.promo_type === 'global' ? '🌍 Global'
                        : p.promo_type === 'user_specific'
                          ? `👤 ${users.find(u => u.id === p.specific_user_id)?.name || users.find(u => u.id === p.specific_user_id)?.email || `User #${p.specific_user_id}`}`
                        : `📍 Location #${p.specific_location_id}`}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>
                      {p.discount_type === 'percentage' ? `${p.discount_value}%` : `$${p.discount_value}`}
                    </td>
                    <td style={{ padding: '10px 12px' }}>${p.min_order_amount}</td>
                    <td style={{ padding: '10px 12px', color: expired ? '#dc2626' : '#374151' }}>
                      {p.expiry_date?.slice(0, 10)}{expired ? ' ⚠️' : ''}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{p.redemption_limit}×</td>
                    <td style={{ padding: '10px 12px' }}>{p.total_used}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: active ? '#dcfce7' : '#fee2e2',
                        color: active ? '#16a34a' : '#dc2626' }}>
                        {active ? 'Active' : expired ? 'Expired' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => startEdit(p)}
                          style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #d1d5db', background: '#fff' }}>
                          Edit
                        </button>
                        {!expired && (
                          <button onClick={() => handleToggleActive(p)}
                            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: 'none',
                              background: p.is_active === 1 ? '#fee2e2' : '#dcfce7',
                              color: p.is_active === 1 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                            {p.is_active === 1 ? 'Deactivate' : 'Activate'}
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
  );
}
