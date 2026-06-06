import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import RouteMap from './RouteMap.jsx'

export default function Message({ message }) {
  const isUser  = message.role === 'user'
  const isError = message.role === 'error'

  if (isUser) {
    return (
      <div style={styles.userRow}>
        <div style={styles.userBubble}>
          <p style={styles.userText}>{message.content}</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={styles.botRow}>
        <div style={styles.avatarCol}><div style={styles.avatar}>✦</div></div>
        <div style={{ ...styles.botBubble, ...styles.errorBubble }}>
          <p style={styles.errorText}>⚠ {message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.botRow}>
      <div style={styles.avatarCol}>
        <div style={styles.avatar}>✦</div>
      </div>
      <div style={styles.botBubbleCol}>
        {/* Text response */}
        <div style={styles.botBubble}>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Route map — shown when a day-by-day plan was generated */}
        {message.route_data?.days?.length > 0 && (
          <RouteMap routeData={message.route_data} />
        )}

        {/* Places gallery — shown when named places are mentioned */}
        {!message.route_data && message.places?.length > 0 && (
          <PlacesGallery places={message.places} />
        )}
      </div>
    </div>
  )
}

// ── Places Gallery ────────────────────────────────────────────────────────────

function PlacesGallery({ places }) {
  const [active, setActive] = useState(0)
  const place = places[active]

  return (
    <div style={styles.gallery}>
      <p style={styles.galleryLabel}>📍 Places mentioned</p>
      <div style={styles.mainImageWrap}>
        <img key={active} src={place.image.url} alt={place.image.alt} style={styles.mainImage} />
        <div style={styles.nameOverlay}>
          <p style={styles.overlayName}>{place.name}</p>
          <p style={styles.overlayDesc}>{place.description}</p>
        </div>
        <a
          href={`${place.image.credit_url}?utm_source=voyage_travel_planner&utm_medium=referral`}
          target="_blank" rel="noopener noreferrer" style={styles.creditBadge}
        >
          📷 {place.image.credit}
        </a>
      </div>
      {places.length > 1 && (
        <div style={styles.thumbStrip}>
          {places.map((p, i) => (
            <button key={i}
              style={{ ...styles.thumbCard, ...(i === active ? styles.thumbCardActive : {}) }}
              onClick={() => setActive(i)} title={p.name}
            >
              <div style={styles.thumbImgWrap}>
                <img src={p.image.url} alt={p.image.alt}
                  style={{ ...styles.thumbImg, ...(i !== active ? styles.thumbImgDim : {}) }} />
                {i === active && <div style={styles.thumbActiveDot} />}
              </div>
              <p style={{ ...styles.thumbName, ...(i === active ? styles.thumbNameActive : {}) }}>
                {p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  userRow: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '6px 40px', animation: 'fadeSlideIn 0.2s ease',
  },
  userBubble: {
    maxWidth: '68%', background: 'var(--user-bubble)',
    borderRadius: '16px 16px 4px 16px', padding: '12px 16px',
  },
  userText: { fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--user-text)', whiteSpace: 'pre-wrap' },
  botRow: {
    display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start',
    gap: 12, padding: '6px 40px', animation: 'fadeSlideIn 0.25s ease',
  },
  avatarCol: { flexShrink: 0, paddingTop: 2 },
  avatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, border: '1px solid var(--accent)',
  },
  botBubbleCol: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '72%' },
  botBubble: {
    background: 'var(--bot-bubble)', border: '1px solid var(--bot-border)',
    borderRadius: '4px 16px 16px 16px', padding: '14px 18px',
    boxShadow: 'var(--shadow-sm)', fontSize: '0.9rem',
    lineHeight: 1.65, color: 'var(--text-primary)',
  },
  errorBubble: { background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '4px 16px 16px 16px' },
  errorText: { fontSize: '0.85rem', color: '#C53030', lineHeight: 1.6 },

  // Gallery
  gallery: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', overflow: 'hidden',
    boxShadow: 'var(--shadow-md)', animation: 'fadeSlideIn 0.3s ease',
  },
  galleryLabel: {
    fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--text-faint)', padding: '10px 14px 8px',
    borderBottom: '1px solid var(--border)',
  },
  mainImageWrap: { position: 'relative' },
  mainImage: { width: '100%', height: 220, objectFit: 'cover', display: 'block' },
  nameOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
    padding: '32px 14px 12px',
  },
  overlayName: {
    color: '#fff', fontSize: '1rem', fontFamily: 'var(--font-display)',
    fontWeight: 400, letterSpacing: '0.02em', marginBottom: 2,
    textShadow: '0 1px 4px rgba(0,0,0,0.4)',
  },
  overlayDesc: { color: 'rgba(255,255,255,0.78)', fontSize: '0.75rem', lineHeight: 1.4 },
  creditBadge: {
    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)',
    color: '#fff', fontSize: '0.65rem', padding: '3px 8px',
    borderRadius: 99, textDecoration: 'none', backdropFilter: 'blur(4px)',
  },
  thumbStrip: {
    display: 'flex', overflowX: 'auto', gap: 0, padding: '8px',
    background: 'var(--surface-2)', scrollbarWidth: 'none',
  },
  thumbCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 4, border: 'none', background: 'transparent',
    cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)',
    transition: 'background 0.15s ease', flexShrink: 0, minWidth: 72,
  },
  thumbCardActive: { background: 'var(--accent-soft)' },
  thumbImgWrap: { position: 'relative', width: 60, height: 44, borderRadius: 6, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbImgDim: { opacity: 0.6 },
  thumbActiveDot: {
    position: 'absolute', bottom: 3, right: 3, width: 6, height: 6,
    borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 1.5px white',
  },
  thumbName: { fontSize: '0.65rem', color: 'var(--text-faint)', textAlign: 'center', lineHeight: 1.3, maxWidth: 72 },
  thumbNameActive: { color: 'var(--accent-dark)', fontWeight: 500 },
}