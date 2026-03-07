export default function AboutUs() {
  return (
    <>
      <div className="about-hero">
        <div className="about-hero-inner">
          <div className="hero-badge" style={{ margin: '0 auto 20px' }}>✦ Our Story Since 2019</div>
          <h1>Rooted in Passion,<br />Grown with <em>Purpose</em></h1>
          <p>What started as a childhood love for mangoes became a mission — to bring the most authentic, premium Indian mangoes straight to your doorstep in Singapore.</p>
        </div>
      </div>

      <div className="about-stats">
        <div className="about-stats-inner">
          <div className="about-stat"><strong>6+</strong><span>Years of Passion</span></div>
          <div className="about-stat"><strong>5</strong><span>Mango Varieties</span></div>
          <div className="about-stat"><strong>1000+</strong><span>Happy Customers</span></div>
          <div className="about-stat"><strong>100%</strong><span>Direct from Farms</span></div>
        </div>
      </div>

      <div className="about-story">
        <div className="about-story-visual">🥭</div>
        <div className="about-story-text">
          <div className="section-label">How It All Began</div>
          <h2>A Childhood Born Among Mango Orchards</h2>
          <p>Growing up, mangoes weren't just a fruit — they were a ritual. Every summer, our family would gather around crates of freshly harvested Alphonso and Kesar, savouring each bite as a celebration of the season. We knew the difference between a Dasheri and a Langra before we knew anything else about fruit.</p>
          <p>That deep-rooted familiarity with mango varieties, their origins, textures, and flavours, became the foundation of everything we do at Garden Roots. When we moved to Singapore in 2019, we couldn't find mangoes that matched what we grew up with — so we decided to bring them ourselves.</p>
          <p>We source directly from the same orchards we've known for decades, air-fly them at peak ripeness, and deliver them to your door. Every crate we ship carries not just fruit, but a piece of home.</p>
        </div>
      </div>

      <div className="about-timeline">
        <div className="about-timeline-inner">
          <h2>Our Journey</h2>
          <div className="timeline-list">
            {[
              { year: 'Childhood', title: 'The Mango Obsession Begins', desc: 'Growing up surrounded by mango orchards in India, we developed an intimate knowledge of varieties, seasons, and what makes each one unique — from the buttery Alphonso to the bold Imam Pasand.' },
              { year: '2019', title: 'Garden Roots is Founded', desc: 'After moving to Singapore and finding no source for authentic Indian mangoes, we launched Garden Roots — starting small, building relationships with trusted farmers back home, and fulfilling our first orders by hand.' },
              { year: '2021', title: 'Expanding the Collection', desc: 'Growing demand allowed us to expand beyond Alphonso. We introduced Mallika, Banganapalli, Chandura, and Imam Pasand — each sourced from distinct Indian regions and air-flown at peak ripeness.' },
              { year: '2023', title: 'Mango Products Range', desc: 'We launched a curated range of mango products — aamras, mango pickles, mango powder (amchur), and dried mango — bringing the full spectrum of India\'s mango culture to Singapore kitchens.' },
              { year: '2026', title: 'Our Best Season Yet', desc: 'With thousands of happy customers across Singapore, we continue to grow — driven by the same passion that started it all: putting the perfect mango in your hands.' },
            ].map((item, i) => (
              <div className="timeline-item" key={i}>
                <div className="timeline-year">{item.year}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="about-values">
        <div className="about-values-header">
          <div className="section-label">What Drives Us</div>
          <h2 className="section-title">Our Core Values</h2>
        </div>
        <div className="about-values-grid">
          {[
            { icon: '🌳', title: 'Farm-First Sourcing', desc: 'We work directly with orchards we\'ve known for decades — no middlemen, no compromise. Every variety is chosen by us personally, from farmers we trust.' },
            { icon: '🎓', title: 'Deep Varietal Knowledge', desc: 'We don\'t just sell mangoes — we know them. From origin stories to flavour profiles, we curate each variety with expertise built over a lifetime of experience.' },
            { icon: '✈️', title: 'Air-Flown at Peak Ripeness', desc: 'Timing is everything. We air-freight every shipment at the precise moment of peak ripeness so what arrives at your door is as good as picking it from the tree yourself.' },
          ].map((v, i) => (
            <div className="value-card" key={i}>
              <span className="value-icon">{v.icon}</span>
              <h4>{v.title}</h4>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="about-mission">
        <div className="section-label">Our Mission</div>
        <blockquote>"To bring the authentic taste of India's finest orchards to every home in Singapore — one perfect mango at a time."</blockquote>
        <cite>— The Garden Roots Family</cite>
      </div>
    </>
  );
}
