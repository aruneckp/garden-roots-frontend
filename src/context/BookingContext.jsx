import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { getBotReply } from '../data/botReplies';
import { MOCK_USERS, MOCK_BOOKINGS } from '../data/mockData';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  // ============ Auth State ============
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [userType, setUserType] = useState(null); // 'customer' | 'driver' | 'admin'

  // ============ Booking State ============
  const [currentBooking, setCurrentBooking] = useState({
    fromLocation: null,
    toLocation: null,
    vehicleType: null,
    date: null,
    time: null,
    weight: null,
    notes: '',
  });
  const [activeBookings, setActiveBookings] = useState([]);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  // ============ Payment State ============
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'processing' | 'success' | 'failed'
  const [orderRef, setOrderRef] = useState(null);
  const paymentPollRef = useRef(null);

  // ============ Chat State ============
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatNotif, setChatNotif] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      from: 'bot',
      text: "Hi there! 👋 I'm LorryBot, your booking assistant.\n\nI can help you book a lorry, track deliveries, check pricing, or answer any questions!",
      actions: [
        { label: '🚛 Book a Lorry', page: 'booking' },
        { label: '💰 Pricing', trigger: 'pricing info' },
        { label: '📋 My Bookings', page: 'myBookings' },
        { label: '🆘 Help', trigger: 'contact support' },
      ],
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const chatEndRef = useRef(null);

  // ============ Tracking State ============
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [driverLocation, setDriverLocation] = useState({ lat: null, lng: null, timestamp: null });

  // ============ User Bookings State ============
  const [userBookings, setUserBookings] = useState([]);

  // ============ General UI State ============
  const [page, setPage] = useState('home'); // 'home' | 'booking' | 'checkout' | 'myBookings' | 'profile' | 'tracking' | 'driver' | 'admin'
  const [toast, setToast] = useState(null);

  // ============ Effects ============

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping, chatOpen]);

  // Cleanup polling on unmount
  useEffect(() => () => {
    if (paymentPollRef.current) clearInterval(paymentPollRef.current);
  }, []);

  // ============ Auth Handlers ============

  const signup = async (phone, password, role) => {
    setAuthLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    // Check if phone already exists in demo users
    const existing = MOCK_USERS.find((u) => u.phone === phone);
    if (existing) {
      setAuthLoading(false);
      showToast('Phone already registered. Please login.', 'error');
      throw new Error('Phone already registered');
    }
    const newUser = {
      id: `U${Date.now()}`,
      phone,
      password,
      role,
      name: `User ${phone.slice(-4)}`,
      email: '',
    };
    localStorage.setItem('mockUser', JSON.stringify(newUser));
    localStorage.setItem('token', 'mock-token');
    setCurrentUser(newUser);
    setUserType(role);
    setUserBookings([]);
    setIsAuthenticated(true);
    setAuthLoading(false);
    showToast('Signup successful! Welcome to LorryHub.', 'success');
    setPage('home');
    return { user: newUser, token: 'mock-token' };
  };

  const login = async (phone, password) => {
    setAuthLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    // Check demo users first
    const demoUser = MOCK_USERS.find((u) => u.phone === phone && u.password === password);
    if (demoUser) {
      localStorage.setItem('mockUser', JSON.stringify(demoUser));
      localStorage.setItem('token', 'mock-token');
      setCurrentUser(demoUser);
      setUserType(demoUser.role);
      setUserBookings(MOCK_BOOKINGS[demoUser.id] || []);
      setIsAuthenticated(true);
      setAuthLoading(false);
      showToast(`Welcome back, ${demoUser.name.split(' ')[0]}!`, 'success');
      setPage(demoUser.role === 'driver' ? 'driver' : 'home');
      return { user: demoUser, token: 'mock-token' };
    }
    // Check locally signed-up users
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      const localUser = JSON.parse(stored);
      if (localUser.phone === phone && localUser.password === password) {
        localStorage.setItem('token', 'mock-token');
        setCurrentUser(localUser);
        setUserType(localUser.role);
        setUserBookings(JSON.parse(localStorage.getItem(`bookings_${localUser.id}`) || '[]'));
        setIsAuthenticated(true);
        setAuthLoading(false);
        showToast(`Welcome back, ${localUser.name.split(' ')[0]}!`, 'success');
        setPage(localUser.role === 'driver' ? 'driver' : 'home');
        return { user: localUser, token: 'mock-token' };
      }
    }
    setAuthLoading(false);
    showToast('Invalid phone or password', 'error');
    throw new Error('Invalid credentials');
  };

  const addBooking = (booking) => {
    setUserBookings((prev) => {
      const updated = [booking, ...prev];
      // Persist for locally signed-up users
      if (currentUser) {
        localStorage.setItem(`bookings_${currentUser.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setUserType(null);
    setIsAuthenticated(false);
    setPage('home');
    showToast('Logged out successfully', 'success');
  };

  // ============ Booking Handlers ============

  const createBooking = async (fromLoc, toLoc, vehicleTypeId, date, time, weight, notes) => {
    try {
      setPaymentState('processing');
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          from_location: fromLoc,
          to_location: toLoc,
          vehicle_type: vehicleTypeId,
          date,
          time,
          weight,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Booking creation failed');

      setOrderRef(data.booking_id);
      setCurrentBooking({ fromLoc, toLoc, vehicleTypeId, date, time, weight, notes });
      setPaymentState('idle');
      setPage('checkout');
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      setPaymentState('failed');
      throw error;
    }
  };

  const fetchActiveBookings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to fetch bookings');
      setActiveBookings(data.bookings || []);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const fetchAvailableVehicles = async (fromLat, fromLng, toLat, toLng) => {
    try {
      const res = await fetch(
        `${API_URL}/api/vehicles?from_lat=${fromLat}&from_lng=${fromLng}&to_lat=${toLat}&to_lng=${toLng}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      setAvailableVehicles(data.vehicles || []);
      return data.vehicles;
    } catch (error) {
      showToast(error.message, 'error');
      return [];
    }
  };

  // ============ Payment Handlers ============

  const initializePayment = async (amount, description) => {
    try {
      setPaymentState('processing');
      const res = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount,
          description,
          booking_id: orderRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Payment initialization failed');

      // For Razorpay, show the form
      window.Razorpay = data.razorpay_key;
      setPaymentState('waiting_payment');
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      setPaymentState('failed');
      throw error;
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      setPaymentState('processing');
      const res = await fetch(`${API_URL}/api/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Payment confirmation failed');

      setPaymentState('success');
      showToast('Payment successful! Your booking is confirmed.', 'success');
      setPage('myBookings');
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      setPaymentState('failed');
      throw error;
    }
  };

  // ============ Chat Handlers ============

  const sendMessage = async (msg = null) => {
    const message = msg || chatInput;
    if (!message.trim()) return;

    // Add user message
    setChatMessages(msgs => [...msgs, { from: 'user', text: message }]);
    setChatInput('');
    setChatTyping(true);

    // Simulate bot thinking delay
    setTimeout(() => {
      const botReply = getBotReply(message, { user: currentUser, bookings: userBookings });
      setChatMessages(msgs => [...msgs, {
        from: 'bot',
        text: typeof botReply === 'string' ? botReply : botReply.text,
        actions: typeof botReply === 'object' ? (botReply.actions || []) : [],
      }]);
      setChatTyping(false);
    }, 1000);
  };

  // ============ UI Helpers ============

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ============ Context Value ============

  const value = {
    // Auth
    currentUser,
    isAuthenticated,
    authLoading,
    userType,
    signup,
    login,
    logout,

    // Booking
    currentBooking,
    setCurrentBooking,
    activeBookings,
    bookingHistory,
    userBookings,
    addBooking,
    selectedVehicle,
    setSelectedVehicle,
    availableVehicles,
    createBooking,
    fetchActiveBookings,
    fetchAvailableVehicles,

    // Payment
    paymentMethod,
    setPaymentMethod,
    paymentState,
    setPaymentState,
    orderRef,
    initializePayment,
    confirmPayment,

    // Chat
    chatOpen,
    setChatOpen,
    chatExpanded,
    setChatExpanded,
    chatNotif,
    setChatNotif,
    chatMessages,
    chatInput,
    setChatInput,
    chatTyping,
    chatEndRef,
    sendMessage,

    // Tracking
    trackerOpen,
    setTrackerOpen,
    driverLocation,
    setDriverLocation,

    // General UI
    page,
    setPage,
    toast,
    setToast,
    showToast,
  };

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};
