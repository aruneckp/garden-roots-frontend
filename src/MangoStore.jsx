import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import VarietiesSection from './components/VarietiesSection';
import WhyUs from './components/WhyUs';
import Reviews from './components/Reviews';
import Newsletter from './components/Newsletter';
import Footer from './components/Footer';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import PickupLocations from './components/PickupLocations';
import Chatbot from './components/Chatbot';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AuthModal from './components/AuthModal';
import MyBookings from './components/MyBookings';
import DeliveryLogin from './components/DeliveryLogin';
import DeliveryPortal from './components/DeliveryPortal';

function StoreContent() {
  const { page, toast, showAuthModal } = useApp();

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

      <Chatbot />

      {showAuthModal && <AuthModal />}
    </>
  );
}


export default function MangoStore() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isAdminPage    = window.location.pathname.includes('/admin');
    const isDeliveryPage = window.location.pathname.includes('/delivery');

    if (isAdminPage) setShowAdmin(true);
    if (isDeliveryPage) setShowDelivery(true);

    setIsReady(true);
  }, []);

  const handleAdminLoginSuccess = () => {
    setShowAdmin(true);
    if (!window.location.pathname.includes('/admin'))
      window.history.pushState({}, '', '/admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setShowAdmin(false);
    window.location.href = '/';
  };

  const handleDeliveryLoginSuccess = () => {
    setShowDelivery(true);
    if (!window.location.pathname.includes('/delivery'))
      window.history.pushState({}, '', '/delivery');
  };

  const handleDeliveryLogout = () => {
    localStorage.removeItem('delivery_token');
    localStorage.removeItem('delivery_user');
    setShowDelivery(false);
    window.location.href = '/';
  };

  if (!isReady) return <div>Loading...</div>;

  // Delivery portal
  if (showDelivery) {
    const token = localStorage.getItem('delivery_token');
    if (!token) return <DeliveryLogin onLoginSuccess={handleDeliveryLoginSuccess} />;
    return <DeliveryPortal onLogout={handleDeliveryLogout} />;
  }

  // Admin panel
  if (showAdmin) {
    const token = localStorage.getItem('admin_token');
    if (!token) return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
    return <AdminDashboard onLogout={handleAdminLogout} />;
  }

  // Customer store
  return (
    <AppProvider>
      <StoreContent />
    </AppProvider>
  );
}
