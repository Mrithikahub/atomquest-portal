import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getGoals, getAchievements, saveAchievement, saveCheckin, getCheckins, getTeam } from '../api'
import { Target, MessageSquare, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const QUARTER_WINDOWS = {
  Q1: 'Jul',
  Q2: 'Oct',
  Q3: 'Jan',
  Q4: 'Mar/Apr',
}
const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'on_track', label: 'On Track' },
  { value: 'completed', label: 'Completed' },
]

function calcScore(uom, actual, target) {
  const a = Number(actual)
  const t = Number(target)
  if (uom === 'min') {
    if (!t) return { label: '—', color: 'var(--text3)' }
    const pct = Math.round((a / t) * 100)
    return { label: `${pct}%`, color: pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--yellow2)' : 'var(--danger)' }
  }
  if (uom === 'max') {
    if (!a) return { label: '—', color: 'var(--text3)' }
    const pct = Math.round((t / a) * 100)
    return { label: `${pct}%`, color: pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--yellow2)' : 'var(--danger)' }
  }
  if (uom === 'zero') {
    return a === 0 ? { label: '100%', color: 'var(--success)' } : { label: '0%', color: 'var(--danger)' }
  }
  return { label: 'Date-based', color: 'var(--text2)' }
}

function QuarterTabs({ quarter, setQuarter }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUARTERS.map(q => (
          <button key={q} onClick={() => setQuarter(q)} style={{
            background: quarter === q ? 'var(--yellow)' : 'var(--card)',
            color: quarter === q ? '#fff' : 'var(--text2)',
            fontWeight: quarter === q ? 700 : 500,
            borderRadius: 99, padding: '8px 22px', fontSize: 13,
            border: `1.5px solid ${quarter === q ? 'var(--yellow)' : 'var(--border)'}`,
            transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span>{q}</span>
            <span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>{QUARTER_WINDOWS[q]}</span>
          </button>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8, padding: '6px 14px', background: 'var(--yellow-light)', border: '1px solid var(--border)', borderRadius: 99, fontSize: 11, color: 'var(--yellow2)', fontWeight: 600 }}>
          📅 Phase 1 Goal Setting: 1st May
        </div>
      </div>
    </div>
  )
}

export default function CheckIn() {
  const user = JSON.parse(localStorage.getItem('aq_user') || '{}')
  const [quarter, setQuarter] = useState('Q1')

  if (!user.role) {
    return (
      <Layout>
        <div className="card empty-state">
          <h3>Loading user data...</h3>
        </div>
      </Layout>
    )
  }

  if (user.role === 'employee') return <EmployeeCheckIn user={user} quarter={quarter} setQuarter={setQuarter} />
  if (user.role === 'manager') return <ManagerCheckIn user={user} quarter={quarter} setQuarter={setQuarter} />
  return <AdminCheckIn user={user} quarter={quarter} setQuarter={setQuarter} />
}

/* ───────────── EMPLOYEE ───────────── */
function EmployeeCheckIn({ user, quarter, setQuarter }) {
  const [goals, setGoals] = useState([])
  const [inputs, setInputs] = useState({})
  const [saved, setSaved] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [goalsRes, achRes] = await Promise.all([getGoals(), getAchievements(user.id, quarter)])
        const approved = goalsRes.data.filter(g => g.status === 'approved')
        setGoals(approved)
        const achMap = {}
        achRes.data.forEach(a => { achMap[a.goal_id] = a })
        const inp = {}
        approved.forEach(g => {
          inp[g.id] = { 
            actual: achMap[g.id]?.actual ?? '', 
            status: achMap[g.id]?.status ?? 'not_started',
            employee_comment: achMap[g.id]?.employee_comment ?? ''
          }
        })
        setInputs(inp)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quarter])

  const setInput = (goalId, key, val) => setInputs(p => ({ ...p, [goalId]: { ...p[goalId], [key]: val } }))

  const handleSave = async (goal) => {
    try {
      await saveAchievement({ 
        goal_id: goal.id, 
        quarter, 
        actual: Number(inputs[goal.id]?.actual || 0), 
        status: inputs[goal.id]?.status || 'not_started',
        employee_comment: inputs[goal.id]?.employee_comment || null
      })
      setSaved(p => ({ ...p, [goal.id]: new Date().toLocaleTimeString() }))
      toast.success('Progress saved!')
    } catch (err) {
      toast.error('Failed to save')
    }
  }

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Quarterly Check-ins</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Log your actual achievements for each quarter</p>
      </div>
      <QuarterTabs quarter={quarter} setQuarter={setQuarter} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card empty-state">
          <Target size={40} />
          <h3>No approved goals</h3>
          <p>Get your goals approved first to start tracking achievements</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map(goal => {
            const inp = inputs[goal.id] || {}
            const score = calcScore(goal.uom_type, inp.actual, goal.target)
            return (
              <div key={goal.id} className="card">
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{goal.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}
                      <span className="badge badge-gray">Target: {goal.target}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label className="form-label">Actual Achievement</label>
                      <input type="number" value={inp.actual ?? ''} onChange={e => setInput(goal.id, 'actual', e.target.value)} style={{ width: 130 }} placeholder="0" />
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select value={inp.status || 'not_started'} onChange={e => setInput(goal.id, 'status', e.target.value)} style={{ width: 150 }}>
                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 80 }}>
                      <div className="form-label">Score</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: score.color, lineHeight: 1.2 }}>{score.label}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button className="btn-primary btn-sm" onClick={() => handleSave(goal)}>Save Progress</button>
                      {saved[goal.id] && <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>Saved {saved[goal.id]}</div>}
                    </div>
                  </div>
                  <div style={{ width: '100%', marginTop: 12 }}>
                    <label className="form-label">Your Comments</label>
                    <textarea
                      rows={2}
                      value={inp.employee_comment ?? ''}
                      onChange={e => setInput(goal.id, 'employee_comment', e.target.value)}
                      placeholder="Add notes about your progress..."
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

/* ───────────── MANAGER ───────────── */
function ManagerCheckIn({ user, quarter, setQuarter }) {
  const [team, setTeam] = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [goals, setGoals] = useState([])
  const [achievements, setAchievements] = useState({})
  const [comments, setComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getTeam().then(r => {
      const teamData = r.data || []
      setTeam(teamData)
      if (teamData.length > 0) setSelectedEmp(String(teamData[0].id))
    }).catch(err => {
      console.error('Failed to load team:', err)
      setTeam([])
    })
  }, [])

  useEffect(() => {
    if (!selectedEmp) return
    const load = async () => {
      setLoading(true)
      try {
        const [goalsRes, achRes] = await Promise.all([getGoals(), getAchievements(selectedEmp, quarter)])
        const empGoals = goalsRes.data.filter(g => String(g.employee_id) === String(selectedEmp) && g.status === 'approved')
        setGoals(empGoals)
        const achMap = {}
        achRes.data.forEach(a => { achMap[a.goal_id] = a })
        setAchievements(achMap)
        const cmtMap = {}
        await Promise.all(empGoals.map(async g => {
          const r = await getCheckins(g.id)
          cmtMap[g.id] = r.data.filter(c => c.quarter === quarter)
        }))
        setComments(cmtMap)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedEmp, quarter])

  const selectedMember = team.find(m => String(m.id) === String(selectedEmp))

  const handleSaveComment = async (goalId) => {
    const comment = commentInputs[goalId]
    if (!comment?.trim()) return
    try {
      await saveCheckin({ goal_id: goalId, quarter, comment })
      setComments(p => ({ ...p, [goalId]: [...(p[goalId] || []), { comment, manager_name: user.name, created_at: new Date().toISOString() }] }))
      setCommentInputs(p => ({ ...p, [goalId]: '' }))
      toast.success('Comment saved!')
    } catch (err) {
      toast.error('Failed to save comment')
    }
  }

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Quarterly Check-ins</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Review team progress and add feedback observations</p>
      </div>
      <QuarterTabs quarter={quarter} setQuarter={setQuarter} />

      <select 
        value={selectedEmp} 
        onChange={e => setSelectedEmp(e.target.value)} 
        disabled={team.length === 0}
        style={{ marginBottom: 20, maxWidth: 280 }}
      >
        <option value="">— Select team member —</option>
        {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {team.length === 0 ? (
        <div className="card empty-state" style={{ marginTop: 24 }}>
          <MessageSquare size={40} />
          <h3>No team members assigned to you</h3>
          <p>Ask admin to assign employees to your account</p>
        </div>
      ) : !selectedEmp ? (
        <div className="card empty-state">
          <MessageSquare size={40} />
          <h3>Select a team member</h3>
          <p>Choose above to view their quarterly progress</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card empty-state">
          <Target size={40} />
          <h3>No approved goals</h3>
          <p>{selectedMember?.name} has no approved goals yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {goals.map(goal => {
            const ach = achievements[goal.id]
            const actual = ach?.actual ?? 0
            const target = Number(goal.target) || 1
            const pct = Math.min(100, Math.round((Number(actual) / target) * 100))
            const score = calcScore(goal.uom_type, actual, goal.target)
            return (
              <div key={goal.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{goal.title}</div>
                    {goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Score</div>
                    {goal.uom_type === 'timeline' ? (
                      <div style={{ fontSize: 16, fontWeight: 700, color: Number(actual) > 0 ? 'var(--success)' : 'var(--text3)' }}>
                        {Number(actual) > 0 ? '✓ Updated' : 'Pending'}
                      </div>
                    ) : (
                      <div style={{ fontSize: 28, fontWeight: 700, color: score.color }}>{score.label}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                      <span>Planned Target</span>
                      <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{goal.target}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: '100%', background: 'var(--border2)' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                      <span>Actual Achievement</span>
                      <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{actual}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'var(--yellow)' }} />
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={13}/> Employee Comments
                  </div>
                  {ach?.employee_comment ? (
                    <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{ach.employee_comment}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>No employee comments</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={13}/> Manager Check-in Comment
                  </div>
                  {(comments[goal.id] || []).map((c, i) => (
                    <div key={i} style={{ background: 'var(--yellow-light)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--yellow2)', marginBottom: 2 }}>{c.manager_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{c.comment}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{c.created_at?.slice(0,16)?.replace('T',' ')}</div>
                    </div>
                  ))}
                  <textarea
                    rows={2}
                    value={commentInputs[goal.id] || ''}
                    onChange={e => setCommentInputs(p => ({ ...p, [goal.id]: e.target.value }))}
                    placeholder={`Add observations and feedback for ${selectedMember?.name || 'this employee'}...`}
                    style={{ marginBottom: 8 }}
                  />
                  <button className="btn-primary btn-sm" onClick={() => handleSaveComment(goal.id)}>Save Comment</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

/* ───────────── ADMIN: Read-only overview ───────────── */
function AdminCheckIn({ user, quarter, setQuarter }) {
  const [goals, setGoals] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const goalsRes = await getGoals()
        const approved = goalsRes.data.filter(g => g.status === 'approved')
        setGoals(approved)

        const achArr = []
        await Promise.all(approved.map(async g => {
          const r = await getAchievements(g.employee_id, quarter)
          r.data.forEach(a => { if (a.goal_id === g.id) achArr.push({ ...a, goal: g }) })
        }))
        setAchievements(achArr)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [quarter])

  const byEmployee = {}
  goals.forEach(g => {
    if (!byEmployee[g.employee_id]) byEmployee[g.employee_id] = { name: g.employee_name, goals: [] }
    byEmployee[g.employee_id].goals.push(g)
  })

  const getAch = (goalId) => achievements.find(a => a.goal_id === goalId)

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Check-ins Overview</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Read-only view of all employees' quarterly progress</p>
      </div>
      <QuarterTabs quarter={quarter} setQuarter={setQuarter} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : Object.keys(byEmployee).length === 0 ? (
        <div className="card empty-state">
          <BarChart2 size={40} />
          <h3>No approved goals</h3>
          <p>No employees have approved goals yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.values(byEmployee).map((emp, idx) => (
            <div key={idx} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 99, background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {emp.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{emp.name}</div>
                <span className="badge badge-gray">{emp.goals.length} goals</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {emp.goals.map(g => {
                  const ach = getAch(g.id)
                  const actual = ach?.actual ?? null
                  const pct = actual !== null && g.target ? Math.min(100, Math.round((Number(actual) / Number(g.target)) * 100)) : 0
                  const score = actual !== null ? calcScore(g.uom_type, actual, g.target) : null
                  return (
                    <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>{g.title}</div>
                        <div className="progress-track" style={{ height: 6 }}>
                          <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : 'var(--yellow)' }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 100 }}>
                        {actual !== null ? (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 600, color: score?.color }}>{score?.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{actual} / {g.target}</div>
                          </>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>No data yet</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
