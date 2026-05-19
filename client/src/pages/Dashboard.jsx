import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getGoals, getTeam, getAudit, getEscalations } from '../api'
import { Target, CheckCircle, Clock, Users, TrendingUp, Activity, AlertTriangle, ShieldAlert } from 'lucide-react'

function CountUp({ target, duration = 800 }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) { setCount(0); return; }
    let start = 0
    const step = target / (duration / 30)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start))
    }, 30)
    return () => clearInterval(timer)
  }, [target])
  return <span>{count}</span>
}

function StatCard({ label, value, icon: Icon, color, bg, delay = '' }) {
  return (
    <div className={`card fade-up ${delay}`} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}><CountUp target={value} /></div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [goals, setGoals] = useState([])
  const [team, setTeam] = useState([])
  const [audit, setAudit] = useState([])
  const [escalations, setEscalations] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('aq_user') || '{}')

  const greeting = () => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    if (h >= 17 && h < 21) return 'Good evening'
    return 'Good night'
  }

  useEffect(() => {
    const load = async () => {
      try {
        const goalsRes = await getGoals()
        setGoals(goalsRes.data)
        if (user.role === 'manager') {
          const teamRes = await getTeam()
          setTeam(teamRes.data)
        }
        if (user.role === 'admin') {
          const [auditRes, escRes] = await Promise.all([getAudit(), getEscalations()])
          setAudit(auditRes.data)
          setEscalations(Array.isArray(escRes.data) ? escRes.data : [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      </Layout>
    )
  }

  if (user.role === 'manager') return <ManagerDashboard goals={goals} team={team} user={user} greeting={greeting} />
  if (user.role === 'admin') return <AdminDashboard goals={goals} audit={audit} escalations={escalations} user={user} greeting={greeting} />
  return <EmployeeDashboard goals={goals} user={user} greeting={greeting} />
}

/* ───────────── EMPLOYEE DASHBOARD ───────────── */
function EmployeeDashboard({ goals, user, greeting }) {
  const navigate = useNavigate()
  const total = goals.length
  const approved = goals.filter(g => g.status === 'approved').length
  const pending = goals.filter(g => ['draft','submitted','returned'].includes(g.status)).length
  const draftGoals = goals.filter(g => ['draft','returned'].includes(g.status))
  const totalWeight = draftGoals.reduce((s, g) => s + Number(g.weightage), 0)
  const hasDraft = draftGoals.length > 0

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          {greeting()}, {user.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>Here's your goal progress overview</p>
        {user.manager_id && (
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Reporting Manager: <span style={{ color: 'var(--yellow2)', fontWeight: 600 }}>Assigned</span>
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        <StatCard label="Total Goals" value={total} icon={Target} color="var(--yellow2)" bg="var(--yellow-light)" delay="anim-delay-1" />
        <StatCard label="Approved" value={approved} icon={CheckCircle} color="var(--success)" bg="var(--success-dim)" delay="anim-delay-2" />
        <StatCard label="Pending" value={pending} icon={Clock} color="var(--accent)" bg="var(--accent-dim)" delay="anim-delay-3" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 32, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Goal Progress</h2>
        <span className="badge badge-gray">{total}</span>
      </div>

      {goals.length === 0 ? (
        <div className="card empty-state">
          <Target size={40} />
          <h3>No goals yet</h3>
          <p style={{ marginBottom: 20 }}>Start by adding your first goal for this year</p>
          <button className="btn-primary" onClick={() => navigate('/goals')}>+ Create your first goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, paddingBottom: hasDraft ? 80 : 0 }}>
          {goals.map(goal => {
            const isReturned = goal.status === 'returned'
            return (
              <div key={goal.id} className="card" style={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                borderLeft: isReturned ? '3px solid var(--danger)' : undefined,
                position: 'relative',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(234,179,8,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
              >
                {goal.locked && <span className="badge badge-gray" style={{ position: 'absolute', top: 14, right: 14, fontSize: 10 }}>🔒</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}
                  {goal.is_shared && <span className="badge badge-blue">Shared</span>}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span className="badge badge-gray">{goal.uom_type?.toUpperCase()}</span>
                    <span className={`badge ${goal.status === 'approved' ? 'badge-green' : goal.status === 'submitted' ? 'badge-yellow' : goal.status === 'returned' ? 'badge-red' : 'badge-gray'}`}>{goal.status}</span>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '10px 0 4px', paddingRight: goal.locked ? 60 : 0 }}>{goal.title}</div>
                {goal.description && (
                  <div style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{goal.description}</div>
                )}
                <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  <span>🎯 Target: <strong style={{ color: 'var(--text2)' }}>{goal.target}</strong></span>
                  <span>⚖️ Weight: <strong style={{ color: 'var(--text2)' }}>{goal.weightage}%</strong></span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill progress-fill-success" style={{ width: goal.status === 'approved' ? '100%' : '0%' }} />
                </div>
                {isReturned && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={12}/> Returned for rework — visit Goals to edit
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasDraft && (
        <div style={{ position: 'fixed', bottom: 0, left: 220, right: 0, background: 'var(--card)', borderTop: '1.5px solid var(--border2)', padding: '16px 32px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total weightage:</span>
            <span style={{ fontWeight: 700, color: Math.round(totalWeight) === 100 ? 'var(--success)' : 'var(--danger)' }}>{totalWeight}%</span>
            {Math.round(totalWeight) !== 100 && (
              <span style={{ color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={13}/> Must equal 100%
              </span>
            )}
          </div>
          <button className="btn-primary" onClick={() => navigate('/goals')}>📤 Submit Goals for Approval</button>
        </div>
      )}
    </Layout>
  )
}

/* ───────────── MANAGER DASHBOARD ───────────── */
function ManagerDashboard({ goals, team, user, greeting }) {
  const navigate = useNavigate()
  const submitted = goals.filter(g => g.status === 'submitted').length
  const awaitingApproval = [...new Set(goals.filter(g => g.status === 'submitted').map(g => g.employee_id))].length
  const fullyApproved = team.filter(m => {
    const memberGoals = goals.filter(g => g.employee_id === m.id)
    return memberGoals.length > 0 && memberGoals.every(g => g.status === 'approved')
  }).length

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>
          {greeting()}, {user.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>Monitor and approve your team's goals</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
        <StatCard label="Team Members" value={team.length} icon={Users} color="var(--yellow2)" bg="var(--yellow-light)" delay="anim-delay-1" />
        <StatCard label="Goals Submitted" value={submitted} icon={Target} color="var(--blue)" bg="var(--blue-dim)" delay="anim-delay-2" />
        <StatCard label="Awaiting Approval" value={awaitingApproval} icon={Clock} color="var(--warning)" bg="var(--warning-dim)" delay="anim-delay-3" />
        <StatCard label="Fully Approved" value={fullyApproved} icon={CheckCircle} color="var(--success)" bg="var(--success-dim)" delay="anim-delay-4" />
      </div>

      {awaitingApproval > 0 && (
        <div className="card" style={{ marginTop: 20, borderLeft: '3px solid var(--warning)', background: 'var(--warning-dim)', border: '1.5px solid rgba(217,119,6,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} color="var(--warning)" />
              <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{awaitingApproval} employee{awaitingApproval !== 1 ? 's' : ''} waiting for goal approval</span>
            </div>
            <button className="btn-primary btn-sm" onClick={() => navigate('/goals')}>Review Goals →</button>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 32, marginBottom: 16, color: 'var(--text)' }}>Team Members</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {team.map(member => {
          const memberGoals = goals.filter(g => g.employee_id === member.id)
          const approvedCount = memberGoals.filter(g => g.status === 'approved').length
          const pendingCount = memberGoals.filter(g => ['draft','returned'].includes(g.status)).length
          const submittedCount = memberGoals.filter(g => g.status === 'submitted').length
          const hasSubmitted = submittedCount > 0
          const ratio = memberGoals.length ? (approvedCount / memberGoals.length) * 100 : 0
          const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase()

          return (
            <div key={member.id} className="card" style={{
              borderLeft: hasSubmitted ? '3px solid var(--warning)' : undefined,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(234,179,8,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{member.name}</div>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>{member.role}</span>
                </div>
                {hasSubmitted && (
                  <span className="badge badge-yellow" style={{ animation: 'pulse 2s infinite' }}>Needs Review</span>
                )}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div className="progress-track">
                  <div className="progress-fill progress-fill-success" style={{ width: `${ratio}%` }} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {memberGoals.length} goals ·{' '}
                <span style={{ color: 'var(--success)' }}>{approvedCount} approved</span> ·{' '}
                {submittedCount > 0 && <span style={{ color: 'var(--warning)' }}>{submittedCount} awaiting </span>}
                <span style={{ color: 'var(--text2)' }}>{pendingCount} pending</span>
              </div>
            </div>
          )
        })}
        {team.length === 0 && (
          <div className="card empty-state" style={{ gridColumn: '1/-1' }}>
            <Users size={40} />
            <h3>No team members yet</h3>
            <p>Ask admin to assign employees to your account</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

/* ───────────── ADMIN DASHBOARD ───────────── */
function AdminDashboard({ goals, audit, escalations, user, greeting }) {
  const employees = [...new Set(goals.map(g => g.employee_id))].length
  const totalGoals = goals.length
  const approvedGoals = goals.filter(g => g.status === 'approved').length
  const pendingGoals = goals.filter(g => g.status !== 'approved').length

  const employeeMap = {}
  goals.forEach(g => {
    if (!employeeMap[g.employee_id]) employeeMap[g.employee_id] = { name: g.employee_name, total: 0, approved: 0 }
    employeeMap[g.employee_id].total++
    if (g.status === 'approved') employeeMap[g.employee_id].approved++
  })

  const formatTime = (ts) => {
    if (!ts) return ''
    try { return new Date(ts).toLocaleString() } catch { return ts }
  }

  return (
    <Layout>
      <div className="fade-up">
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text2)', marginTop: 4 }}>System-wide overview — goals, completion, and audit activity</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
        <StatCard label="Total Employees" value={employees} icon={Users} color="var(--yellow2)" bg="var(--yellow-light)" delay="anim-delay-1" />
        <StatCard label="Total Goals" value={totalGoals} icon={Target} color="var(--blue)" bg="var(--blue-dim)" delay="anim-delay-2" />
        <StatCard label="Approved Goals" value={approvedGoals} icon={CheckCircle} color="var(--success)" bg="var(--success-dim)" delay="anim-delay-3" />
        <StatCard label="Pending Goals" value={pendingGoals} icon={Clock} color="var(--accent)" bg="var(--accent-dim)" delay="anim-delay-4" />
      </div>

      {/* ── ESCALATIONS ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <ShieldAlert size={18} color="var(--accent)" />
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Escalation Alerts</h2>
          {escalations.length > 0 && <span className="badge badge-red">{escalations.length}</span>}
        </div>
        {escalations.length === 0 ? (
          <div className="card" style={{ background: 'var(--success-dim)', border: '1.5px solid rgba(22,163,74,0.2)', padding: '14px 20px' }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>✅ All employees on track! No escalations needed.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(() => {
              const highs = escalations.filter(e => e.severity === 'high').length
              const meds = escalations.filter(e => e.severity === 'medium').length
              return (
                <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  {highs > 0 && <span className="badge badge-red">{highs} High</span>}
                  {meds > 0 && <span className="badge badge-yellow">{meds} Medium</span>}
                  <span className="badge badge-gray">{escalations.length - highs - meds} Low</span>
                </div>
              )
            })()}
            {escalations.map((esc, i) => {
              const isHigh = esc.severity === 'high'
              const isMed = esc.severity === 'medium'
              return (
                <div key={i} className="card" style={{
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: isHigh ? 'rgba(220,38,38,0.07)' : isMed ? 'rgba(217,119,6,0.07)' : 'transparent',
                  border: `1.5px solid ${isHigh ? 'rgba(220,38,38,0.22)' : isMed ? 'rgba(217,119,6,0.22)' : 'var(--border)'}`,
                }}>
                  <ShieldAlert size={16} color={isHigh ? 'var(--danger)' : isMed ? 'var(--warning)' : 'var(--text3)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{esc.employee_name}</span>
                      <span className={`badge ${isHigh ? 'badge-red' : isMed ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>{esc.severity}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      <strong>{esc.type}</strong>{esc.goal_title ? ` — ${esc.goal_title}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {esc.days_overdue} day{esc.days_overdue !== 1 ? 's' : ''} overdue
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28 }}>
        {/* Completion Rate */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={16} color="var(--yellow)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Completion Rate</h3>
          </div>
          {Object.entries(employeeMap).length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No goals data yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.values(employeeMap).map((emp, i) => {
                const pct = emp.total ? Math.round((emp.approved / emp.total) * 100) : 0
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{emp.name}</span>
                      <span style={{ fontWeight: 600, color: pct === 100 ? 'var(--success)' : 'var(--yellow2)' }}>{pct}%</span>
                    </div>
                    <div className="progress-track">
                      <div className={`progress-fill ${pct === 100 ? 'progress-fill-success' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{emp.approved}/{emp.total} goals approved</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={16} color="var(--yellow)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Recent Activity</h3>
          </div>
          {audit.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}><p>No audit entries yet. Changes to goals will appear here.</p></div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 4, top: 0, bottom: 0, width: 2, background: 'var(--border2)' }} />
              {audit.slice(0, 8).map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0, marginTop: 4, position: 'relative', zIndex: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}><strong>{entry.changed_by}</strong> — {entry.change_desc}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{formatTime(entry.changed_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
