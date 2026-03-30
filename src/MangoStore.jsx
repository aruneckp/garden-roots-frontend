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
          <Reviews />
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

function AdminContent({ onLogout }) {
  return <AdminDashboard onLogout={onLogout} />;
}

export default function MangoStore() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdminReady, setIsAdminReady] = useState(false);

  useEffect(() => {
    // Check if admin token exists
    const token = localStorage.getItem('admin_token');
    const isAdminPage = window.location.pathname.includes('/admin');

    if (token && isAdminPage) {
      setShowAdmin(true);
    } else if (isAdminPage && !token) {
      // User is trying to access admin without token, show login
      setShowAdmin(true);
    }

    setIsAdminReady(true);
  }, []);

  const handleAdminLoginSuccess = () => {
    setShowAdmin(true);
    // Keep the user on admin page
    if (!window.location.pathname.includes('/admin')) {
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setShowAdmin(false);
    window.location.href = '/';
  };

  if (!isAdminReady) {
    return <div>Loading...</div>;
  }

  // Show admin panel if user is on /admin or has token
  if (showAdmin) {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      return <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />;
    }
    return <AdminContent onLogout={handleAdminLogout} />;
  }

  // Show store
  return (
    <AppProvider>
      <StoreContent />
    </AppProvider>
  );
}
