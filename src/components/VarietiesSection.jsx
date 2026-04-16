import { useMemo } from 'react';
import { RiShoppingBasketLine } from 'react-icons/ri';
import { useApp } from '../context/AppContext';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VarietiesSection() {
  const { addToCart, updateQty, cart, products, loadingProducts } = useApp();

  // Shuffle local_names once per mount — stable across re-renders
  const shuffledNames = useMemo(
    () => Object.fromEntries(products.map(v => [v.id, shuffle(v.local_names || [])])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <section className="section" id="varieties">
      <div className="section-inner">
        <div className="section-label">Our Collection</div>
        <h2 className="section-title">Mango Varieties</h2>
        <p className="section-sub">Each variety tells a story of its origin — a distinct personality, sweetness, and aroma.</p>
        {loadingProducts && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading varieties…</div>
        )}
        {!loadingProducts && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>Unable to load products. Please try again later.</div>
        )}
        <div className="varieties-grid">
          {products.map(v => {
            const qty = cart.find(c => c.id === v.id)?.qty || 0;
            const disabled = v.is_active === 0;
            return (
              <div className="variety-card" key={v.id}>

                {/* ── Header: name + weight (right of name) + prices side by side ── */}
                <div className="vc-header">
                  <div className="vc-header-left">
                    <div className="vc-name-row">
                      <div className="vc-name">{v.name}</div>
                      {v.weight_approx && (
                        <div className="vc-weight">{v.weight_approx}</div>
                      )}
                    </div>
                  </div>
                  <div className="vc-header-right">
                    {v.original_price && (
                      <span className="vc-old-price">{v.original_price}</span>
                    )}
                    <span className="vc-price">{v.price}</span>
                  </div>
                </div>

                {/* ── Body: image + local names ── */}
                <div className="vc-body">
                  <div className="vc-img-wrap">
                    {v.image
                      ? <img src={v.image} alt={v.name} className="vc-img" />
                      : <span className="vc-emoji">{v.emoji}</span>}
                  </div>
                  <div className="vc-local-names">
                    {shuffledNames[v.id]?.map((entry, i) => (
                      <span key={entry.lang} className={`vc-lang-name vc-local-${i}`}>
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── Footer: +/- controls + basket ── */}
                <div className="vc-footer">
                  {disabled ? (
                    <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 13, letterSpacing: '0.03em' }}>
                      Out of Stock
                    </span>
                  ) : (
                    <>
                      <div className="vc-qty-controls">
                        <button
                          className="vc-qty-btn add"
                          onClick={e => { e.stopPropagation(); addToCart(v); }}
                        >+</button>
                        <button
                          className="vc-qty-btn sub"
                          onClick={e => { e.stopPropagation(); updateQty(v.id, -1); }}
                          disabled={qty === 0}
                        >−</button>
                      </div>
                      <div
                        className="vc-basket-wrap"
                        onClick={e => { e.stopPropagation(); addToCart(v); }}
                        title={qty === 0 ? 'Add to basket' : `${qty} in basket`}
                      >
                        <RiShoppingBasketLine
                          className={`vc-basket-icon${qty === 0 ? ' empty' : ''}`}
                          aria-hidden="true"
                        />
                        {qty > 0 && <span className="vc-basket-badge">{qty}</span>}
                      </div>
                    </>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
