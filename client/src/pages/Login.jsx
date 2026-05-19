import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api'
import { Zap, Mail, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const quickLogins = [
  { label: '👤 Employee', color: '#16A34A' },
  { label: '🏢 Manager', color: '#D4A843' },
  { label: '⚙️ Admin', color: '#EA580C' },
]

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await login(email, password)
      localStorage.setItem('aq_token', data.token)
      localStorage.setItem('aq_user', JSON.stringify(data.user))
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 70%)', top: '20%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420 }} className="fade-up">
        {/* Back link */}
        <div style={{ marginBottom: 20 }}>
          <Link to="/home" style={{ fontSize: 13, color: 'var(--text2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            ← Back to Home
          </Link>
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(212,168,67,0.3)', animation: 'glow 3s ease infinite' }}>
            <Zap size={24} color="#1A1208" fill="#1A1208" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--yellow)', letterSpacing: '-0.5px', marginBottom: 4 }}>AtomQuest</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Goal Setting &amp; Tracking Portal</p>
        </div>

        <div className="card" style={{ padding: 28, boxShadow: '0 8px 32px rgba(212,168,67,0.12)', border: '1.5px solid var(--border2)' }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, fontWeight: 600 }}>Quick Login</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {quickLogins.map(({ label, color }) => (
              <button
                key={label}
                style={{ flex: 1, background: 'var(--card2)', border: `1.5px solid var(--border)`, color: 'var(--text2)', borderRadius: 8, padding: '8px 4px', fontSize: 12, justifyContent: 'center', cursor: 'default' }}
                onMouseEnter={ev => ev.currentTarget.style.borderColor = color}
                onMouseLeave={ev => ev.currentTarget.style.borderColor = 'var(--border)'}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="divider" style={{ margin: '0 0 24px' }} />

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={{ paddingLeft: 36 }} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ paddingLeft: 36 }} required />
              </div>
            </div>
            {error && (
              <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <><ArrowRight size={16} /> Sign In</>
              }
            </button>
          </form>

          <div className="divider" />

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text2)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--yellow2)', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
