import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api'
import { Zap, User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', role: 'employee' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true); setError('')
    try {
      const { data } = await signup(form.name, form.email, form.password, form.role)
      localStorage.setItem('aq_token', data.token)
      localStorage.setItem('aq_user', JSON.stringify(data.user))
      toast.success(`Welcome to AtomQuest, ${data.user.name}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440 }} className="fade-up">
        <Link
          to="/home"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text2)', textDecoration: 'none', fontSize: 13, marginBottom: 24, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--yellow)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
        >
          ← Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(212,168,67,0.3)', animation: 'glow 3s ease infinite' }}>
            <Zap size={24} color="#1A1208" fill="#1A1208" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 6 }}>Create Account</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Join AtomQuest Goal Portal</p>
        </div>

        <div className="card" style={{ padding: 28, boxShadow: '0 8px 40px rgba(180,130,40,0.12)' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input type="text" value={form.name} onChange={set('name')} placeholder="Your full name" style={{ paddingLeft: 36 }} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                <input type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" style={{ paddingLeft: 36 }} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select value={form.role} onChange={set('role')}>
                <option value="employee">👤 Employee — Create and track goals</option>
                <option value="manager">🏢 Manager — Approve team goals</option>
                <option value="admin">⚙️ Admin — System-wide management</option>
              </select>
              {form.role === 'manager' && (
                <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ You will be able to review and approve your team's goals
                </p>
              )}
              {form.role === 'admin' && (
                <p style={{ fontSize: 12, color: 'var(--yellow2)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✓ You will have full system access and management capabilities
                </p>
              )}
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder="Min 6 chars"
                    style={{ paddingLeft: 36, paddingRight: 36 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', padding: 4, color: 'var(--text3)', border: 'none', cursor: 'pointer' }}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                  <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" style={{ paddingLeft: 36 }} required />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: 13, marginTop: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }} disabled={loading}>
              {loading
                ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                : <><ArrowRight size={16} /> Create Account</>
              }
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--yellow2)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
