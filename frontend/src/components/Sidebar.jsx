import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

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
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getTripLabel(trip_info) {
  if (trip_info?.destination) return trip_info.destination
  return 'Untitled trip'
}

function getTripSub(trip_info) {
  const parts = []
  if (trip_info?.travelers) parts.push(trip_info.travelers)
  if (trip_info?.duration)  parts.push(trip_info.duration)
  return parts.join(' · ') || 'In progress'
}

export default function Sidebar({
  tripInfo,
  currentSessionId,
  onStartOver,
  onLoadSession,
  onDeleteSession,
}) {
  const [tab, setTab]           = useState('trip')   // 'trip' | 'history'
  const [history, setHistory]   = useState([])
  const [loadingH, setLoadingH] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  const fetchHistory = useCallback(async () => {
    setLoadingH(true)
    try {
      const res = await fetch(`${API_BASE}/sessions`)
      if (res.ok) setHistory(await res.json())
    } catch (_) {}
    setLoadingH(false)
  }, [])

  // Refresh history whenever the tab is opened
  useEffect(() => {
    if (tab === 'history') fetchHistory()
  }, [tab, fetchHistory])

  // Also refresh history after a new message saves the session
  useEffect(() => {
    if (currentSessionId && tab === 'history') fetchHistory()
  }, [currentSessionId, tab, fetchHistory])

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmId === id) {
      onDeleteSession(id)
      setHistory(prev => prev.filter(s => s.id !== id))
      setConfirmId(null)
    } else {
      setConfirmId(id)
      // Auto-cancel confirm after 3s
      setTimeout(() => setConfirmId(null), 3000)
    }
  }

  const hasInfo = Object.keys(tripInfo).length > 0

  return (
    <aside style={styles.sidebar}>
      {/* Brand */}
      <div style={styles.brand}>
        <span style={styles.brandMark}>✦</span>
        <span style={styles.brandName}>Voyage</span>
      </div>
      <p style={styles.tagline}>AI Travel Planner</p>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(tab === 'trip' ? styles.tabActive : {}) }}
          onClick={() => setTab('trip')}
        >
          Current
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'history' ? styles.tabActive : {}) }}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {/* ── CURRENT TAB ── */}
      {tab === 'trip' && (
        <>
          <div style={styles.section}>
            {hasInfo ? (
              <div style={styles.cards}>
                {Object.entries(ICONS).map(([key, { icon, label }]) =>
                  tripInfo[key] ? (
                    <InfoCard key={key} icon={icon} label={label} value={tripInfo[key]} />
                  ) : null
                )}
              </div>
            ) : (
              <p style={styles.emptyState}>Details will appear here as you chat.</p>
            )}
          </div>

          <div style={styles.spacer} />

          <div style={styles.tips}>
            <p style={styles.sectionLabel}>Tips</p>
            <p style={styles.tipText}>
              Share your interests, budget, and travel dates to get the most personalised plan.
            </p>
          </div>

          <button style={styles.newTripBtn} onClick={onStartOver}>
            + New Trip
          </button>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={styles.historyList}>
          {loadingH && <p style={styles.emptyState}>Loading…</p>}

          {!loadingH && history.length === 0 && (
            <p style={styles.emptyState}>No saved trips yet. Start chatting!</p>
          )}

          {!loadingH && history.map(session => {
            const isActive  = session.id === currentSessionId
            const isConfirm = confirmId === session.id
            return (
              <div
                key={session.id}
                style={{
                  ...styles.historyCard,
                  ...(isActive ? styles.historyCardActive : {}),
                }}
                onClick={() => onLoadSession(session.id)}
              >
                <div style={styles.historyCardTop}>
                  <span style={styles.historyDestination}>
                    {getTripLabel(session.trip_info)}
                  </span>
                  <button
                    style={{
                      ...styles.deleteBtn,
                      ...(isConfirm ? styles.deleteBtnConfirm : {}),
                    }}
                    onClick={(e) => handleDelete(e, session.id)}
                    title={isConfirm ? 'Click again to confirm delete' : 'Delete trip'}
                  >
                    {isConfirm ? '?' : '×'}
                  </button>
                </div>
                <p style={styles.historySub}>{getTripSub(session.trip_info)}</p>
                <p style={styles.historyDate}>{formatDate(session.updated_at)}</p>
                {isActive && <span style={styles.activePill}>Active</span>}
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
    <div style={styles.card}>
      <span style={styles.cardIcon}>{icon}</span>
      <div>
        <p style={styles.cardLabel}>{label}</p>
        <p style={styles.cardValue}>{value}</p>
      </div>
    </div>
  )
}

const styles = {
  sidebar: {
    width: 240,
    flexShrink: 0,
    height: '100vh',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 20px 24px',
    overflow: 'hidden',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  brandMark: { fontSize: 18, color: 'var(--accent)', lineHeight: 1 },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 400,
    letterSpacing: '0.04em',
    color: 'var(--text-primary)',
  },
  tagline: {
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    marginBottom: 16,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
    padding: 3,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: '6px 0',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-faint)',
    fontSize: '0.78rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    fontWeight: 500,
    boxShadow: 'var(--shadow-sm)',
  },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: '0.7rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    marginBottom: 12,
  },
  cards: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: 'var(--surface-2)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    animation: 'fadeIn 0.3s ease',
  },
  cardIcon: { fontSize: 14, marginTop: 1, flexShrink: 0 },
  cardLabel: {
    fontSize: '0.68rem',
    color: 'var(--text-faint)',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  cardValue: { fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 },
  emptyState: {
    fontSize: '0.8rem',
    color: 'var(--text-faint)',
    lineHeight: 1.6,
    fontStyle: 'italic',
    padding: '4px 0',
  },
  spacer: { flex: 1 },
  tips: {
    background: 'var(--accent-soft)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 14px',
    marginBottom: 16,
  },
  tipText: { fontSize: '0.78rem', color: 'var(--accent-dark)', lineHeight: 1.6, marginTop: 6 },
  newTripBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.02em',
  },

  // History tab
  historyList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  historyCard: {
    background: 'var(--surface-2)',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  historyCardActive: {
    border: '1px solid var(--accent)',
    background: 'var(--accent-soft)',
  },
  historyCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  historyDestination: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 150,
  },
  historySub: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: '0.7rem',
    color: 'var(--text-faint)',
  },
  activePill: {
    position: 'absolute',
    top: 8,
    right: 28,
    fontSize: '0.6rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--accent-dark)',
    background: 'var(--accent-soft)',
    padding: '2px 6px',
    borderRadius: 99,
    border: '1px solid var(--accent)',
  },
  deleteBtn: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-faint)',
    fontSize: '0.75rem',
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  deleteBtnConfirm: {
    border: '1px solid #E53E3E',
    color: '#E53E3E',
    background: '#FFF5F5',
  },
}