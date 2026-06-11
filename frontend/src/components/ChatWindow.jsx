import { useEffect, useRef, useState } from 'react'
import Message from './Message.jsx'

export default function ChatWindow({ messages, loading, onSend, isMobile, onMenuOpen }) {
  const [input, setInput] = useState('')
  const bottomRef         = useRef(null)
  const inputRef          = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim()); setInput('')
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const quickPrompts = ["Plan a beach holiday for 2 people", "7-day adventure trip, $3000 budget", "Europe cities, two weeks in June"]
  const pad = isMobile ? '12px' : '40px'

  return (
    // overflow removed — only the message list div scrolls
    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', minWidth: 0 }}>

      {/* Mobile header — flex sibling of message list so it never scrolls away */}
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onMenuOpen} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent)' }}>✦</span> Voyage
          </span>
          <div style={{ width: 36 }} />
        </div>
      )}

      {/* Messages — only this div scrolls */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `24px 0 16px`, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map(msg => <Message key={msg.id} message={msg} isMobile={isMobile} />)}

        {loading && (
          <div style={{ display: 'flex', padding: `6px ${pad}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bot-bubble)', border: '1px solid var(--bot-border)', borderRadius: 16, padding: '12px 16px', boxShadow: 'var(--shadow-sm)' }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <span key={i} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--text-faint)', animation: `bounce 1.2s ${d}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}

        {messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: `16px ${pad}` }}>
            {quickPrompts.map(p => (
              <button key={p} onClick={() => onSend(p)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 99, padding: '8px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{p}</button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
<div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, margin: `0 ${isMobile ? '10px' : '40px'} 8px`, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
  <textarea
    ref={inputRef}
    style={{ flex: 1, border: 'none', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.6, maxHeight: 140, overflowY: 'auto', resize: 'none', outline: 'none' }}
    value={input}
    onChange={e => setInput(e.target.value)}
    onKeyDown={handleKeyDown}
    placeholder="Tell me about your dream trip…"
    rows={1}
    disabled={loading}
  />
  <MicButton onTranscript={text => setInput(prev => prev + text)} disabled={loading} />
  <button
    onClick={handleSend}
    disabled={!input.trim() || loading}
    aria-label="Send"
    style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: !input.trim() || loading ? 'var(--border)' : 'var(--user-bubble)', color: !input.trim() || loading ? 'var(--text-faint)' : 'var(--user-text)' }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  </button>
</div>

      {!isMobile && <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: 12, letterSpacing: '0.02em' }}>Enter to send · Shift+Enter for new line</p>}

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} } @keyframes fadeSlideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </main>
  )
  function MicButton({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false)

  const toggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.')
      return
    }
    if (listening) { setListening(false); return }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = e => onTranscript(e.results[0][0].transcript + ' ')
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    setListening(true)
  }

  return (
    <button onClick={toggle} disabled={disabled} aria-label="Voice input" style={{
      flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: listening ? '#fee2e2' : 'var(--surface-2)',
      color: listening ? '#dc2626' : 'var(--text-muted)',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={listening ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="2" width="6" height="11" rx="3"/>
        <path d="M5 10a7 7 0 0 0 14 0"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="8" y1="22" x2="16" y2="22"/>
      </svg>
    </button>
  )
}
}