import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VarietiesSection from './components/VarietiesSection';
import WhyUs from './components/WhyUs';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import PickupLocations from './components/PickupLocations';
import Chatbot from './components/Chatbot';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import MyBookings from './components/MyBookings';
import DeliveryPortal from './components/DeliveryPortal';

const CTA_MESSAGES = [
  'Complete Order in 30 secs',
  '30 సెకన్లలో ఆర్డర్ పూర్తి చేయండి',
  '30 விநாடிகளில் ஆர்டரை முடிக்கவும்',
  '30 ಸೆಕೆಂಡ್‌ನಲ್ಲಿ ಆರ್ಡರ್ ಪೂರ್ಣಗೊಳಿಸಿ',
  '30 सेकंड में ऑर्डर पूरा करें',
];

function StoreContent() {
  const { page, toast, showAuthModal, user, logoutUser, adminView, adminInitialTab, setChatOpen } = useApp();

  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  // Scroll to vertical midpoint on every page change
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
  }, [page]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % CTA_MESSAGES.length);
        setMsgVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Delivery role always goes to delivery portal
  if (user?.role === 'delivery') {
    return <DeliveryPortal onLogout={logoutUser} />;
  }

  // Admin: switch between admin dashboard and customer store
  if (user?.role === 'admin' && adminView === 'admin') {
    return <AdminDashboard onLogout={logoutUser} defaultTab={adminInitialTab} />;
  }

  // Default: customer store (admins land here too, so they can book on behalf of customers)
  return (
    <>
      <Navbar />

      {page === 'cart' && <Cart />}
      {page === 'checkout' && <Checkout />}
      {page === 'about-us' && <AboutUs />}
      {page === 'contact-us' && <ContactUs />}
      {page === 'pickup-locations' && <PickupLocations />}
      {page === 'my-bookings' && <MyBookings />}
      {page === 'varieties' && <VarietiesSection />}

      {page === 'home' && (
        <>
          <Hero />
          <VarietiesSection />
          <WhyUs />
          {/* <Reviews /> */}
          <Newsletter />
        </>
      )}

      <Footer />

      {toast && <div className="toast">{toast}</div>}

      {/* Chatbot CTA strip + chatbot — home page only */}
      {page === 'home' && <div className="chatbot-cta-strip">
        <div className="chatbot-cta-text-wrap" onClick={() => setChatOpen(true)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setChatOpen(true)}>
          {CTA_MESSAGES.map((msg, i) => (
            <span
              key={i}
              className={`chatbot-cta-msg${i === msgIndex && msgVisible ? ' visible' : ''}`}
            >
              <svg className="chatbot-cta-clock" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10.5" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                <line x1="12" y1="2.5" x2="12" y2="4.5"   stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="12" y1="19.5" x2="12" y2="21.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="2.5" y1="12" x2="4.5" y2="12"   stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="19.5" y1="12" x2="21.5" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="17.8" y1="4.1"  x2="17" y2="5.4"  stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
                <line x1="6.2"  y1="4.1"  x2="7"  y2="5.4"  stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
                <line x1="17.8" y1="19.9" x2="17" y2="18.6" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
                <line x1="6.2"  y1="19.9" x2="7"  y2="18.6" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
                <line x1="12" y1="12" x2="12"  y2="7"    stroke="white" strokeWidth="2"   strokeLinecap="round" />
                <line x1="12" y1="12" x2="15.5" y2="13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="12" r="1.2" fill="white" />
              </svg>
              {msg}
            </span>
          ))}
        </div>
        <button className="chatbot-cta-btn" onClick={() => setChatOpen(true)}>
          <img src="/mango_chatbot.jpg" alt="Rooty" className="chatbot-cta-img" />
        </button>
      </div>}

      {page === 'home' && <Chatbot hideFab={true} />}

      {showAuthModal && <AuthModal />}
    </>
  );
}

export default function MangoStore() {
  return (
    <AppProvider>
      <StoreContent />
    </AppProvider>
  );
}
