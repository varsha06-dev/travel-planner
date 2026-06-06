import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

// Stop type → accent color
const STOP_COLORS = {
  hotel:      '#C9A96E',
  restaurant: '#E07B54',
  museum:     '#6B8CBA',
  attraction: '#6B8CBA',
  viewpoint:  '#5BA58C',
  beach:      '#5BA58C',
  market:     '#9B8EC4',
  other:      '#888888',
}

const STOP_ICONS = {
  hotel:      '🏨',
  restaurant: '🍽️',
  museum:     '🏛️',
  attraction: '📍',
  viewpoint:  '🔭',
  beach:      '🏖️',
  market:     '🛍️',
  other:      '📍',
}

function createMarkerEl(index, type) {
  const color = STOP_COLORS[type] || STOP_COLORS.other
  const el    = document.createElement('div')
  el.style.cssText = `
    width: 28px; height: 28px; border-radius: 50%;
    background: ${color}; color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    cursor: pointer;
  `
  el.textContent = index + 1
  return el
}

export default function RouteMap({ routeData }) {
  const [activeDay, setActiveDay]   = useState(0)
  const mapContainerRef             = useRef(null)
  const mapRef                      = useRef(null)
  const markersRef                  = useRef([])

  const dayData = routeData?.days?.[activeDay]

  useEffect(() => {
    if (!mapContainerRef.current || !dayData?.stops?.length) return
    if (!MAPBOX_TOKEN) return

    // Clean up previous map
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     'mapbox://styles/mapbox/light-v11',
      center:    [dayData.stops[0].lng, dayData.stops[0].lat],
      zoom:      12,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      // ── Route line ────────────────────────────────────────────────────
      if (dayData.route_geometry) {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: dayData.route_geometry },
        })
        // Subtle shadow under the line
        map.addLayer({
          id: 'route-shadow', type: 'line', source: 'route',
          paint: { 'line-color': '#000', 'line-width': 6, 'line-opacity': 0.08,
                   'line-blur': 4 },
        })
        // Main route line
        map.addLayer({
          id: 'route-line', type: 'line', source: 'route',
          paint: { 'line-color': '#C9A96E', 'line-width': 3.5,
                   'line-dasharray': [1, 0] },
        })
        // Animated dash overlay
        map.addLayer({
          id: 'route-dash', type: 'line', source: 'route',
          paint: { 'line-color': '#ffffff', 'line-width': 1.5,
                   'line-dasharray': [3, 6], 'line-opacity': 0.7 },
        })
      }

      // ── Stop markers ─────────────────────────────────────────────────
      dayData.stops.forEach((stop, i) => {
        const el = createMarkerEl(i, stop.type)

        const popupHTML = `
          <div style="font-family:'DM Sans',sans-serif;padding:2px 4px;min-width:140px">
            <p style="font-size:0.85rem;font-weight:500;color:#1C1917;margin:0 0 2px">
              ${stop.name}
            </p>
            <p style="font-size:0.72rem;color:#78716C;margin:0;text-transform:capitalize">
              ${STOP_ICONS[stop.type] || '📍'} ${stop.type}
            </p>
            ${stop.duration_to_next_min ? `
              <p style="font-size:0.72rem;color:#C9A96E;margin:4px 0 0;border-top:1px solid #E8E6E1;padding-top:4px">
                → ${stop.duration_to_next_min} min · ${stop.distance_to_next_km} km to next stop
              </p>` : ''}
          </div>`

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false })
            .setHTML(popupHTML))
          .addTo(map)

        markersRef.current.push(marker)
      })

      // ── Fit map to all stops ──────────────────────────────────────────
      const bounds = new mapboxgl.LngLatBounds()
      dayData.stops.forEach(s => bounds.extend([s.lng, s.lat]))
      map.fitBounds(bounds, { padding: { top: 60, bottom: 60, left: 60, right: 60 }, maxZoom: 15 })
    })

    mapRef.current = map
    return () => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [activeDay, dayData])

  if (!routeData?.days?.length) return null

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>🗺 Day-by-day route</span>

        {/* Day tabs */}
        {routeData.days.length > 1 && (
          <div style={styles.dayTabs}>
            {routeData.days.map((d, i) => (
              <button
                key={i}
                style={{ ...styles.dayTab, ...(i === activeDay ? styles.dayTabActive : {}) }}
                onClick={() => setActiveDay(i)}
              >
                Day {d.day}
              </button>
            ))}
          </div>
        )}
      </div>

      {dayData && (
        <>
          {dayData.title && <p style={styles.dayTitle}>{dayData.title}</p>}

          <div style={styles.content}>
            {/* ── Stop list panel ── */}
            <div style={styles.stopList}>
              {dayData.stops.map((stop, i) => (
                <div key={i}>
                  <div
                    style={styles.stopRow}
                    onMouseEnter={() => markersRef.current[i]?.togglePopup()}
                    onMouseLeave={() => markersRef.current[i]?.togglePopup()}
                  >
                    <div style={{
                      ...styles.stopBadge,
                      background: STOP_COLORS[stop.type] || STOP_COLORS.other,
                    }}>
                      {i + 1}
                    </div>
                    <div style={styles.stopInfo}>
                      <p style={styles.stopName}>{stop.name}</p>
                      <p style={styles.stopType}>
                        {STOP_ICONS[stop.type] || '📍'} {stop.type}
                      </p>
                    </div>
                  </div>

                  {/* Travel time connector */}
                  {i < dayData.stops.length - 1 && (
                    <div style={styles.connector}>
                      <div style={styles.connectorLine} />
                      {stop.duration_to_next_min && (
                        <div style={styles.connectorLabel}>
                          🚗 {stop.duration_to_next_min} min
                          {stop.distance_to_next_km && ` · ${stop.distance_to_next_km} km`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Map ── */}
            <div ref={mapContainerRef} style={styles.map} />
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-md)',
    animation: 'fadeSlideIn 0.35s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-2)',
  },
  headerLabel: {
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
  },
  dayTabs: {
    display: 'flex',
    gap: 4,
  },
  dayTab: {
    padding: '4px 10px',
    border: '1px solid var(--border)',
    borderRadius: 99,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  dayTabActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#fff',
  },
  dayTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 400,
    color: 'var(--text-primary)',
    padding: '10px 14px 4px',
    letterSpacing: '0.02em',
  },
  content: {
    display: 'flex',
    height: 320,
  },

  // Stop list
  stopList: {
    width: 200,
    flexShrink: 0,
    overflowY: 'auto',
    padding: '12px 10px',
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  stopRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    cursor: 'default',
    borderRadius: 8,
    padding: '4px 6px',
    transition: 'background 0.15s ease',
  },
  stopBadge: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: 1,
  },
  stopInfo: {},
  stopName: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
    marginBottom: 2,
  },
  stopType: {
    fontSize: '0.68rem',
    color: 'var(--text-faint)',
    textTransform: 'capitalize',
  },
  connector: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 6px 2px 17px',
    margin: '2px 0',
  },
  connectorLine: {
    width: 1,
    height: 16,
    background: 'var(--border)',
    flexShrink: 0,
  },
  connectorLabel: {
    fontSize: '0.65rem',
    color: 'var(--accent-dark)',
    whiteSpace: 'nowrap',
  },

  // Map
  map: {
    flex: 1,
    minWidth: 0,
  },
}