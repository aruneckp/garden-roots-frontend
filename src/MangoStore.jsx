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

function StoreContent() {
  const { page, toast } = useApp();

  return (
    <>
      <Navbar />

      {page === 'cart' && <Cart />}
      {page === 'checkout' && <Checkout />}
      {page === 'about-us' && <AboutUs />}
      {page === 'contact-us' && <ContactUs />}
      {page === 'pickup-locations' && <PickupLocations />}

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
