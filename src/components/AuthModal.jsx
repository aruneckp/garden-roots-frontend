import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { authApi, userApi } from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, loginUser, updateUserPhone, setToast, userToken, user } = useApp();
  const googleBtnRef = useRef(null);
  const [step, setStep] = useState('login'); // 'login' | 'phone'
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);

  // Initialise Google Identity Services whenever the modal opens
  useEffect(() => {
    if (!showAuthModal || step !== 'login') return;
    if (!window.google) return;

    // Cancel if already initialised (React StrictMode fires effects twice in dev)
    let cancelled = false;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => { if (!cancelled) handleGoogleCredential(response); },
    });

    if (googleBtnRef.current) {
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 280,
      });
    }

    return () => { cancelled = true; };
  }, [showAuthModal, step]);

  const handleGoogleCredential = async (response) => {
    setAuthenticating(true);
    try {
      const result = await authApi.googleLogin(response.credential);
      const data = result?.data ?? result;
      const { token, user: userData, needs_phone } = data;

      if (needs_phone) {
        // Hold token + user until phone is collected
        setPendingToken(token);
        setPendingUser(userData);
        setStep('phone');
      } else {
        loginUser(token, userData);
        setShowAuthModal(false);
        setToast(`Welcome back, ${userData.name || userData.email}! 🥭`);
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      setToast(`Login failed: ${err.message}`);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      await userApi.updatePhone(pendingToken, phone.trim());
      const updatedUser = { ...pendingUser, phone: phone.trim() };
      loginUser(pendingToken, updatedUser);
      setShowAuthModal(false);
      setToast(`Welcome, ${updatedUser.name || updatedUser.email}! 🥭`);
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(`Could not save phone: ${err.message}`);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipPhone = () => {
    loginUser(pendingToken, pendingUser);
    setShowAuthModal(false);
    setToast(`Welcome, ${pendingUser.name || pendingUser.email}! 🥭`);
    setTimeout(() => setToast(null), 3000);
  };

  if (!showAuthModal) return null;

  return (
    <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>✕</button>

        {step === 'login' && authenticating && (
          <div className="auth-authenticating">
            <div className="auth-spinner" />
            <p className="auth-authenticating-text">Authenticating…</p>
          </div>
        )}

        {step === 'login' && !authenticating && (
          <>
            <div className="auth-modal-logo">🌿 Garden<span>Roots</span></div>
            <h2 className="auth-modal-title">Sign in to your account</h2>
            <p className="auth-modal-sub">
              Track your mango orders and manage bookings — all in one place.
            </p>
            <div className="auth-google-btn-wrap" ref={googleBtnRef} />
            <p className="auth-modal-terms">
              By signing in you agree to our Terms &amp; Privacy Policy.
            </p>
          </>
        )}

        {step === 'phone' && (
          <>
            <div className="auth-modal-logo">🌿 Garden<span>Roots</span></div>
            <h2 className="auth-modal-title">Add your phone number</h2>
            <p className="auth-modal-sub">
              We use your number for order updates and delivery coordination.
            </p>
            <div className="auth-phone-field">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+65 9xxx xxxx"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePhone()}
              />
            </div>
            <button
              className="btn-primary auth-save-btn"
              onClick={handleSavePhone}
              disabled={saving || !phone.trim()}
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
            <button className="auth-skip-btn" onClick={handleSkipPhone}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
