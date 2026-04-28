export default function MangoLoader({ text = 'Processing…' }) {
  return (
    <div className="mango-loader">
      <span className="mango-loader-emoji">🥭</span>
      <div className="mango-loader-dots"><span /><span /><span /></div>
      <div className="mango-loader-text">{text}</div>
    </div>
  );
}
