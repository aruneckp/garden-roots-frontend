import { reviews } from '../data/reviews';

export default function Reviews() {
  return (
    <section className="reviews-section">
      <div className="reviews-inner">
        <div className="section-label">What Our Customers Say</div>
        <h2 className="section-title">Loved Across Singapore</h2>
        <p className="section-sub">Real reviews from mango lovers who trust Garden Roots every season.</p>
        <div className="reviews-grid">
          {reviews.map(r => (
            <div className="review-card" key={r.id}>
              <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
              <p className="review-text">"{r.text}"</p>
              <div className="review-author">
                <div className="review-avatar">{r.name[0]}</div>
                <div>
                  <div className="review-name">{r.name}</div>
                  <div className="review-location">📍 {r.location}</div>
                </div>
                <div className="review-date">{r.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
