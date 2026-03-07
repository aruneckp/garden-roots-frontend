import { useApp } from '../context/AppContext';
import { varieties } from '../data/varieties';
import { QUICK_REPLIES } from '../data/botReplies';

export default function Chatbot() {
  const {
    cart, cartTotal, cartCount, delivery,
    chatOpen, setChatOpen,
    chatExpanded, setChatExpanded,
    chatNotif, setChatNotif,
    chatMessages, chatInput, setChatInput,
    chatTyping, chatEndRef,
    sendMessage,
    setPaymentMethod, setPayState, setPage,
    addToCart,
  } = useApp();

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
                              <span>{item.emoji} {item.name} ×{item.qty}</span>
                              <span style={{ fontWeight: 700, color: 'var(--green)' }}>${parseInt(item.price.replace('$', '')) * item.qty}</span>
                            </div>
                          ))}
                          <div className="chat-cart-total">
                            <span>Total{delivery === 0 ? ' (Free delivery!)' : ` (+$${delivery} delivery)`}</span>
                            <span>${cartTotal + delivery} SGD</span>
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
                              <span className="chat-variety-emoji">{v.emoji}</span>
                              <div>
                                <div className="chat-variety-name">{v.name}</div>
                                <div className="chat-variety-price">{v.price}/box <span className="chat-variety-tag">· {v.tag}</span></div>
                              </div>
                            </div>
                            <button
                              className={`chat-variety-add${inCart ? ' in-cart' : ''}`}
                              onClick={() => addToCart(v)}
                            >
                              {inCart ? `In Cart (${inCart.qty})` : 'Add +'}
                            </button>
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
                      Choose how you'd like to pay for your order of <strong>${cartTotal + delivery} SGD</strong>:
                    </div>
                    <div className="chat-pay-options">
                      <button className="chat-pay-btn card" onClick={() => { setChatOpen(false); setPaymentMethod('card'); setPayState('idle'); setPage('checkout'); }}>
                        💳 Pay with Card (Stripe)
                      </button>
                      <button className="chat-pay-btn paynow" onClick={() => { setChatOpen(false); setPaymentMethod('paynow'); setPayState('idle'); setPage('checkout'); }}>
                        📱 Pay with PayNow QR
                      </button>
                      <button className="chat-pay-btn grabpay" onClick={() => { setChatOpen(false); setPaymentMethod('grabpay'); setPayState('idle'); setPage('checkout'); }}>
                        🟢 Pay with GrabPay
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

      {/* WhatsApp floating button */}
      <a
        className="wa-fab"
        href="https://wa.me/6591555947?text=Hi Garden Roots! I'd like to enquire about your mangoes."
        target="_blank"
        rel="noreferrer"
        title="Chat on WhatsApp"
      >
        💬
      </a>

      {/* Chat FAB */}
      <button className="chat-fab" onClick={() => { setChatOpen(o => !o); setChatNotif(false); }}>
        {chatOpen ? '✕' : '🥭'}
        {chatNotif && !chatOpen && <span className="chat-notif" />}
      </button>
    </>
  );
}
