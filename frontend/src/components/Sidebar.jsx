import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const ICONS = {
  destination:    { icon: '🗺️', label: 'Destination' },
  travelers:      { icon: '👥', label: 'Travelers'   },
  duration:       { icon: '🕐', label: 'Duration'    },
  budget:         { icon: '💰', label: 'Budget'      },
  when:           { icon: '📅', label: 'When'        },
  departure_city: { icon: '✈️', label: 'Flying from' },
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function getTripLabel(t) { return t?.destination || 'Untitled trip' }
function getTripSub(t) {
  const p = []
  if (t?.travelers) p.push(t.travelers)
  if (t?.duration)  p.push(t.duration)
  return p.join(' · ') || 'In progress'
}

export default function Sidebar({ tripInfo, currentSessionId, onStartOver, onLoadSession, onDeleteSession, isMobile, isOpen, onClose }) {
  const [tab, setTab]             = useState('trip')
  const [history, setHistory]     = useState([])
  const [loadingH, setLoadingH]   = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const fetchHistory = useCallback(async () => {
    setLoadingH(true)
    try { const r = await fetch(`${API_BASE}/sessions`); if (r.ok) setHistory(await r.json()) } catch (_) {}
    setLoadingH(false)
  }, [])

  useEffect(() => { if (tab === 'history') fetchHistory() }, [tab, fetchHistory])
  useEffect(() => { if (currentSessionId && tab === 'history') fetchHistory() }, [currentSessionId, tab, fetchHistory])

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmId === id) { onDeleteSession(id); setHistory(p => p.filter(s => s.id !== id)); setConfirmId(null) }
    else { setConfirmId(id); setTimeout(() => setConfirmId(null), 3000) }
  }

  const hasInfo = Object.keys(tripInfo).length > 0

  // On mobile: fixed overlay drawer; on desktop: normal sidebar in flow
  const sidebarStyle = isMobile ? {
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
    width: 280,
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease',
    zIndex: 100,
    background: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px 20px',
    overflow: 'hidden',
    boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
  } : {
    width: 240,
    flexShrink: 0,
    height: '100vh',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 20px 24px',
    overflow: 'hidden',
  }

  return (
    <aside style={sidebarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>✦</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>Voyage</span>
        </div>
        {isMobile && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', fontSize: '1.1rem', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
        )}
      </div>

      <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 16 }}>AI Travel Planner</p>

      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: 20 }}>
        {['trip', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '6px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.78rem',
            background: tab === t ? 'var(--surface)' : 'transparent',
            color:      tab === t ? 'var(--text-primary)' : 'var(--text-faint)',
            fontWeight: tab === t ? 500 : 400,
            boxShadow:  tab === t ? 'var(--shadow-sm)' : 'none',
          }}>{t === 'trip' ? 'Current' : 'History'}</button>
        ))}
      </div>

      {tab === 'trip' && (
        <>
          <div style={{ marginBottom: 20 }}>
            {hasInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(ICONS).map(([k, { icon, label }]) =>
                  tripInfo[k] ? (
                    <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <span style={{ fontSize: 14, marginTop: 1 }}>{icon}</span>
                      <div>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{tripInfo[k]}</p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            ) : <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', lineHeight: 1.6, fontStyle: 'italic' }}>Details will appear here as you chat.</p>}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>Tips</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--accent-dark)', lineHeight: 1.6 }}>Share your interests, budget, and travel dates to get the most personalised plan.</p>
          </div>
          <button onClick={onStartOver} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>+ New Trip</button>
        </>
      )}

      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingH && <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>Loading…</p>}
          {!loadingH && history.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>No saved trips yet.</p>}
          {!loadingH && history.map(sess => {
            const active  = sess.id === currentSessionId
            const confirm = confirmId === sess.id
            return (
              <div key={sess.id} onClick={() => onLoadSession(sess.id)} style={{
                background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                cursor: 'pointer', position: 'relative',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{getTripLabel(sess.trip_info)}</span>
                  <button onClick={e => handleDelete(e, sess.id)} style={{ width: 18, height: 18, borderRadius: '50%', border: `1px solid ${confirm ? '#E53E3E' : 'var(--border)'}`, background: confirm ? '#FFF5F5' : 'transparent', color: confirm ? '#E53E3E' : 'var(--text-faint)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{confirm ? '?' : '×'}</button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{getTripSub(sess.trip_info)}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)' }}>{formatDate(sess.updated_at)}</p>
                {active && <span style={{ position: 'absolute', top: 8, right: 26, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-dark)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: 99, border: '1px solid var(--accent)' }}>Active</span>}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}