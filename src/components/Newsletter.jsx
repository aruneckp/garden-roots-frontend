import { useApp } from '../context/AppContext';

export default function Newsletter() {
  const { email, setEmail, setToast } = useApp();

  return (
    <section className="newsletter">
      <div className="section-label">Stay in the Loop</div>
      <h2 className="section-title">Be First to Know</h2>
      <p>Get notified when new varieties land, seasonal deals, and exclusive early-bird pricing.</p>
      <div className="newsletter-form">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <button onClick={() => { setToast('Subscribed! 🎉'); setEmail(''); setTimeout(() => setToast(null), 2500); }}>
          Subscribe
        </button>
      </div>
    </section>
  );
}
