import { useEffect, useRef, useState, useCallback } from 'react'
import Message from './Message.jsx'

// ── Voice Hook ────────────────────────────────────────────────────────────────
function useMic(onTranscript) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const supported = typeof window !== 'undefined' && 'SpeechRecognition' in window
    || 'webkitSpeechRecognition' in window

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = 'en-US'
    recognition.interimResults = true   // show words as they're spoken
    recognition.continuous = false      // stop after a pause

    recognition.onstart = () => setListening(true)

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('')
      onTranscript(transcript, e.results[e.results.length - 1].isFinal)
    }

    recognition.onend  = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
  }, [onTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    listening ? stopListening() : startListening()
  }, [listening, startListening, stopListening])

  return { listening, toggle, supported }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ChatWindow({ messages, loading, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const { listening, toggle, supported } = useMic((transcript, isFinal) => {
    setInput(transcript)
    // Auto-send when the user stops speaking
    if (isFinal && transcript.trim()) {
      onSend(transcript.trim())
      setInput('')
    }
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = () => {
    if (!input.trim() || loading) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickPrompts = [
    "Plan a beach holiday for 2 people",
    "7-day adventure trip, $3000 budget",
    "Europe cities, two weeks in June",
  ]

  const showQuickPrompts = messages.length === 1

  return (
    <main style={styles.main}>
      <div style={styles.messageList}>
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}

        {loading && (
          <div style={styles.typingRow}>
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
              <button key={p} style={styles.chip} onClick={() => onSend(p)}>
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div style={styles.listeningBar}>
          <span style={styles.listeningDot} />
          Listening… speak now
        </div>
      )}

      {/* Input bar */}
      <div style={{
        ...styles.inputBar,
        ...(listening ? styles.inputBarListening : {}),
      }}>
        <textarea
          ref={inputRef}
          style={styles.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? 'Listening…' : 'Tell me about your dream trip…'}
          rows={1}
          disabled={loading}
        />

        {/* Mic button — only shown if browser supports it */}
        {supported && (
          <button
            style={{
              ...styles.micBtn,
              ...(listening ? styles.micBtnActive : {}),
            }}
            onClick={toggle}
            aria-label={listening ? 'Stop recording' : 'Start voice input'}
            title={listening ? 'Stop recording' : 'Speak your message'}
          >
            <MicIcon listening={listening} />
          </button>
        )}

        <button
          style={{
            ...styles.sendBtn,
            ...((!input.trim() || loading) ? styles.sendBtnDisabled : {}),
          }}
          onClick={handleSend}
          disabled={!input.trim() || loading}
          aria-label="Send"
        >
          <SendIcon />
        </button>
      </div>

      <p style={styles.hint}>
        Enter to send · Shift+Enter for new line
        {supported && ' · Click 🎙 to speak'}
      </p>

      <style>{`
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
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }
        textarea { resize: none; }
        textarea:focus { outline: none; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </main>
  )
}

function MicIcon({ listening }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={listening ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8"  y1="22" x2="16" y2="22" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

const styles = {
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--bg)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '40px 0 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  typingRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    padding: '6px 40px',
    animation: 'fadeIn 0.2s ease',
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'var(--bot-bubble)',
    border: '1px solid var(--bot-border)',
    borderRadius: 16,
    padding: '12px 16px',
    boxShadow: 'var(--shadow-sm)',
  },
  dot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-faint)',
    animation: 'bounce 1.2s infinite ease-in-out',
  },
  quickPrompts: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '16px 40px',
    animation: 'fadeIn 0.4s ease',
  },
  chip: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    padding: '8px 16px',
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.15s ease',
  },
  listeningBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 40px 8px',
    padding: '8px 14px',
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    color: 'var(--accent-dark)',
    fontStyle: 'italic',
    animation: 'fadeIn 0.2s ease',
  },
  listeningDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#E53E3E',
    animation: 'pulse 1s infinite ease-in-out',
    flexShrink: 0,
  },
  inputBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    margin: '0 40px 8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '12px 14px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'border-color 0.2s ease',
  },
  inputBarListening: {
    borderColor: 'var(--accent)',
  },
  textarea: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    maxHeight: 140,
    overflowY: 'auto',
  },
  micBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  micBtnActive: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
    color: 'var(--accent-dark)',
  },
  sendBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'var(--user-bubble)',
    border: 'none',
    color: 'var(--user-text)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  sendBtnDisabled: {
    background: 'var(--border)',
    color: 'var(--text-faint)',
    cursor: 'not-allowed',
    opacity: 1,
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.7rem',
    color: 'var(--text-faint)',
    marginBottom: 16,
    letterSpacing: '0.02em',
  },
}