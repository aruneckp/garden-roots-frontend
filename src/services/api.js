/**
 * Garden Roots API Client
 *
 * All requests go through _request() which:
 *  - Enforces a 15-second timeout (configurable per call)
 *  - Reads structured error bodies from the backend
 *  - Throws plain Error objects so callers get consistent messages
 *
 * Base URL resolution:
 *  - Dev:  VITE_API_URL is empty → Vite proxy forwards /api to localhost:8000
 *  - Prod: Set VITE_API_URL=https://api.gardenroots.sg in .env
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const DEFAULT_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function _request(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        errMsg = body.error || body.detail || errMsg;
      } catch (_) { /* body was not JSON */ }
      throw new Error(errMsg);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  }
}

const get  = (path, headers = {})       => _request(path, { headers });
const post = (path, body, headers = {}) => _request(path, { method: 'POST', body: JSON.stringify(body), headers });
const put  = (path, body, headers = {}) => _request(path, { method: 'PUT',  body: body ? JSON.stringify(body) : undefined, headers });

const authHeader = (token) => token ? { Authorization: `Bearer ${token}` } : {};

// ---------------------------------------------------------------------------
// Product API
// ---------------------------------------------------------------------------

export const productApi = {
  getProducts:       ()          => get('/api/v1/products'),
  getProduct:        (id)        => get(`/api/v1/products/${id}`),
  getProductVariants:(id)        => get(`/api/v1/products/${id}/variants`),
};

// ---------------------------------------------------------------------------
// Stock API
// ---------------------------------------------------------------------------

export const stockApi = {
  checkStock:      (variantId)  => get(`/api/v1/stock/${variantId}`),
  checkStockBatch: (variantIds) => post('/api/v1/stock/check', { variant_ids: variantIds }),
};

// ---------------------------------------------------------------------------
// Order API
// ---------------------------------------------------------------------------

export const orderApi = {
  createOrder: (orderData) =>
    post('/api/v1/orders', {
      items:               orderData.items,
      customer_name:       orderData.customerName,
      customer_email:      orderData.customerEmail,
      customer_phone:      orderData.customerPhone,
      payment_method:      orderData.paymentMethod || 'paynow',
      delivery_type:       orderData.deliveryType || 'delivery',
      delivery_address:    orderData.deliveryAddress || null,
      pickup_location_id:  orderData.pickupLocationId || null,
      customer_notes:      orderData.customerNotes || null,
      ...(orderData.userId ? { user_id: orderData.userId } : {}),
    }),

  getOrder:       (orderId) => get(`/api/v1/orders/${orderId}`),
  getOrderStatus: (orderId) => get(`/api/v1/orders/${orderId}/status`),
};

// ---------------------------------------------------------------------------
// Payment API
// ---------------------------------------------------------------------------

export const paymentApi = {
  createPayment: (amount, description, orderId, customerName, customerEmail, customerPhone) =>
    post('/api/v1/payments/create-payment', {
      amount,
      description,
      order_id:        orderId,
      payment_method:  'paynow',
      customer_name:   customerName  || null,
      customer_email:  customerEmail || null,
      customer_phone:  customerPhone || null,
    }),

  getPaymentStatus: (paymentIntentId) =>
    get(`/api/v1/payments/status/${paymentIntentId}`),

  confirmPayment: (orderId, paymentIntentId) =>
    put(`/api/v1/payments/${orderId}/payment-confirm?payment_intent_id=${paymentIntentId}`),
};

// ---------------------------------------------------------------------------
// Location API
// ---------------------------------------------------------------------------

export const locationApi = {
  getLocations:        ()  => get('/api/v1/locations'),
  getLocation: (locationId) => get(`/api/v1/locations/${locationId}`),
  getPickupLocations:  ()  => get('/api/v1/locations/pickup'),
};

// ---------------------------------------------------------------------------
// Auth API (Google OAuth)
// ---------------------------------------------------------------------------

export const authApi = {
  googleLogin: (idToken) =>
    post('/api/v1/auth/google', { id_token: idToken }),
};

// ---------------------------------------------------------------------------
// User API (requires user JWT)
// ---------------------------------------------------------------------------

export const userApi = {
  getMe:          (token)                   => get('/api/v1/users/me', authHeader(token)),
  updatePhone:    (token, phone)            => put('/api/v1/users/me/phone', { phone }, authHeader(token)),
  getMyOrders:    (token)                   => get('/api/v1/users/me/orders', authHeader(token)),
  submitFeedback: (token, orderId, feedback) =>
    put(`/api/v1/users/me/orders/${orderId}/feedback`, { delivery_feedback: feedback }, authHeader(token)),
};
