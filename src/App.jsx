import { BookingProvider } from './context/BookingContext';
import BookingApp from './BookingApp';
import './styles/main.css';

export default function App() {
  return (
    <BookingProvider>
      <BookingApp />
    </BookingProvider>
  );
}
