import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import RouteMap from './RouteMap.jsx'

export default function Message({ message, isMobile }) {
  const isUser  = message.role === 'user'
  const isError = message.role === 'error'
  const pad     = isMobile ? '6px 12px' : '6px 40px'

  if (isUser) return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: pad, animation: 'fadeSlideIn 0.2s ease' }}>
      <div style={{ maxWidth: isMobile ? '88%' : '68%', background: 'var(--user-bubble)', borderRadius: '16px 16px 4px 16px', padding: '12px 16px' }}>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--user-text)', whiteSpace: 'pre-wrap' }}>{message.content}</p>
      </div>
    </div>
  )

  if (isError) return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: pad }}>
      <div style={avatarStyle}><div style={avatarInner}>✦</div></div>
      <div style={{ ...botBubble, background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '4px 16px 16px 16px' }}>
        <p style={{ fontSize: '0.85rem', color: '#C53030' }}>⚠ {message.content}</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: pad, animation: 'fadeSlideIn 0.25s ease' }}>
      <div style={avatarStyle}><div style={avatarInner}>✦</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: isMobile ? '92%' : '72%' }}>
        <div style={botBubble}>
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        </div>
        {message.route_data?.days?.length > 0 && <RouteMap routeData={message.route_data} isMobile={isMobile} />}
        {!message.route_data && message.places?.length > 0 && <PlacesGallery places={message.places} />}
      </div>
    </div>
  )
}

const avatarStyle = { flexShrink: 0, paddingTop: 2 }
const avatarInner = { width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--accent)' }
const botBubble   = { background: 'var(--bot-bubble)', border: '1px solid var(--bot-border)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', boxShadow: 'var(--shadow-sm)', fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-primary)' }

function PlacesGallery({ places }) {
  const [active, setActive] = useState(0)
  const place = places[active]
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
      <p style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>📍 Places mentioned</p>
      <div style={{ position: 'relative' }}>
        <img key={active} src={place.image.url} alt={place.image.alt} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', padding: '32px 14px 12px' }}>
          <p style={{ color: '#fff', fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 400, marginBottom: 2 }}>{place.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.75rem' }}>{place.description}</p>
        </div>
        <a href={`${place.image.credit_url}?utm_source=voyage`} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 99, textDecoration: 'none' }}>📷 {place.image.credit}</a>
      </div>
      {places.length > 1 && (
        <div style={{ display: 'flex', overflowX: 'auto', padding: '8px', background: 'var(--surface-2)' }}>
          {places.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 'none', background: i === active ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)', flexShrink: 0, minWidth: 72 }}>
              <div style={{ position: 'relative', width: 60, height: 44, borderRadius: 6, overflow: 'hidden' }}>
                <img src={p.image.url} alt={p.image.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: i === active ? 1 : 0.6 }} />
              </div>
              <p style={{ fontSize: '0.65rem', color: i === active ? 'var(--accent-dark)' : 'var(--text-faint)', textAlign: 'center', fontWeight: i === active ? 500 : 400, maxWidth: 72 }}>{p.name.length > 18 ? p.name.slice(0,16)+'…' : p.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}