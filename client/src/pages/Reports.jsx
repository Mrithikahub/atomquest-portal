import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { getReport, getCompletion, getAudit, getTeam } from '../api'
import { Download, Activity, BarChart2 } from 'lucide-react'

const QUARTERS = ['All', 'Q1', 'Q2', 'Q3', 'Q4']

export default function Reports() {
  const user = JSON.parse(localStorage.getItem('aq_user') || '{}')
  const navigate = useNavigate()
  const isAdmin = user.role === 'admin'
  const isManager = user.role === 'manager'

  // ALL hooks must come before any conditional returns
  const [tab, setTab] = useState('achievement')
  const [report, setReport] = useState([])
  const [completion, setCompletion] = useState([])
  const [audit, setAudit] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedQuarter, setSelectedQuarter] = useState('All')
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [team, setTeam] = useState([])
  const [analyticsData, setAnalyticsData] = useState([])
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsTime, setAnalyticsTime] = useState('')

  useEffect(() => {
    if (user.role === 'employee') navigate('/dashboard')
  }, [])

  useEffect(() => {
    if (isManager) {
      getTeam().then(r => setTeam(r.data || [])).catch(() => setTeam([]))
    }
  }, [isManager])

  useEffect(() => {
    if (user.role === 'employee') return
    const load = async () => {
      setLoading(true)
      try {
        const params = {}
        if (selectedQuarter !== 'All') params.quarter = selectedQuarter
        if (selectedEmployee) params.employee_id = selectedEmployee

        const [repRes, compRes] = await Promise.all([getReport(params), getCompletion()])
        setReport(Array.isArray(repRes.data) ? repRes.data : [])
        setCompletion(Array.isArray(compRes.data) ? compRes.data : [])
        if (isAdmin) {
          const auditRes = await getAudit()
          setAudit(Array.isArray(auditRes.data) ? auditRes.data : [])
        }
      } catch (err) {
        console.error('Failed to load reports:', err)
        setReport([])
        setCompletion([])
        setAudit([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedQuarter, selectedEmployee, isAdmin, isManager])

  // Conditional return AFTER all hooks
  if (user.role === 'employee') return null

  const filtered = report.filter(r =>
    !search ||
    r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.title?.toLowerCase().includes(search.toLowerCase())
  )

  const employeeSet = [...new Set(report.map(r => r.employee_id))]

  const goalsWith100Pct = report.filter(r => {
    const vals = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => r[q]).filter(v => v !== null && v !== undefined && v !== '')
    return vals.length > 0 && vals.every(v => Number(v) >= Number(r.target))
  }).length

  const avgCompletion = completion.length
    ? Math.round(completion.reduce((s, e) => s + (e.completedQuarters?.length || 0), 0) / completion.length * 25)
    : 0

  function scoreForRow(row) {
    const vals = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => row[q]).filter(v => v !== null && v !== undefined && v !== '')
    if (!vals.length || !row.target) return null
    const avgs = vals.map(v => {
      if (row.uom_type === 'min') return Math.round((Number(v) / Number(row.target)) * 100)
      if (row.uom_type === 'max') return Number(v) > 0 ? Math.round((Number(row.target) / Number(v)) * 100) : 0
      if (row.uom_type === 'zero') return Number(v) === 0 ? 100 : 0
      return null
    }).filter(v => v !== null)
    if (!avgs.length) return null
    return Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length)
  }

  const exportCSV = () => {
    const headers = ['Employee', 'Goal Title', 'Thrust Area', 'UoM Type', 'Target', 'Q1', 'Q2', 'Q3', 'Q4', 'Score%']
    const rows = report.map(r => {
      const score = scoreForRow(r)
      return [
        r.employee_name || '',
        r.title || '',
        r.thrust_area || '',
        r.uom_type || '',
        r.target || 0,
        r.Q1 !== null && r.Q1 !== undefined ? r.Q1 : 'N/A',
        r.Q2 !== null && r.Q2 !== undefined ? r.Q2 : 'N/A',
        r.Q3 !== null && r.Q3 !== undefined ? r.Q3 : 'N/A',
        r.Q4 !== null && r.Q4 !== undefined ? r.Q4 : 'N/A',
        score !== null ? score + '%' : 'N/A',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)
    })
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'atomquest_achievement_report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    try { return new Date(ts).toLocaleString() } catch { return ts }
  }

  useEffect(() => {
    if (tab !== 'analytics' || user.role === 'employee') return
    setAnalyticsLoading(true)
    getReport({}).then(r => {
      setAnalyticsData(Array.isArray(r.data) ? r.data : [])
      setAnalyticsTime(new Date().toLocaleTimeString())
    }).catch(() => setAnalyticsData([])).finally(() => setAnalyticsLoading(false))
  }, [tab])

  const tabs = [
    { key: 'achievement', label: '📊 Achievement Report' },
    { key: 'analytics', label: '📈 Analytics' },
    ...(isAdmin ? [
      { key: 'completion', label: '✅ Completion Dashboard' },
      { key: 'audit', label: '🔍 Audit Log' },
    ] : [])
  ]

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Achievement Reports</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
            {isAdmin ? 'System-wide analytics, completion tracking, and audit trail' : 'Team achievement analytics and CSV export'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? 'var(--yellow)' : 'var(--card)',
            color: tab === t.key ? '#fff' : 'var(--text2)',
            fontWeight: tab === t.key ? 700 : 500,
            borderRadius: 99, padding: '8px 20px', fontSize: 13,
            border: `1.5px solid ${tab === t.key ? 'var(--yellow)' : 'var(--border)'}`,
            transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'achievement' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>Quarter</label>
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(e.target.value)} style={{ minWidth: 100 }}>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          {isManager && team.length > 0 && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>Employee</label>
              <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} style={{ minWidth: 200 }}>
                <option value="">All Team Members</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENT REPORT ── */}
      {tab === 'achievement' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Employees', value: loading ? '—' : employeeSet.length, color: 'var(--yellow2)' },
              { label: 'Goals at 100% Target', value: loading ? '—' : goalsWith100Pct, color: 'var(--success)' },
              { label: 'Avg Completion Rate', value: loading ? '—' : `${avgCompletion}%`, color: 'var(--blue)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card">
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee or goal..." style={{ maxWidth: 280 }} />
            <button className="btn-outline-yellow" onClick={exportCSV}>
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Goal Title</th>
                  <th>Thrust Area</th>
                  <th>UoM</th>
                  <th>Target</th>
                  {selectedQuarter === 'All' ? (
                    <><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th></>
                  ) : (
                    <><th>{selectedQuarter}</th><th>Status</th><th>Employee Comment</th></>
                  )}
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={selectedQuarter === 'All' ? 10 : 9} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={selectedQuarter === 'All' ? 10 : 9} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>No report data available</td></tr>
                ) : filtered.map((row, i) => {
                  const score = scoreForRow(row)
                  const scoreBadge = score === null ? 'badge-gray' : score >= 80 ? 'badge-green' : score >= 50 ? 'badge-yellow' : 'badge-red'
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{row.employee_name}</td>
                      <td style={{ maxWidth: 180 }}>{row.title}</td>
                      <td>{row.thrust_area && <span className="badge badge-orange">{row.thrust_area}</span>}</td>
                      <td><span className="badge badge-gray">{row.uom_type?.toUpperCase()}</span></td>
                      <td style={{ fontWeight: 600 }}>{row.target}</td>
                      {selectedQuarter === 'All' ? (
                        ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                          const val = row[q]
                          const hasVal = val !== null && val !== undefined && val !== ''
                          const hit = hasVal && Number(val) >= Number(row.target)
                          return (
                            <td key={q} style={{ fontWeight: hasVal ? 600 : 400, color: hasVal ? (hit ? 'var(--success)' : 'var(--danger)') : 'var(--text3)' }}>
                              {hasVal ? val : '—'}
                            </td>
                          )
                        })
                      ) : (
                        (() => {
                          const val = row[selectedQuarter]
                          const status = row[`${selectedQuarter}_status`]
                          const comment = row[`${selectedQuarter}_comment`]
                          const hasVal = val !== null && val !== undefined && val !== ''
                          const hit = hasVal && Number(val) >= Number(row.target)
                          const statusBadge = status === 'completed' ? 'badge-green' : status === 'on_track' ? 'badge-yellow' : 'badge-gray'
                          return (
                            <>
                              <td style={{ fontWeight: hasVal ? 600 : 400, color: hasVal ? (hit ? 'var(--success)' : 'var(--danger)') : 'var(--text3)' }}>
                                {hasVal ? val : '—'}
                              </td>
                              <td><span className={`badge ${statusBadge}`}>{status ? status.replace('_', ' ').toUpperCase() : '—'}</span></td>
                              <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--text2)' }}>{comment || '—'}</td>
                            </>
                          )
                        })()
                      )}
                      <td><span className={`badge ${scoreBadge}`}>{score !== null ? `${score}%` : '—'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (() => {
        if (analyticsLoading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading analytics…</div>
        const total = analyticsData.length
        // Chart 1 data
        const statusCounts = { approved: 0, submitted: 0, returned: 0, draft: 0 }
        analyticsData.forEach(r => { if (statusCounts[r.status] !== undefined) statusCounts[r.status]++ })
        const statusItems = [
          { label: 'Approved', key: 'approved', color: 'var(--success)' },
          { label: 'Submitted', key: 'submitted', color: 'var(--warning)' },
          { label: 'Returned', key: 'returned', color: 'var(--danger)' },
          { label: 'Draft', key: 'draft', color: 'var(--text3)' },
        ]
        // Chart 2 data
        const thrustMap = {}
        analyticsData.forEach(r => { const a = r.thrust_area || 'Other'; thrustMap[a] = (thrustMap[a] || 0) + 1 })
        const thrustEntries = Object.entries(thrustMap).sort((a, b) => b[1] - a[1])
        const thrustColors = ['var(--yellow)', 'var(--success)', 'var(--blue)', 'var(--accent)', 'var(--warning)', '#8B5CF6', '#06B6D4', '#EC4899']
        // Chart 3 data
        const quarterAvgs = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
          const scores = analyticsData.map(r => {
            const val = r[q]; if (val === null || val === undefined || val === '') return null
            if (r.uom_type === 'min' && r.target) return Math.min(150, Math.round((Number(val) / Number(r.target)) * 100))
            if (r.uom_type === 'max' && Number(val) > 0) return Math.min(150, Math.round((Number(r.target) / Number(val)) * 100))
            if (r.uom_type === 'zero') return Number(val) === 0 ? 100 : 0
            return null
          }).filter(s => s !== null)
          return { q, avg: scores.length ? Math.min(100, Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)) : 0, count: scores.length }
        })
        // Chart 4 data (admin)
        const empCompletion = [...completion].sort((a, b) => (b.completedQuarters?.length || 0) - (a.completedQuarters?.length || 0))

        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20, marginBottom: 16 }}>

              {/* Chart 1: Status Distribution */}
              <div className="card">
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Goal Status Distribution</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Breakdown of all goals by current status</div>
                {total === 0 ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>No goals data yet</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {statusItems.map(s => {
                      const cnt = statusCounts[s.key] || 0
                      const pct = total ? Math.round((cnt / total) * 100) : 0
                      return (
                        <div key={s.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{s.label}</span>
                            <span style={{ fontWeight: 600, color: s.color }}>{cnt} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height: 10, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: s.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Chart 2: Thrust Area */}
              <div className="card">
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Thrust Area Breakdown</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Goals grouped by focus area</div>
                {thrustEntries.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>No goals data yet</div> : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {thrustEntries.map(([area, cnt], i) => {
                      const pct = total ? Math.round((cnt / total) * 100) : 0
                      const size = Math.max(80, Math.min(160, 60 + cnt * 20))
                      return (
                        <div key={area} style={{
                          background: thrustColors[i % thrustColors.length], borderRadius: 12,
                          padding: '10px 14px', color: '#fff', minWidth: size,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'default'
                        }}>
                          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{cnt}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.9 }}>{area}</div>
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Chart 3: Quarter-wise Achievement Trend */}
              <div className="card">
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Quarter-wise Achievement Trend</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Average achievement score per quarter</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, paddingBottom: 24, position: 'relative' }}>
                  {/* Y-axis lines */}
                  {[0, 25, 50, 75, 100].map(pct => (
                    <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + (pct / 100) * 136, borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 2 }}>{pct}%</span>
                    </div>
                  ))}
                  {quarterAvgs.map(({ q, avg, count }) => (
                    <div key={q} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: avg >= 80 ? 'var(--success)' : avg >= 50 ? 'var(--warning)' : 'var(--text3)' }}>
                        {count > 0 ? `${avg}%` : '—'}
                      </div>
                      <div style={{ width: '100%', maxWidth: 48, height: Math.max(2, (avg / 100) * 120), background: avg > 0 ? 'var(--yellow)' : 'var(--border)', borderRadius: '6px 6px 0 0', transition: 'height 0.8s ease', position: 'relative' }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{q}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{count} goals</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 4: Employee Completion Rate (admin only) */}
              {isAdmin && (
                <div className="card">
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Employee Completion Rate</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>Quarterly check-in completion per employee</div>
                  {empCompletion.length === 0 ? <div style={{ color: 'var(--text3)', fontSize: 13 }}>No data yet</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 240, overflowY: 'auto' }}>
                      {empCompletion.map((emp, i) => {
                        const pct = emp.completedQuarters?.length ? Math.round(emp.completedQuarters.length / 4 * 100) : 0
                        const barColor = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : pct > 0 ? 'var(--danger)' : 'var(--text3)'
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{emp.name}</span>
                              <span style={{ fontWeight: 600, color: barColor }}>{pct}% <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({emp.completedQuarters?.length || 0}/4 qtrs)</span></span>
                            </div>
                            <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.8s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', marginTop: 4 }}>
              Last updated: {analyticsTime}
            </div>
          </div>
        )
      })()}

      {/* ── COMPLETION DASHBOARD (admin only) ── */}
      {tab === 'completion' && isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={16} color="var(--yellow)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Completion Dashboard</h3>
          </div>
          {completion.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <BarChart2 size={40} style={{ margin: '0 auto 16px', opacity: 0.4, display: 'block' }} />
              <h3>No employee data yet</h3>
              <p>Check-in data will appear here once employees log progress</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>
                  <th>Completed Quarters</th>
                </tr>
              </thead>
              <tbody>
                {completion.map((emp, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{emp.name}</td>
                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                      <td key={q}>
                        {emp.completedQuarters?.includes(q)
                          ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>
                          : <span style={{ color: 'var(--text3)' }}>—</span>
                        }
                      </td>
                    ))}
                    <td>
                      <span className={`badge ${emp.completedQuarters?.length === 4 ? 'badge-green' : emp.completedQuarters?.length > 0 ? 'badge-yellow' : 'badge-gray'}`}>
                        {emp.completedQuarters?.length || 0} / 4 quarters
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AUDIT LOG (admin only) ── */}
      {tab === 'audit' && isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Activity size={16} color="var(--yellow)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Audit Log</h3>
          </div>
          {audit.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <Activity size={40} style={{ margin: '0 auto 16px', opacity: 0.4, display: 'block' }} />
              <h3>No audit entries yet</h3>
              <p>Changes to goals will appear here.</p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 4, top: 0, bottom: 0, width: 2, background: 'var(--border2)' }} />
              {audit.map((entry, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: 20 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0, marginTop: 5, position: 'relative', zIndex: 1 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>
                      <strong>{entry.changed_by}</strong>
                      <span style={{ color: 'var(--text2)' }}> — {entry.change_desc}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{formatTime(entry.changed_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
