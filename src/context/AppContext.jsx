import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { varieties as fallbackVarieties } from '../data/varieties';
import { getBotReply } from '../data/botReplies';
import { productApi, authApi, orderApi, paymentApi, userApi, locationApi, API_BASE } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState('home');
  const [focusLocationId, setFocusLocationId] = useState(null);
  const [checkoutPickupName, setCheckoutPickupName] = useState(null);

  // ── User auth state ────────────────────────────────────────────────────────
  const [user, setUser] = useState(null);          // { id, email, name, picture, phone }
  const [userToken, setUserToken] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Admin view mode: 'store' | 'admin' | 'delivery' ───────────────────────
  // Admins default to customer store so they can book on behalf of customers
  const [adminView, setAdminView] = useState('store');
  const [adminInitialTab, setAdminInitialTab] = useState('reports');

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('user_token');
    const stored = localStorage.getItem('user_data');
    if (token && stored) {
      try {
        setUserToken(token);
        setUser(JSON.parse(stored));
        refreshMyOrders(token);   // load orders immediately on restore
      } catch (_) {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
      }
    }
  }, []);

  const loginUser = (token, userData) => {
    localStorage.setItem('user_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUserToken(token);
    setUser(userData);
    refreshMyOrders(token);       // load orders immediately on login
  };

  const logoutUser = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_data');
    setUserToken(null);
    setUser(null);
    setMyOrders([]);              // clear orders on logout
  };

  const updateUserPhone = (phone) => {
    const updated = { ...user, phone };
    localStorage.setItem('user_data', JSON.stringify(updated));
    setUser(updated);
  };
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [siteConfig, setSiteConfig] = useState({ banner_messages: null });
  const [pickupLocations, setPickupLocations] = useState([]);
  const [loadingPickupLocations, setLoadingPickupLocations] = useState(true);


  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatNotif, setChatNotif] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    { from: 'bot', text: "Hi there! 👋 I'm Rooty, the Garden Roots assistant. I can help you browse varieties, add items to your cart, and even take payment. What can I help you with?" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [payState, setPayState] = useState('idle');
  const [orderRef, setOrderRef] = useState(null);
  const [confirmedTotal, setConfirmedTotal] = useState(null);
  // Incomplete order banner: set when customer left without paying
  const [incompleteOrderId, setIncompleteOrderId] = useState(null);

  // ── My Orders (shared so MyBookings refreshes after payment) ─────────────
  const [myOrders, setMyOrders] = useState([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState(null);

  const refreshMyOrders = async (token) => {
    const t = token ?? userToken;
    if (!t) return;
    setMyOrdersLoading(true);
    setMyOrdersError(null);
    try {
      const res = await userApi.getMyOrders(t);
      const data = res?.data ?? res;
      setMyOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setMyOrdersError(err?.message || 'Failed to load orders. Please try again.');
    } finally {
      setMyOrdersLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);

  // Re-fetch latest prices from DB on every page navigation.
  // On first mount products is empty so show the spinner; on subsequent navigations refresh silently.
  useEffect(() => {
    loadProducts(products.length === 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Re-fetch prices when tab becomes visible again after inactivity
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProducts(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping, chatOpen]);

  // ── HitPay return handler ─────────────────────────────────────────────────
  // HitPay redirects back with: ?reference=<payment_uuid>&status=completed|failed
  // We trust the status from the URL and immediately confirm the order in DB.
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const status  = params.get('status');
    const payId   = params.get('reference');   // HitPay payment UUID
    const orderId = sessionStorage.getItem('pending_order_id');

    // Only act when we have HitPay return params and a stored order
    if (!payId || !orderId || !status) return;

    // Clean up immediately so refresh doesn't re-trigger
    window.history.replaceState({}, '', '/');
    sessionStorage.removeItem('pending_order_id');
    sessionStorage.removeItem('pending_payment_id');

    setPage('checkout');

    if (status === 'failed' || status === 'cancelled') {
      setPayState('failed');
      return;
    }

    // status === 'completed' — confirm in DB
    setPayState('processing');

    const confirm = async () => {
      const MAX = 5;
      for (let i = 1; i <= MAX; i++) {
        try {
          console.log(`[HitPay] confirm attempt ${i} orderId=${orderId} payId=${payId}`);
          const resp    = await paymentApi.confirmPayment(parseInt(orderId, 10), payId);
          const result  = resp?.data ?? resp;
          const ref   = result?.order_ref ?? result?.data?.order_ref ?? null;
          const total = result?.total_price ?? result?.data?.total_price ?? null;
          console.log('[HitPay] confirm success, order_ref=', ref, 'total=', total);
          setOrderRef(ref);
          if (total !== null) setConfirmedTotal(total);
          setPayState('success');
          // Read token from localStorage — userToken state may not be restored yet
          refreshMyOrders(localStorage.getItem('user_token'));
          return;
        } catch (err) {
          console.error(`[HitPay] confirm attempt ${i} failed:`, err?.message ?? err);
          if (i < MAX) await new Promise(r => setTimeout(r, 1500));
        }
      }
      // All confirm attempts failed — try reading order directly from DB
      try {
        const orderResp = await orderApi.getOrder(parseInt(orderId, 10));
        const order     = orderResp?.data ?? orderResp;
        if (order?.payment_status === 'succeeded') {
          setOrderRef(order.order_ref ?? null);
          if (order.total_price != null) setConfirmedTotal(parseFloat(order.total_price));
          setPayState('success');
          refreshMyOrders(localStorage.getItem('user_token'));
          return;
        }
      } catch (_) {}
      setPayState('failed');
    };

    confirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async (showSpinner = false) => {
    if (showSpinner) setLoadingProducts(true);
    try {
      const resp = await productApi.getProducts();
      const rawProducts = resp?.data ?? resp;
      const transformedProducts = rawProducts.map(product => {
        const firstVariant = product.variants?.[0];
        const rawPrice = firstVariant?.price != null ? parseFloat(firstVariant.price) : 0;
        const price = `$${Number.isInteger(rawPrice) ? rawPrice : rawPrice}`;
        const staticData = fallbackVarieties.find(v => v.name.toLowerCase() === product.name.toLowerCase()) || {};
        return {
          id: product.id,
          variantId: firstVariant?.id,
          name: product.name,
          price,
          tag: product.tag || staticData.tag || 'Standard',
          season: `${product.season_start || 'Jan'}–${product.season_end || 'Dec'}`,
          origin: product.origin || staticData.origin || 'India',
          desc: product.description || staticData.desc || 'Premium mango variety',
          variants: product.variants,
          emoji: staticData.emoji || '🥭',
          image: staticData.image,
          imgHeight: staticData.imgHeight || 130,
          original_price: null,
          weight_approx: firstVariant?.box_weight != null ? `${firstVariant.box_weight}kg` : (staticData.weight_approx || null),
          local_names: staticData.local_names || [],
          is_active: product.is_active ?? 1,
        };
      });
      const order = fallbackVarieties.map(v => v.name.toLowerCase());
      transformedProducts.sort((a, b) => {
        const ai = order.indexOf(a.name.toLowerCase());
        const bi = order.indexOf(b.name.toLowerCase());
        const ar = ai === -1 ? Infinity : ai;
        const br = bi === -1 ? Infinity : bi;
        return ar - br;
      });
      setProducts(transformedProducts);
    } catch (err) {
      console.error('Failed to load products from API:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // When admin switches back to store view, silently refresh prices in background
  const prevAdminView = useRef(null);
  useEffect(() => {
    if (prevAdminView.current === 'admin' && adminView === 'store') loadProducts(false);
    prevAdminView.current = adminView;
  }, [adminView]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/config`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setSiteConfig(json.data);
        }
      } catch (_) {}
    };
    loadConfig();
  }, []);

  useEffect(() => {
    setLoadingPickupLocations(true);
    locationApi.getPickupLocations()
      .then(resp => setPickupLocations(resp?.data ?? resp))
      .catch(() => {})
      .finally(() => setLoadingPickupLocations(false));
  }, []);

  // Derived cart values
  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.price.replace('$', '')) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const delivery = 0; // kept for API compatibility; delivery fee is determined at checkout by postal code

  // Cart handlers
  const addToCart = (v) => {
    setCart(c => {
      const existing = c.find(i => i.id === v.id);
      if (existing) return c.map(i => i.id === v.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...v, qty: 1 }];
    });
    setToast(`${v.name} added to cart!`);
    setTimeout(() => setToast(null), 2500);
  };

  const updateQty = (id, delta) => {
    setCart(c => c.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const removeFromCart = (id) => setCart(c => c.filter(i => i.id !== id));

  // Contact form
  const handleFormChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleFormSubmit = () => {
    setToast("Message sent! We'll get back to you within 24 hours.");
    setForm({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });
    setTimeout(() => setToast(null), 3000);
  };

  // Chatbot
  const pushBotMsg = (text, type, data) => {
    setChatMessages(m => [...m, { from: 'bot', text, type, data }]);
  };

  const sendMessage = (text) => {
    const msg = text || chatInput.trim();
    if (!msg) return;
    setChatInput('');
    setChatMessages(m => [...m, { from: 'user', text: msg }]);
    setChatTyping(true);

    const lower = msg.toLowerCase();
    const addMatch = products.find(v =>
      lower.includes(v.name.toLowerCase().split(' ')[0].toLowerCase()) &&
      (lower.includes('add') || lower.includes('order') || lower.includes('want') || lower.includes('buy') || lower.includes('get'))
    );
    const isVarietyPicker = !addMatch && /varieties|order mango|browse|show.*mango|what.*mango|our mango|see.*mango|which mango|pick.*mango|select.*mango|choose.*mango/i.test(msg);
    const isViewCart = /my cart|view cart|show cart|cart/i.test(msg) && !lower.includes('add');
    const isCheckout = /checkout|pay now|proceed|place order|make payment/i.test(msg);

    setTimeout(() => {
      setChatTyping(false);
      if (addMatch) {
        if (addMatch.is_active === 0) {
          pushBotMsg(`Sorry, **${addMatch.name}** is currently out of stock. 😔\n\nTry another variety — say "show varieties" to see what's available!`, null, null);
        } else {
          addToCart(addMatch);
          pushBotMsg(`✅ Added **${addMatch.name}** (${addMatch.price}/box) to your cart!\n\nWant to add more or say "my cart" to review your order.`, null, null);
        }
      } else if (isVarietyPicker) {
        pushBotMsg('Here are all our premium mango varieties — tap **Add +** to add any to your cart! 🥭', 'variety-picker', null);
      } else if (isViewCart) {
        pushBotMsg('', 'cart-view', null);
      } else if (isCheckout) {
        if (cart.length === 0) {
          pushBotMsg("Your cart is empty! Add a mango variety first — try saying 'Add Alphonso' or 'Order Mallika'. 🥭", null, null);
        } else {
          pushBotMsg('', 'pay-options', null);
        }
      } else {
        setChatMessages(m => [...m, { from: 'bot', text: getBotReply(msg, products) }]);
      }
    }, 900 + Math.random() * 400);
  };

  return (
    <AppContext.Provider value={{
      // Navigation
      page, setPage,
      focusLocationId, setFocusLocationId,
      checkoutPickupName, setCheckoutPickupName,
      // Products
      products, loadingProducts,
      // Region
      region, setRegion,
      // Newsletter
      email, setEmail,
      // Cart
      cart, setCart, cartTotal, cartCount, delivery,
      addToCart, updateQty, removeFromCart,
      // Toast
      toast, setToast,
      // Contact form
      form, handleFormChange, handleFormSubmit,
      // Chat
      chatOpen, setChatOpen,
      chatExpanded, setChatExpanded,
      chatNotif, setChatNotif,
      chatMessages, setChatMessages,
      chatInput, setChatInput,
      chatTyping, chatEndRef,
      pushBotMsg, sendMessage,
      // Payment
      paymentMethod, setPaymentMethod,
      payState, setPayState,
      confirmedTotal,
      orderRef, setOrderRef,
      myOrders, setMyOrders, myOrdersLoading, myOrdersError, refreshMyOrders,
      incompleteOrderId, setIncompleteOrderId,
      // User auth
      user, userToken, showAuthModal, setShowAuthModal,
      loginUser, logoutUser, updateUserPhone,
      // Admin view mode
      adminView, setAdminView, adminInitialTab, setAdminInitialTab,
      // Site config
      siteConfig, setSiteConfig,
      // Pickup locations
      pickupLocations, loadingPickupLocations,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
