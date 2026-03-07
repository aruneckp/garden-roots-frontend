import { useBooking } from '../context/BookingContext';
import { QUICK_ACTIONS } from '../data/botReplies';

export default function Chatbot() {
  const {
    chatOpen,
    setChatOpen,
    chatExpanded,
    setChatExpanded,
    chatNotif,
    setChatNotif,
    chatMessages,
    chatInput,
    setChatInput,
    chatTyping,
    chatEndRef,
    sendMessage,
    setPage,
  } = useBooking();

  const handleAction = (action) => {
    if (action.page) {
      setPage(action.page);
      setChatOpen(false);
    } else if (action.trigger) {
      sendMessage(action.trigger);
    }
  };

  return (
    <>
      {chatOpen && (
        <>
          {/* Dimmed overlay behind expanded chat */}
          {chatExpanded && (
            <div
              style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.35)',
                zIndex: 998,
              }}
              onClick={() => setChatExpanded(false)}
            />
          )}

          <div className={`chat-window${chatExpanded ? ' expanded' : ''}`}>
            {/* ── Header ── */}
            <div className="chat-header">
              <div className="chat-avatar">🚛</div>
              <div className="chat-header-info">
                <strong>LorryBot Assistant</strong>
                <span>
                  <span className="chat-online" />
                  Online · Replies instantly
                </span>
              </div>
              <div className="chat-header-actions">
                <button
                  className="chat-icon-btn"
                  onClick={() => setChatExpanded((e) => !e)}
                  title={chatExpanded ? 'Minimize' : 'Expand'}
                  style={{ fontSize: '16px' }}
                >
                  {chatExpanded ? '⊡' : '⊞'}
                </button>
                <button
                  className="chat-icon-btn"
                  onClick={() => setChatOpen(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="chat-messages">
              {chatMessages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.from}`}>
                  {m.from === 'bot' && <div className="chat-bot-avatar">🚛</div>}
                  <div style={{ maxWidth: '82%' }}>
                    <div className="chat-bubble" style={{ whiteSpace: 'pre-line' }}>
                      {m.text}
                    </div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="chat-action-btns">
                        {m.actions.map((action, idx) => (
                          <button
                            key={idx}
                            className="chat-action-btn"
                            onClick={() => handleAction(action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatTyping && (
                <div className="chat-msg bot">
                  <div className="chat-bot-avatar">🚛</div>
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* ── Quick Actions ── */}
            <div className="chat-quick-replies">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q.label}
                  className="chat-quick-btn"
                  onClick={() => sendMessage(q.trigger)}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* ── Input ── */}
            <div className="chat-input-row">
              <input
                className="chat-input"
                placeholder="Ask me anything..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button className="chat-send" onClick={() => sendMessage()} title="Send">
                ➤
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── FAB ── */}
      <button
        className="chat-fab"
        onClick={() => {
          setChatOpen((o) => !o);
          setChatNotif(false);
        }}
        title={chatOpen ? 'Close chat' : 'Chat with LorryBot'}
      >
        {chatOpen ? '✕' : '🚛'}
        {chatNotif && !chatOpen && <span className="notif" />}
      </button>
    </>
  );
}
