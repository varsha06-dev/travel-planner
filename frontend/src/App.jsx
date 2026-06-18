import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { useIsMobile } from './hooks/useIsMobile.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const WELCOME = {
  id: 'welcome', role: 'assistant',
  content: "Hello! I'm **Voyage**, your personal travel planner.\n\nTell me about your dream trip — where you'd like to go, who's travelling, your budget, how long you have. We'll figure out the perfect itinerary together.",
  ts: Date.now(), places: null, route_data: null,
}

function sessionToMessages(rawMessages) {
  return [WELCOME, ...rawMessages.map((m, i) => ({
    id: `loaded-${i}`,
    role: m.role === 'human' ? 'user' : 'assistant',
    content: m.content, ts: i,
    places: m.places || null, route_data: m.route_data || null,
  }))]
}

export default function App() {
  const isMobile = useIsMobile()
  const [messages, setMessages]       = useState([WELCOME])
  const [sessionId, setSessionId]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [tripInfo, setTripInfo]       = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    setSidebarOpen(false)

    const userMsg = { id: Date.now(), role: 'user', content: text, ts: Date.now(), places: null, route_data: null }
    // Placeholder for streaming bot message
    const botMsgId = Date.now() + 1
    const botMsg = { id: botMsgId, role: 'assistant', content: '', ts: Date.now(), places: null, route_data: null, streaming: true }

    setMessages(prev => [...prev, userMsg, botMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })

      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'session') {
              if (!sessionId) setSessionId(event.session_id)

            } else if (event.type === 'tool') {
              // Show searching indicator
              setMessages(prev => prev.map(m =>
                m.id === botMsgId
                  ? { ...m, toolUse: `🔍 Searching: ${event.name.replace(/_/g, ' ')}…` }
                  : m
              ))

            } else if (event.type === 'chunk') {
              // Append streamed text
              setMessages(prev => prev.map(m =>
                m.id === botMsgId
                  ? { ...m, content: m.content + event.text, toolUse: null }
                  : m
              ))

            } else if (event.type === 'done') {
              if (!sessionId) setSessionId(event.session_id)
              if (event.trip_info && Object.keys(event.trip_info).length > 0) {
                setTripInfo(event.trip_info)
              }
              // Finalize message with places/route
              setMessages(prev => prev.map(m =>
                m.id === botMsgId
                  ? { ...m, streaming: false, places: event.places || null, route_data: event.route_data || null }
                  : m
              ))

            } else if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === botMsgId
                  ? { ...m, role: 'error', content: event.message, streaming: false }
                  : m
              ))
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === botMsgId
          ? { ...m, role: 'error', content: `Something went wrong: ${err.message}`, streaming: false }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }, [sessionId, loading])

  const startOver = useCallback(() => {
    setMessages([WELCOME]); setSessionId(null); setTripInfo({}); setSidebarOpen(false)
  }, [])

  const loadSession = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${id}`)
      if (!res.ok) throw new Error('Failed to load session')
      const data = await res.json()
      setSessionId(data.session_id); setTripInfo(data.trip_info || {})
      setMessages(sessionToMessages(data.messages)); setSidebarOpen(false)
    } catch (err) { alert(`Could not load trip: ${err.message}`) }
  }, [])

  const deleteSession = useCallback(async (id) => {
    await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === sessionId) startOver()
  }, [sessionId, startOver])

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} />
      )}
      <div style={isMobile ? { width: 0, overflow: 'visible' } : { display: 'contents' }}>
        <Sidebar
          tripInfo={tripInfo} currentSessionId={sessionId}
          onStartOver={startOver} onLoadSession={loadSession} onDeleteSession={deleteSession}
          isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
        />
      </div>
      <ChatWindow
        messages={messages} loading={loading} onSend={sendMessage}
        isMobile={isMobile} onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  )
}
