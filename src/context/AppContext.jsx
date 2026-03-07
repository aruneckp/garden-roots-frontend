import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { varieties } from '../data/varieties';
import { getBotReply } from '../data/botReplies';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [page, setPage] = useState('home');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' });

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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardForm, setCardForm] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [payState, setPayState] = useState('idle');
  const [orderRef] = useState('GR-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [paynowQrUrl, setPaynowQrUrl] = useState(null);
  const [paynowPiId, setPaynowPiId] = useState(null);
  const paynowPollRef = useRef(null);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping, chatOpen]);

  // Derived cart values
  const cartTotal = cart.reduce((sum, i) => sum + parseInt(i.price.replace('$', '')) * i.qty, 0);
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

  // Payment helpers
  const formatCardNumber = v => v.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = v => { const d = v.replace(/\D/g, '').substring(0, 4); return d.length > 2 ? d.substring(0, 2) + '/' + d.substring(2) : d; };

  // Clean up polling when component unmounts
  useEffect(() => () => { if (paynowPollRef.current) clearInterval(paynowPollRef.current); }, []);

  const handlePay = async () => {
    if (paymentMethod === 'paynow') {
      setPayState('processing');
      try {
        const res = await fetch(`${API_URL}/api/create-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: cartTotal + delivery,
            description: `Garden Roots Order ${orderRef}`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not create payment');

        setPaynowQrUrl(data.qr_image_url);
        setPaynowPiId(data.payment_intent_id);
        setPayState('qr_shown');

        // Poll every 3 s until Stripe confirms payment
        paynowPollRef.current = setInterval(async () => {
          try {
            const r = await fetch(`${API_URL}/api/payment-status/${data.payment_intent_id}`);
            const d = await r.json();
            if (d.status === 'succeeded') {
              clearInterval(paynowPollRef.current);
              setPayState('success');
            } else if (d.status === 'requires_payment_method') {
              // PayNow QR code expired
              clearInterval(paynowPollRef.current);
              setPaynowQrUrl(null);
              setPaynowPiId(null);
              setPayState('expired');
            } else if (d.status === 'canceled') {
              clearInterval(paynowPollRef.current);
              setPaynowQrUrl(null);
              setPaynowPiId(null);
              setPayState('idle');
              setToast('Payment was canceled.');
              setTimeout(() => setToast(null), 3000);
            }
          } catch (_) { /* network glitch — keep polling */ }
        }, 3000);
      } catch (err) {
        setToast(`Payment error: ${err.message}`);
        setTimeout(() => setToast(null), 4000);
        setPayState('idle');
      }
      return;
    }

    // Card / GrabPay — mock for now
    setPayState('processing');
    setTimeout(() => setPayState('success'), 2200);
  };

  const cancelPaynow = () => {
    if (paynowPollRef.current) clearInterval(paynowPollRef.current);
    setPaynowQrUrl(null);
    setPaynowPiId(null);
    setPayState('idle');
  };

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
    const addMatch = varieties.find(v =>
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
      cardForm, setCardForm,
      payState, setPayState,
      orderRef,
      formatCardNumber, formatExpiry,
      handlePay,
      paynowQrUrl, paynowPiId, cancelPaynow,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
