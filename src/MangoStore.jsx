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

function StoreContent() {
  const { page, toast, showAuthModal, user, logoutUser, adminView, adminInitialTab } = useApp();

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

      <Chatbot />

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
