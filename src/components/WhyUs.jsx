const whyItems = [
  { icon: '🌱', title: 'Direct from Farms', desc: 'Sourced directly from trusted orchards in India, bypassing all middlemen for maximum freshness.' },
  { icon: '✈️', title: 'Air-Flown Fresh', desc: 'Air-freighted at peak ripeness so they arrive in perfect condition, ready to enjoy.' },
  { icon: '✅', title: 'Quality Assured', desc: 'Every crate is hand-inspected and graded before dispatch. Only the finest make the cut.' },
];

export default function WhyUs() {
  return (
    <section className="why-section">
      <div className="why-inner">
        <div className="section-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Our Promise</div>
        <h2 className="section-title" style={{ color: '#fff' }}>Why Choose Garden Roots?</h2>
        <div className="why-grid">
          {whyItems.map((w, i) => (
            <div className="why-card" key={i}>
              <span className="why-icon">{w.icon}</span>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
