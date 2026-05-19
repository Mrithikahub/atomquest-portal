import { useNavigate } from 'react-router-dom'
import { Zap, ArrowRight, Star } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('aq_token')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 64, background: 'rgba(251,247,238,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(212,168,67,0.3)' }}>
            <Zap size={18} color="#1A1208" fill="#1A1208" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#D4A843', letterSpacing: '-0.3px' }}>AtomQuest</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.8px' }}>GOAL PORTAL</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/login')}>Login</button>
          <button className="btn-primary btn-sm" onClick={() => navigate('/signup')}>Get Started Free →</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 140, paddingBottom: 80, textAlign: 'center', padding: '140px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--yellow-light)', border: '1px solid var(--border)', borderRadius: 99, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: 'var(--yellow2)', marginBottom: 32 }}>
          <Star size={12} fill="currentColor" /> AtomQuest Hackathon 1.0 · Goal Setting Portal
        </div>

        <h1 style={{ fontSize: 'clamp(40px,7vw,76px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-2px' }}>
          <span style={{ color: 'var(--text)' }}>Set Goals.</span><br />
          <span style={{ color: 'var(--yellow)' }}>Track Progress.</span><br />
          <span style={{ color: 'var(--text)' }}>Drive Results.</span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text2)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
          A complete goal management portal for modern organizations. From creation to quarterly reviews — all in one place.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary btn-lg" onClick={() => navigate('/signup')} style={{ fontSize: 16, padding: '14px 32px', borderRadius: 12 }}>
            🚀 Get Started Free
          </button>
          <button className="btn-ghost btn-lg" onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')} style={{ fontSize: 16, padding: '14px 32px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            View Demo <ArrowRight size={18} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(24px,5vw,64px)', marginTop: 64, flexWrap: 'wrap' }}>
          {[['3', 'User Roles'], ['8', 'Max Goals'], ['4', 'Quarters'], ['100%', 'Weightage Rule']].map(([num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--yellow)', lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 24px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: 'var(--text)' }}>Everything you need</h2>
            <p style={{ color: 'var(--text2)', fontSize: 16 }}>Built to handle the complete goal lifecycle</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {[
              { icon: '🎯', title: 'Goal Creation', desc: 'Set targets with weightage, UoM types, thrust areas. System enforces 100% total weightage rule.', color: '#FDF3D0' },
              { icon: '✅', title: 'Manager Approval', desc: 'L1 managers review, edit inline, approve or return goals. Approved goals are automatically locked.', color: '#DCFCE7' },
              { icon: '📊', title: 'Quarterly Check-ins', desc: 'Q1 to Q4 progress tracking with automatic achievement scoring based on UoM type.', color: '#DBEAFE' },
              { icon: '🔒', title: 'Audit Trail', desc: 'Every change logged with who changed what and when. Admin can view complete history.', color: '#FEE2E2' },
              { icon: '📤', title: 'Shared Goals', desc: 'Admins push department KPIs to multiple employees at once. Recipients can only edit weightage.', color: '#F3E8FF' },
              { icon: '📈', title: 'Reports & Export', desc: 'Achievement reports exportable to CSV. Completion dashboard shows who is on track.', color: '#FDF3D0' },
            ].map(({ icon, title, desc, color }) => (
              <div key={title} className="card" style={{ background: color, border: '1.5px solid rgba(212,168,67,0.2)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(180,130,40,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12, color: 'var(--text)' }}>Three roles, one platform</h2>
            <p style={{ color: 'var(--text2)', fontSize: 16 }}>Every stakeholder has a tailored experience</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {[
              { icon: '👤', role: 'Employee', color: '#D4A843', bg: '#FDF3D0', items: ['Create & edit goals', 'Submit for approval', 'Log quarterly achievements', 'Track progress scores'] },
              { icon: '🏢', role: 'Manager (L1)', color: '#16A34A', bg: '#DCFCE7', items: ['Review team goals', 'Approve or return goals', 'Quarterly check-ins', 'Team dashboard view'] },
              { icon: '⚙️', role: 'Admin / HR', color: '#EA580C', bg: '#FEF3C7', items: ['Push shared goals', 'Unlock any goal', 'Full audit trail', 'System-wide reports'] },
            ].map(({ icon, role, color, bg, items }) => (
              <div key={role} className="card" style={{ background: bg, borderColor: 'rgba(0,0,0,0.08)', textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>{role}</div>
                {items.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, textAlign: 'left' }}>
                    <span style={{ color, fontSize: 16, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', background: '#1A1208', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: '#D4A843', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(212,168,67,0.3)' }}>
          <Zap size={24} color="#1A1208" fill="#1A1208" />
        </div>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: '#F5EDD8', marginBottom: 12, letterSpacing: '-1px' }}>Ready to get started?</h2>
        <p style={{ color: '#9B8A6B', fontSize: 16, marginBottom: 36 }}>Create your account to start tracking goals</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/signup')} style={{ background: '#D4A843', color: '#1A1208', padding: '13px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(212,168,67,0.3)' }}>
            Create Account →
          </button>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#F5EDD8', padding: '13px 32px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: '1px solid rgba(245,237,216,0.2)', cursor: 'pointer' }}>
            Login Instead
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '24px 48px', background: '#120D06', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="#D4A843" fill="#D4A843" />
          <span style={{ color: '#D4A843', fontWeight: 700, fontSize: 14 }}>AtomQuest</span>
          <span style={{ color: '#5A4A30', fontSize: 13 }}>· Goal Setting Portal · Hackathon 1.0</span>
        </div>
        <span style={{ color: '#5A4A30', fontSize: 12 }}>Built with React + Node.js + SQLite</span>
      </footer>
    </div>
  )
}
