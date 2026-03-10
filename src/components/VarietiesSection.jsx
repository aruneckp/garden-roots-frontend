import { useApp } from '../context/AppContext';
import { varieties as fallbackVarieties } from '../data/varieties';

export default function VarietiesSection() {
  const { addToCart, products, loadingProducts } = useApp();
  const varietiesToShow = products.length > 0 ? products : fallbackVarieties;

  return (
    <section className="section" id="varieties">
      <div className="section-inner">
        <div className="section-label">Our Collection</div>
        <h2 className="section-title">Mango Varieties</h2>
        <p className="section-sub">Each variety tells a story of its origin — a distinct personality, sweetness, and aroma.</p>
        <div className="varieties-grid">
          {varietiesToShow.map(v => (
            <div className="variety-card" key={v.id}>
              <div className="variety-img" style={{ height: v.imgHeight || 180 }}>
                {v.image
                  ? <img src={v.image} alt={v.name} />
                  : v.emoji}
              </div>
              <div className="variety-body">
                <span className="tag-badge">{v.tag}</span>
                <div className="variety-name">{v.name}</div>
                <div className="variety-origin">{v.origin} · {v.season}</div>
                <div className="variety-desc">{v.desc}</div>
                <div className="variety-footer">
                  <span className="variety-price">
                    {v.price} <small style={{ fontSize: 11, color: '#A8A29E', fontWeight: 400 }}>/ box</small>
                  </span>
                  <button className="btn-add" onClick={() => addToCart(v)}>+ Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
