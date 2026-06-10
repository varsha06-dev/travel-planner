import { useEffect, useRef, useState } from 'react'
import Message from './Message.jsx'

export default function ChatWindow({ messages, loading, onSend, onMenuOpen }) {
  const [input, setInput] = useState('')
  const bottomRef         = useRef(null)
  const inputRef          = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const quickPrompts = [
    "Plan a beach holiday for 2 people",
    "7-day adventure trip, $3000 budget",
    "Europe cities, two weeks in June",
  ]

  const showQuickPrompts = messages.length === 1

  return (
    <main style={styles.main}>
      {/* Mobile header — only visible on small screens via CSS */}
      <div className="mobile-header">
        <button onClick={onMenuOpen} style={styles.menuBtn} aria-label="Open menu">
          <MenuIcon />
        </button>
        <span style={styles.mobileTitle}>
          <span style={styles.mobileTitleMark}>✦</span> Voyage
        </span>
        <div style={{ width: 36 }} />
      </div>

      {/* Message list */}
      <div style={styles.messageList}>
        {messages.map(msg => <Message key={msg.id} message={msg} />)}

        {loading && (
          <div className="msg-bot-row" style={styles.typingRow}>
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={{ ...styles.dot, animationDelay: '0.15s' }} />
              <span style={{ ...styles.dot, animationDelay: '0.3s' }} />
            </div>
          </div>
        )}

        {showQuickPrompts && (
          <div style={styles.quickPrompts}>
            {quickPrompts.map(p => (
              <button key={p} style={styles.chip} onClick={() => onSend(p)}>{p}</button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="input-bar" style={styles.inputBar}>
        <textarea
          ref={inputRef}
          style={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me about your dream trip…"
          rows={1}
          disabled={loading}
        />
        <button
          style={{ ...styles.sendBtn, ...((!input.trim() || loading) ? styles.sendBtnDisabled : {}) }}
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>

      <p style={styles.hint}>Enter to send · Shift+Enter for new line</p>

      <style>{`
        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .mobile-header { display: flex; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-5px); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        textarea { resize: none; }
        textarea:focus { outline: none; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </main>
  )
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

const styles = {
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    height: '100vh', overflow: 'hidden', background: 'var(--bg)',
    minWidth: 0,
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 8,
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  mobileTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1.2rem',
    fontWeight: 400, letterSpacing: '0.04em', color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  mobileTitleMark: { color: 'var(--accent)', fontSize: 14 },
  messageList: {
    flex: 1, overflowY: 'auto', padding: '24px 0 16px',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  typingRow: {
    display: 'flex', justifyContent: 'flex-start',
    padding: '6px 40px', animation: 'fadeIn 0.2s ease',
  },
  typingBubble: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'var(--bot-bubble)', border: '1px solid var(--bot-border)',
    borderRadius: 16, padding: '12px 16px', boxShadow: 'var(--shadow-sm)',
  },
  dot: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: 'var(--text-faint)', animation: 'bounce 1.2s infinite ease-in-out',
  },
  quickPrompts: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
    padding: '16px 40px', animation: 'fadeIn 0.4s ease',
  },
  chip: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 99, padding: '8px 16px', fontSize: '0.82rem',
    color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  inputBar: {
    display: 'flex', alignItems: 'flex-end', gap: 10,
    margin: '0 40px 8px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 14,
    padding: '12px 14px', boxShadow: 'var(--shadow-sm)',
  },
  textarea: {
    flex: 1, border: 'none', background: 'transparent',
    fontFamily: 'var(--font-body)', fontSize: '0.9rem',
    color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 140, overflowY: 'auto',
  },
  sendBtn: {
    flexShrink: 0, width: 36, height: 36, borderRadius: 10,
    background: 'var(--user-bubble)', border: 'none',
    color: 'var(--user-text)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  sendBtnDisabled: {
    background: 'var(--border)', color: 'var(--text-faint)',
    cursor: 'not-allowed',
  },
  hint: {
    textAlign: 'center', fontSize: '0.7rem',
    color: 'var(--text-faint)', marginBottom: 12, letterSpacing: '0.02em',
  },
}