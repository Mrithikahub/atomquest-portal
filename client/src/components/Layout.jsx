import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Target, CheckSquare, BarChart2, LogOut, Zap, ChevronLeft, ChevronRight, Users, Bell } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { getNotificationCount, getNotifications, markNotificationRead, markAllNotificationsRead } from '../api'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('aq_user') || '{}')
  const [collapsed, setCollapsed] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifs, setNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef(null)

  useEffect(() => {
    const fetchCount = () => getNotificationCount().then(r => setNotifCount(r.data.count || 0)).catch(() => {})
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!notifOpen) return
    getNotifications().then(r => setNotifs(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [notifOpen])

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkRead = async (id) => {
    await markNotificationRead(id).catch(() => {})
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n))
    setNotifCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {})
    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })))
    setNotifCount(0)
  }

  const formatNotifTime = (ts) => {
    if (!ts) return ''
    try {
      const d = new Date(ts)
      const now = new Date()
      const diff = Math.floor((now - d) / 60000)
      if (diff < 1) return 'just now'
      if (diff < 60) return `${diff}m ago`
      if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
      return d.toLocaleDateString()
    } catch { return '' }
  }

  const logout = () => { localStorage.clear(); navigate('/home'); }
  const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'Goals' },
    { to: '/checkin', icon: CheckSquare, label: 'Check-ins' },
    ...(['manager', 'admin'].includes(user.role) ? [{ to: '/reports', icon: BarChart2, label: 'Reports' }] : []),
    ...(user.role === 'admin' ? [{ to: '/assignments', icon: Users, label: 'Assignments' }] : [])
  ]

  const roleColors = { admin: '#EA580C', manager: '#D4A843', employee: '#16A34A' }
  const roleColor = roleColors[user.role] || '#D4A843'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: collapsed ? 64 : 224,
        minHeight: '100vh',
        background: '#1A1208',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        zIndex: 100,
        overflow: 'hidden',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '20px 0' : '22px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #2D2010', minHeight: 70 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: collapsed ? 14 : 0, boxShadow: '0 4px 12px rgba(212,168,67,0.3)', animation: 'glow 3s ease infinite' }}>
            <Zap size={18} color="#1A1208" fill="#1A1208" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#D4A843', letterSpacing: '-0.3px' }}>AtomQuest</div>
              <div style={{ fontSize: 10, color: '#9B8A6B', letterSpacing: '0.8px', marginTop: 1 }}>GOAL PORTAL</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '11px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 10, marginBottom: 2,
                textDecoration: 'none', fontWeight: 500, fontSize: 13,
                transition: 'all 0.15s',
                background: isActive ? '#D4A843' : 'transparent',
                color: isActive ? '#1A1208' : '#9B8A6B',
              })}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #2D2010' }}>
          {!collapsed && (
            <div style={{ padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }} ref={bellRef}>
              <div style={{ width: 34, height: 34, borderRadius: 99, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1A1208', flexShrink: 0 }}>{initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F5EDD8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: roleColor, textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 1 }}>{user.role}</div>
              </div>
              {/* Bell button */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setNotifOpen(o => !o)}
                  style={{ background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: notifCount > 0 ? '#D4A843' : '#9B8A6B', transition: 'all 0.15s', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,168,67,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,168,67,0.12)'}
                >
                  <Bell size={14} />
                  {notifCount > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: '#fff', borderRadius: 99, fontSize: 9, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
                </button>
                {/* Notification dropdown */}
                {notifOpen && (
                  <div style={{ position: 'fixed', bottom: 90, left: 170, width: 320, background: '#1E160A', border: '1.5px solid #3D2D12', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #3D2D12', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#F5EDD8' }}>Notifications</span>
                      {notifCount > 0 && (
                        <button onClick={handleMarkAll} style={{ background: 'none', border: 'none', fontSize: 11, color: '#D4A843', cursor: 'pointer', fontWeight: 600 }}>Mark all read</button>
                      )}
                    </div>
                    <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: '28px 16px', textAlign: 'center', color: '#9B8A6B', fontSize: 13 }}>No notifications yet</div>
                      ) : (
                        notifs.map(n => (
                          <div key={n.id} onClick={() => !n.read && handleMarkRead(n.id)} style={{ padding: '12px 16px', borderBottom: '1px solid #2D2010', cursor: n.read ? 'default' : 'pointer', background: n.read ? 'transparent' : 'rgba(212,168,67,0.06)', transition: 'background 0.15s', display: 'flex', gap: 10, alignItems: 'flex-start' }}
                            onMouseEnter={e => { if (!n.read) e.currentTarget.style.background = 'rgba(212,168,67,0.12)' }}
                            onMouseLeave={e => { if (!n.read) e.currentTarget.style.background = 'rgba(212,168,67,0.06)' }}
                          >
                            <div style={{ width: 7, height: 7, borderRadius: 99, background: n.read ? 'transparent' : '#D4A843', marginTop: 5, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: '#F5EDD8' }}>{n.title}</div>
                              <div style={{ fontSize: 12, color: '#9B8A6B', marginTop: 2 }}>{n.message}</div>
                              <div style={{ fontSize: 10, color: '#6B5A3A', marginTop: 4 }}>{formatNotifTime(n.created_at)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={logout}
            style={{ width: collapsed ? 40 : '100%', height: 36, marginLeft: collapsed ? 12 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.15)'}
          >
            <LogOut size={14} />
            {!collapsed && 'Logout'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ width: '100%', marginTop: 6, background: 'transparent', border: 'none', color: '#9B8A6B', padding: '6px', display: 'flex', justifyContent: 'center', cursor: 'pointer', borderRadius: 8, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#D4A843'}
            onMouseLeave={e => e.currentTarget.style.color = '#9B8A6B'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: collapsed ? 64 : 224,
        flex: 1,
        padding: '28px 32px',
        transition: 'margin-left 0.25s ease',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        {children}
      </main>
    </div>
  )
}
