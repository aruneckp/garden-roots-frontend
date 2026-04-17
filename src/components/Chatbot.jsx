import { useState, useEffect } from 'react';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { useApp } from '../context/AppContext';
import { QUICK_REPLIES } from '../data/botReplies';

const FAB_TIPS = [
  { emoji: '⚡', text: 'Order in 30 seconds!' }
];

export default function Chatbot({ hideFab = false }) {
  const {
    cart, cartTotal, cartCount,
    products,
    chatOpen, setChatOpen,
    chatExpanded, setChatExpanded,
    chatNotif, setChatNotif,
    chatMessages, chatInput, setChatInput,
    chatTyping, chatEndRef,
    sendMessage,
    setPaymentMethod, setPayState, setPage,
    addToCart, removeFromCart,
  } = useApp();

  const varieties = products;

  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);

  useEffect(() => {
    if (chatOpen) return;
    const id = setInterval(() => setTipIndex(i => (i + 1) % FAB_TIPS.length), 4000);
    return () => clearInterval(id);
  }, [chatOpen]);

  return (
    <>
      {chatOpen && (
        <div className={`chat-window${chatExpanded ? ' expanded' : ''}`}>
          <div className="chat-header">
            <div className="chat-avatar">🌿</div>
            <div className="chat-header-info">
              <strong>Rooty – Garden Roots</strong>
              <span><span className="chat-online" />Online · We'll reply as soon as we can</span>
            </div>
            <div className="chat-header-actions">
              <button
                className="chat-icon-btn"
                onClick={() => setChatExpanded(e => !e)}
                title={chatExpanded ? 'Minimise' : 'Expand'}
              >
                {chatExpanded ? '⊙' : '⊕'}
              </button>
              <button className="chat-icon-btn" onClick={() => setChatOpen(false)}>✕</button>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((m, i) => (
              <div className={`chat-msg ${m.from}`} key={i}>
                {m.from === 'bot' && <div className="chat-bot-avatar">🥭</div>}

                {m.type === 'cart-view' ? (
                  <div>
                    {cart.length === 0 ? (
                      <div className="chat-bubble" style={{ background: '#fff', color: 'var(--text)' }}>
                        Your cart is empty! Try saying "Add Alphonso" to get started. 🛒
                      </div>
                    ) : (
                      <>
                        <div className="chat-cart-view">
                          <div className="chat-cart-header">🛒 Your Cart ({cartCount} item{cartCount > 1 ? 's' : ''})</div>
                          {cart.map(item => (
                            <div className="chat-cart-item" key={item.id}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {item.image
                                  ? <img src={item.image} alt={item.name} className="chat-cart-item-img" />
                                  : <span>{item.emoji}</span>}
                                {item.name} ×{item.qty}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--green)' }}>${parseFloat(item.price.replace('$', '')) * item.qty}</span>
                            </div>
                          ))}
                          <div className="chat-cart-total">
                            <span>Subtotal</span>
                            <span>${cartTotal} SGD</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'right' }}>
                            Delivery fee calculated at checkout based on your address
                          </div>
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="chat-quick-btn" onClick={() => { setChatOpen(false); setPage('cart'); }}>View Cart →</button>
                          <button className="chat-quick-btn" onClick={() => sendMessage('checkout')}>Checkout 💳</button>
                        </div>
                      </>
                    )}
                  </div>
                ) : m.type === 'variety-picker' ? (
                  <div>
                    <div className="chat-bubble" style={{ background: '#fff', color: 'var(--text)', marginBottom: 8, whiteSpace: 'pre-line' }}>{m.text}</div>
                    <div className="chat-variety-picker">
                      <div className="chat-variety-picker-header">🥭 Our Varieties</div>
                      {varieties.map(v => {
                        const inCart = cart.find(i => i.id === v.id);
                        return (
                          <div className="chat-variety-row" key={v.id}>
                            <div className="chat-variety-left">
                              {v.image
                                ? <img src={v.image} alt={v.name} className="chat-variety-img" />
                                : <span className="chat-variety-emoji">{v.emoji}</span>}
                              <div>
                                <div className="chat-variety-name">{v.name}</div>
                                <div className="chat-variety-price">{v.price}/box <span className="chat-variety-tag">· {v.tag}</span></div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                              {v.is_active === 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>Out of Stock</span>
                              ) : (
                                <>
                                  {inCart && (
                                    <button
                                      className="chat-variety-clear"
                                      onClick={() => removeFromCart(v.id)}
                                      title="Remove from cart"
                                    >
                                      <RiDeleteBin6Line />
                                    </button>
                                  )}
                                  <button
                                    className={`chat-variety-add${inCart ? ' in-cart' : ''}`}
                                    onClick={() => addToCart(v)}
                                  >
                                    {inCart ? `In Cart (${inCart.qty})` : 'Add +'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="chat-quick-btn" onClick={() => sendMessage('my cart')}>View Cart 🛒</button>
                    </div>
                  </div>
                ) : m.type === 'pay-options' ? (
                  <div>
                    <div className="chat-bubble" style={{ background: '#fff', color: 'var(--text)', marginBottom: 8 }}>
                      Subtotal: <strong>${cartTotal} SGD</strong>. Delivery fee will be calculated based on your address at checkout.
                    </div>
                    <div className="chat-pay-options">
                      <button className="chat-pay-btn paynow" onClick={() => { setChatOpen(false); setPaymentMethod('paynow'); setPayState('idle'); setPage('checkout'); }}>
                        📱 Pay with PayNow QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="chat-bubble" style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
                )}
              </div>
            ))}

            {chatTyping && (
              <div className="chat-msg bot">
                <div className="chat-bot-avatar">🥭</div>
                <div className="chat-typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-quick-replies">
            {QUICK_REPLIES.map(q => (
              <button key={q} className="chat-quick-btn" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Type a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="chat-send" onClick={() => sendMessage()}>➤</button>
          </div>
        </div>
      )}

      {/* Tip bubble */}
      {!chatOpen && tipVisible && !hideFab && (
        <div className="chat-tip-bubble" key={tipIndex}>
          <button className="chat-tip-close" onClick={() => setTipVisible(false)}>✕</button>
          <span className="chat-tip-emoji">{FAB_TIPS[tipIndex].emoji}</span>
          {FAB_TIPS[tipIndex].text}
        </div>
      )}

      {/* Chat FAB — primary, above WhatsApp */}
      {!hideFab && (
        <button className="chat-fab" onClick={() => { setChatOpen(o => !o); setChatNotif(false); }}>
          {chatOpen ? (
            <span style={{ fontSize: 22, color: '#fff', fontWeight: 700 }}>✕</span>
          ) : (
            <img src="/mango_chatbot.jpg" alt="Chat with Rooty" className="chat-fab-img" />
          )}
          {chatNotif && !chatOpen && <span className="chat-notif" />}
        </button>
      )}

      {/* WhatsApp FAB — secondary, below chatbot */}
      {!hideFab && (
        <a
          className="wa-fab"
          href="https://wa.me/6581601289?text=Hi Garden Roots! I'd like to enquire about your mangoes."
          target="_blank"
          rel="noreferrer"
          title="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}
    </>
  );
}
