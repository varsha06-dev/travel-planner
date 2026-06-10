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

export default function Sidebar({ tripInfo, currentSessionId, onStartOver, onLoadSession, onDeleteSession, isOpen, onClose }) {
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

  // CSS class drives all layout — inline style only for things CSS can't do
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div style={s.headerRow}>
        <div style={s.brand}>
          <span style={s.mark}>✦</span>
          <span style={s.name}>Voyage</span>
        </div>
        <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <p style={s.tagline}>AI Travel Planner</p>

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'trip'    ? s.tabOn : {}) }} onClick={() => setTab('trip')}>Current</button>
        <button style={{ ...s.tab, ...(tab === 'history' ? s.tabOn : {}) }} onClick={() => setTab('history')}>History</button>
      </div>

      {tab === 'trip' && (
        <>
          <div style={{ marginBottom: 20 }}>
            {hasInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(ICONS).map(([k, { icon, label }]) =>
                  tripInfo[k] ? <InfoCard key={k} icon={icon} label={label} value={tripInfo[k]} /> : null
                )}
              </div>
            ) : <p style={s.empty}>Details will appear here as you chat.</p>}
          </div>
          <div style={{ flex: 1 }} />
          <div style={s.tips}>
            <p style={s.tipLabel}>Tips</p>
            <p style={s.tipText}>Share your interests, budget, and travel dates to get the most personalised plan.</p>
          </div>
          <button style={s.newBtn} onClick={onStartOver}>+ New Trip</button>
        </>
      )}

      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingH && <p style={s.empty}>Loading…</p>}
          {!loadingH && history.length === 0 && <p style={s.empty}>No saved trips yet.</p>}
          {!loadingH && history.map(sess => {
            const active   = sess.id === currentSessionId
            const confirm  = confirmId === sess.id
            return (
              <div key={sess.id}
                style={{ ...s.hCard, ...(active ? s.hCardOn : {}) }}
                onClick={() => onLoadSession(sess.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={s.hDest}>{getTripLabel(sess.trip_info)}</span>
                  <button style={{ ...s.delBtn, ...(confirm ? s.delBtnOn : {}) }}
                    onClick={e => handleDelete(e, sess.id)}>{confirm ? '?' : '×'}</button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{getTripSub(sess.trip_info)}</p>
                <p style={{ fontSize: '0.7rem',  color: 'var(--text-faint)' }}>{formatDate(sess.updated_at)}</p>
                {active && <span style={s.pill}>Active</span>}
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
}

function InfoCard({ icon, label, value }) {
  return (
    <div style={s.card}>
      <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  )
}

const s = {
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  brand:     { display: 'flex', alignItems: 'center', gap: 8 },
  mark:      { fontSize: 18, color: 'var(--accent)', lineHeight: 1 },
  name:      { fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, letterSpacing: '0.04em', color: 'var(--text-primary)' },
  closeBtn:  { background: 'transparent', border: 'none', color: 'var(--text-faint)', fontSize: '1rem', cursor: 'pointer', padding: '4px 6px', borderRadius: 6 },
  tagline:   { fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 16 },
  tabs:      { display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 3, marginBottom: 20 },
  tab:       { flex: 1, padding: '6px 0', border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--text-faint)', fontSize: '0.78rem', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  tabOn:     { background: 'var(--surface)', color: 'var(--text-primary)', fontWeight: 500, boxShadow: 'var(--shadow-sm)' },
  card:      { display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' },
  empty:     { fontSize: '0.8rem', color: 'var(--text-faint)', lineHeight: 1.6, fontStyle: 'italic' },
  tips:      { background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16 },
  tipLabel:  { fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 },
  tipText:   { fontSize: '0.78rem', color: 'var(--accent-dark)', lineHeight: 1.6 },
  newBtn:    { width: '100%', padding: '10px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', cursor: 'pointer' },
  hCard:     { background: 'var(--surface-2)', border: '1px solid transparent', borderRadius: 'var(--radius-sm)', padding: '10px 12px', cursor: 'pointer', position: 'relative' },
  hCardOn:   { border: '1px solid var(--accent)', background: 'var(--accent-soft)' },
  hDest:     { fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 },
  delBtn:    { width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  delBtnOn:  { border: '1px solid #E53E3E', color: '#E53E3E', background: '#FFF5F5' },
  pill:      { position: 'absolute', top: 8, right: 28, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-dark)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: 99, border: '1px solid var(--accent)' },
}