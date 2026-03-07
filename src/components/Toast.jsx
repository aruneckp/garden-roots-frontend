import { useBooking } from '../context/BookingContext';
import { useEffect } from 'react';

export default function Toast() {
  const { toast, setToast } = useBooking();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`}>
      {toast.type === 'success' && '✓ '}
      {toast.type === 'error' && '✗ '}
      {toast.type === 'info' && 'ℹ '}
      {toast.message}
    </div>
  );
}
