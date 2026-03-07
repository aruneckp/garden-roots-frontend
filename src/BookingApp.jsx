import { useBooking } from './context/BookingContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import Toast from './components/Toast';

// Pages
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import CheckoutPage from './pages/CheckoutPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ProfilePage from './pages/ProfilePage';
import AuthPages from './pages/AuthPages';

export default function BookingApp() {
  const { page, isAuthenticated, userType } = useBooking();

  return (
    <div className="app-container">
      <Navbar />

      <div className="app-content">
        {!isAuthenticated && (page === 'login' || page === 'signup') ? (
          <AuthPages />
        ) : (
          <>
            {page === 'home' && <HomePage />}
            {page === 'booking' && isAuthenticated && <BookingPage />}
            {page === 'checkout' && isAuthenticated && <CheckoutPage />}
            {page === 'myBookings' && isAuthenticated && <MyBookingsPage />}
            {page === 'profile' && isAuthenticated && <ProfilePage />}
          </>
        )}
      </div>

      {isAuthenticated && <Chatbot />}
      <Toast />
      <Footer />
    </div>
  );
}
