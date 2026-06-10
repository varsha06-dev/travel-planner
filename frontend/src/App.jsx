import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const WELCOME = {
  id: 'welcome', role: 'assistant',
  content: "Hello! I'm **Voyage**, your personal travel planner.\n\nTell me about your dream trip — where you'd like to go, who's travelling, your budget, how long you have. We'll figure out the perfect itinerary together.",
  ts: Date.now(), places: null, route_data: null,
}

function sessionToMessages(rawMessages) {
  return [
    WELCOME,
    ...rawMessages.map((m, i) => ({
      id: `loaded-${i}`,
      role: m.role === 'human' ? 'user' : 'assistant',
      content: m.content, ts: i,
      places: m.places || null,
      route_data: m.route_data || null,
    }))
  ]
}

export default function App() {
  const [messages, setMessages]       = useState([WELCOME])
  const [sessionId, setSessionId]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [tripInfo, setTripInfo]       = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    setSidebarOpen(false)
    setMessages(prev => [...prev, {
      id: Date.now(), role: 'user', content: text,
      ts: Date.now(), places: null, route_data: null,
    }])
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      if (!sessionId) setSessionId(data.session_id)
      if (data.trip_info && Object.keys(data.trip_info).length > 0) setTripInfo(data.trip_info)
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', content: data.reply,
        ts: Date.now(), places: data.places || null, route_data: data.route_data || null,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'error',
        content: `Something went wrong: ${err.message}`,
        ts: Date.now(), places: null, route_data: null,
      }])
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
      setSessionId(data.session_id)
      setTripInfo(data.trip_info || {})
      setMessages(sessionToMessages(data.messages))
      setSidebarOpen(false)
    } catch (err) { alert(`Could not load trip: ${err.message}`) }
  }, [])

  const deleteSession = useCallback(async (id) => {
    await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === sessionId) startOver()
  }, [sessionId, startOver])

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        tripInfo={tripInfo}
        currentSessionId={sessionId}
        onStartOver={startOver}
        onLoadSession={loadSession}
        onDeleteSession={deleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <ChatWindow
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  )
}