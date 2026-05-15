import React, { useState, useEffect, useRef } from 'react';
import { productApi, orderApi } from '../services/api';
import { useApp } from '../context/AppContext';

// ---------------------------------------------------------------------------
// CSV helpers (no external dependency)
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'delivery_type',       // "delivery" or "pickup"
  'delivery_address',    // required when delivery_type=delivery
  'postal_code',         // 6-digit, required when delivery_type=delivery
  'pickup_location_id',  // numeric, required when delivery_type=pickup
  'payment_method',      // "paynow" or "pay_later"
  'promo_code',
  'customer_notes',
  'items',               // format: variantId:qty|variantId:qty  e.g. 3:2|7:1
];

const EXAMPLE_ROWS = [
  [
    'John Tan', 'john@email.com', '91234567', 'delivery',
    '123 Orchard Rd #05-01', '238839', '', 'pay_later', '', 'Leave at door', '3:2',
  ],
  [
    'Mary Lim', 'mary@email.com', '98765432', 'pickup',
    '', '', '1', 'paynow', 'SUMMER10', '', '5:1|3:1',
  ],
];

function toCsv(rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [TEMPLATE_HEADERS, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Minimal RFC-4180 CSV parser — handles quoted fields with embedded commas/newlines */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuote = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        row.push(field); field = '';
        if (ch === '\r' && text[i + 1] === '\n') i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
        i++;
        continue;
      } else {
        field += ch;
      }
    }
    i++;
  }
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

/** Convert a CSV row array + header array into an OrderIn-shaped object for the API */
function rowToOrderPayload(headers, values) {
  const get = (key) => {
    const idx = headers.indexOf(key);
    return idx >= 0 ? (values[idx] ?? '').trim() : '';
  };

  const itemsRaw = get('items');
  const items = itemsRaw
    ? itemsRaw.split('|').map((part) => {
        const [vid, qty] = part.split(':');
        return {
          product_variant_id: parseInt(vid, 10),
          quantity: parseInt(qty, 10) || 1,
        };
      }).filter((it) => !isNaN(it.product_variant_id))
    : [];

  const pickupId = get('pickup_location_id');
  const postal = get('postal_code');

  return {
    customer_name: get('customer_name'),
    customer_email: get('customer_email') || null,
    customer_phone: get('customer_phone') || null,
    delivery_type: get('delivery_type') || 'delivery',
    delivery_address: get('delivery_address') || null,
    postal_code: postal || null,
    pickup_location_id: pickupId ? parseInt(pickupId, 10) : null,
    payment_method: get('payment_method') || 'pay_later',
    promo_code: get('promo_code') || null,
    customer_notes: get('customer_notes') || null,
    items,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BulkOrderUpload() {
  const { adminToken } = useApp();
  const fileRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [parsedRows, setParsedRows] = useState([]); // { headers, values, payload, rowNum, error }
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null); // BulkOrderOut

  const [showRef, setShowRef] = useState(false);

  useEffect(() => {
    setLoadingProducts(true);
    productApi.getProducts()
      .then((res) => setProducts(res.data ?? res ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  // ---- All product variants flattened for reference table ----
  const allVariants = products.flatMap((p) =>
    (p.variants ?? []).map((v) => ({
      variantId: v.id,
      productName: p.name,
      size: v.size ?? v.weight ?? v.label ?? '',
      price: v.price ?? p.price ?? '',
    }))
  );

  // ---- Download template ----
  const handleDownloadTemplate = () => {
    downloadCsv(toCsv(EXAMPLE_ROWS), 'bulk_orders_template.csv');
  };

  const handleDownloadBlank = () => {
    downloadCsv(toCsv([]), 'bulk_orders_blank.csv');
  };

  // ---- File upload ----
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    setParsedRows([]);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const allRows = parseCsv(text);
        if (allRows.length < 2) {
          setParseError('File is empty or has no data rows.');
          return;
        }
        const [headerRow, ...dataRows] = allRows;
        const headers = headerRow.map((h) => h.trim().toLowerCase());

        const missing = TEMPLATE_HEADERS.filter(
          (h) => !headers.includes(h)
        );
        if (missing.length) {
          setParseError(`Missing columns: ${missing.join(', ')}. Download the template to see the correct format.`);
          return;
        }

        const parsed = dataRows.map((values, idx) => {
          let payload = null;
          let error = null;
          try {
            payload = rowToOrderPayload(headers, values);
            if (!payload.customer_name) error = 'customer_name is required';
            else if (!payload.items.length) error = 'items column is empty or invalid';
          } catch (err) {
            error = err.message;
          }
          return { rowNum: idx + 2, values, payload, error };
        });

        setParsedRows(parsed);
      } catch (err) {
        setParseError(`Could not parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    const valid = parsedRows.filter((r) => !r.error);
    if (!valid.length) return;

    setSubmitting(true);
    setResults(null);
    try {
      const res = await orderApi.createOrdersBulk(
        valid.map((r) => r.payload),
        adminToken
      );
      setResults(res.data ?? res);
    } catch (err) {
      setParseError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => !r.error).length;
  const invalidCount = parsedRows.filter((r) => r.error).length;

  return (
    <div className="bulk-upload-container">
      <h2 className="bulk-upload-title">Bulk Order Upload</h2>
      <p className="bulk-upload-subtitle">
        Upload a CSV sheet to create multiple orders at once. Each row becomes one order.
      </p>

      {/* ---- Step 1: Download template ---- */}
      <section className="bulk-section">
        <h3 className="bulk-section-title">Step 1 — Download template</h3>
        <div className="bulk-btn-row">
          <button className="bulk-btn bulk-btn-secondary" onClick={handleDownloadTemplate}>
            Download template with examples
          </button>
          <button className="bulk-btn bulk-btn-ghost" onClick={handleDownloadBlank}>
            Download blank template
          </button>
        </div>
        <p className="bulk-hint">
          Fill in one order per row. The <code>items</code> column uses the format{' '}
          <code>variantId:qty</code> — separate multiple items with <code>|</code>.{' '}
          Example: <code>3:2|7:1</code> = 2 of variant 3 and 1 of variant 7.
        </p>

        {/* Variant reference table */}
        <button
          className="bulk-btn bulk-btn-ghost"
          style={{ marginTop: 8 }}
          onClick={() => setShowRef((v) => !v)}
        >
          {showRef ? 'Hide' : 'Show'} product variant ID reference
        </button>

        {showRef && (
          <div className="bulk-ref-table-wrap">
            {loadingProducts ? (
              <p className="bulk-hint">Loading products…</p>
            ) : allVariants.length === 0 ? (
              <p className="bulk-hint">No product variants found.</p>
            ) : (
              <table className="bulk-ref-table">
                <thead>
                  <tr>
                    <th>Variant ID</th>
                    <th>Product</th>
                    <th>Size / Weight</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {allVariants.map((v) => (
                    <tr key={v.variantId}>
                      <td><code>{v.variantId}</code></td>
                      <td>{v.productName}</td>
                      <td>{v.size}</td>
                      <td>{v.price !== '' ? `$${v.price}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* ---- Step 2: Upload file ---- */}
      <section className="bulk-section">
        <h3 className="bulk-section-title">Step 2 — Upload your filled CSV</h3>
        <div
          className="bulk-drop-zone"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileRef.current.files = dt.files;
              handleFileChange({ target: { files: [file] } });
            }
          }}
        >
          <span className="bulk-drop-icon">📂</span>
          <span>{fileName || 'Click or drag & drop your CSV file here'}</span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
        {parseError && <p className="bulk-error">{parseError}</p>}
      </section>

      {/* ---- Step 3: Preview ---- */}
      {parsedRows.length > 0 && (
        <section className="bulk-section">
          <h3 className="bulk-section-title">
            Step 3 — Review ({validCount} valid, {invalidCount} with errors)
          </h3>

          <div className="bulk-preview-wrap">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((r) => (
                  <tr key={r.rowNum} className={r.error ? 'bulk-row-error' : 'bulk-row-ok'}>
                    <td>{r.rowNum}</td>
                    <td>{r.payload?.customer_name || '—'}</td>
                    <td>{r.payload?.customer_email || '—'}</td>
                    <td>{r.payload?.customer_phone || '—'}</td>
                    <td>{r.payload?.delivery_type || '—'}</td>
                    <td>
                      {r.payload?.items?.length
                        ? r.payload.items.map((it) => `${it.product_variant_id}×${it.quantity}`).join(', ')
                        : '—'}
                    </td>
                    <td>{r.payload?.payment_method || '—'}</td>
                    <td>
                      {r.error
                        ? <span className="bulk-badge-error" title={r.error}>Error</span>
                        : <span className="bulk-badge-ok">Ready</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidCount > 0 && (
            <div className="bulk-error-list">
              <strong>Row errors:</strong>
              <ul>
                {parsedRows.filter((r) => r.error).map((r) => (
                  <li key={r.rowNum}>Row {r.rowNum}: {r.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bulk-btn-row" style={{ marginTop: 16 }}>
            <button
              className="bulk-btn bulk-btn-primary"
              onClick={handleSubmit}
              disabled={submitting || validCount === 0}
            >
              {submitting
                ? `Creating ${validCount} orders…`
                : `Create ${validCount} order${validCount !== 1 ? 's' : ''}`}
            </button>
            {invalidCount > 0 && (
              <span className="bulk-hint" style={{ alignSelf: 'center' }}>
                {invalidCount} row{invalidCount !== 1 ? 's' : ''} with errors will be skipped.
              </span>
            )}
          </div>
        </section>
      )}

      {/* ---- Results ---- */}
      {results && (
        <section className="bulk-section">
          <h3 className="bulk-section-title">
            Results — {results.succeeded} succeeded / {results.failed} failed
          </h3>
          <div className="bulk-preview-wrap">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Customer</th>
                  <th>Order Ref</th>
                  <th>Result</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r) => (
                  <tr key={r.row} className={r.success ? 'bulk-row-ok' : 'bulk-row-error'}>
                    <td>{r.row}</td>
                    <td>{r.customer_name || '—'}</td>
                    <td>{r.order_ref || '—'}</td>
                    <td>
                      {r.success
                        ? <span className="bulk-badge-ok">Created</span>
                        : <span className="bulk-badge-error">Failed</span>}
                    </td>
                    <td style={{ color: r.success ? '#16a34a' : '#dc2626', fontSize: 13 }}>
                      {r.success ? `Order #${r.order_id}` : r.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="bulk-btn bulk-btn-ghost"
            style={{ marginTop: 12 }}
            onClick={() => {
              setParsedRows([]);
              setResults(null);
              setFileName('');
              setParseError('');
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            Upload another sheet
          </button>
        </section>
      )}
    </div>
  );
}
