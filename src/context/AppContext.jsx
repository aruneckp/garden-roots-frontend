import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { varieties as fallbackVarieties } from '../data/varieties';
import { getBotReply } from '../data/botReplies';
import { productApi } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState('home');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
  const [paynowQrUrl, setPaynowQrUrl] = useState(null);
  const [paynowPiId, setPaynowPiId] = useState(null);
  const paynowPollRef = useRef(null);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping, chatOpen]);

  // Load products from API on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const resp = await productApi.getProducts();
        // Backend wraps all responses: { success, data, message }
        const rawProducts = resp?.data ?? resp;
        const transformedProducts = rawProducts.map(product => {
          // Variants have a flat `price` field (current active price from Oracle pricing table)
          const firstVariant = product.variants?.[0];
          // Parse price cleanly: "32.0" → "$32", "38.5" → "$38.5"
          const rawPrice = firstVariant?.price != null ? parseFloat(firstVariant.price) : 0;
          const price = `$${Number.isInteger(rawPrice) ? rawPrice : rawPrice}`;
          // Match static data by name to preserve emoji/image assets
          const staticData = fallbackVarieties.find(v => v.name.toLowerCase() === product.name.toLowerCase()) || {};
          return {
            id: product.id,
            // variantId is the DB variant id — required by the order API
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
          };
        });
        setProducts(transformedProducts);
      } catch (err) {
        console.error('Failed to load products from API, using fallback:', err);
        setProducts(fallbackVarieties);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Derived cart values
  const cartTotal = cart.reduce((sum, i) => sum + parseFloat(i.price.replace('$', '')) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const delivery = cartTotal >= 120 ? 0 : 12;

  // Cart handlers
  const addToCart = (v) => {
    setCart(c => {
      const existing = c.find(i => i.id === v.id);
      if (existing) return c.map(i => i.id === v.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { ...v, qty: 1 }];
    });
    setToast(`${v.name} added to cart! 🛒`);
    setTimeout(() => setToast(null), 2500);
  };

  const updateQty = (id, delta) => {
    setCart(c => c.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));
  };

  const removeFromCart = (id) => setCart(c => c.filter(i => i.id !== id));

  // Clean up polling when component unmounts
  useEffect(() => () => { if (paynowPollRef.current) clearInterval(paynowPollRef.current); }, []);

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
    const varietiesToUse = products.length > 0 ? products : fallbackVarieties;
    const addMatch = varietiesToUse.find(v =>
      lower.includes(v.name.toLowerCase().split(' ')[0].toLowerCase()) &&
      (lower.includes('add') || lower.includes('order') || lower.includes('want') || lower.includes('buy') || lower.includes('get'))
    );
    const isVarietyPicker = !addMatch && /varieties|order mango|browse|show.*mango|what.*mango|our mango|see.*mango|which mango|pick.*mango|select.*mango|choose.*mango/i.test(msg);
    const isViewCart = /my cart|view cart|show cart|cart/i.test(msg) && !lower.includes('add');
    const isCheckout = /checkout|pay now|proceed|place order|make payment/i.test(msg);

    setTimeout(() => {
      setChatTyping(false);
      if (addMatch) {
        addToCart(addMatch);
        pushBotMsg(`✅ Added **${addMatch.name}** (${addMatch.price}/box) to your cart!\n\nWant to add more or say "my cart" to review your order.`, null, null);
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
        setChatMessages(m => [...m, { from: 'bot', text: getBotReply(msg) }]);
      }
    }, 900 + Math.random() * 400);
  };

  return (
    <AppContext.Provider value={{
      // Navigation
      page, setPage,
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
      orderRef, setOrderRef,
      paynowQrUrl, setPaynowQrUrl, paynowPiId, setPaynowPiId,
      cancelPaynow: () => {
        if (paynowPollRef.current) clearInterval(paynowPollRef.current);
        setPaynowQrUrl(null);
        setPaynowPiId(null);
        setPayState('idle');
      },
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
