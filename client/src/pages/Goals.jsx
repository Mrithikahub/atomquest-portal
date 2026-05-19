import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getGoals, createGoal, updateGoal, deleteGoal, submitGoals, approveGoal, returnGoal, getTeam, getAllUsers, createSharedGoal } from '../api'
import { Target, Edit2, Trash2, Plus, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const THRUST_AREAS = ['Sales', 'Operations', 'HR', 'Finance', 'Technology', 'Quality', 'Customer Experience', 'Strategy']
const UOM_OPTIONS = [
  { value: 'min', label: '📈 Higher is better (Sales, Revenue)' },
  { value: 'max', label: '📉 Lower is better (Cost, TAT)' },
  { value: 'timeline', label: '📅 Date-based completion' },
  { value: 'zero', label: '🎯 Zero = Success (Incidents, Defects)' },
]

function StatusBadge({ status }) {
  const map = {
    draft: ['badge-gray', 'Draft'],
    submitted: ['badge-yellow', 'Submitted'],
    approved: ['badge-green', 'Approved'],
    returned: ['badge-red', 'Returned'],
  }
  const [cls, label] = map[status] || ['badge-gray', status]
  return <span className={`badge ${cls}`}>{label}</span>
}

function GoalModal({ goal, onClose, onSave, usedWeightage }) {
  const isEdit = !!goal?.id
  const isShared = goal?.is_shared == 1
  const [form, setForm] = useState({
    title: goal?.title || '',
    thrust_area: goal?.thrust_area || THRUST_AREAS[0],
    description: goal?.description || '',
    uom_type: goal?.uom_type || 'min',
    target: goal?.target || '',
    weightage: goal?.weightage || 10,
  })
  const [saving, setSaving] = useState(false)
  const remaining = 100 - usedWeightage + (isEdit ? Number(goal.weightage) : 0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!isShared && !form.title.trim()) return toast.error('Title is required')
    if (Number(form.weightage) < 10) return toast.error('Minimum weightage is 10%')
    setSaving(true)
    try {
      if (isEdit) await updateGoal(goal.id, isShared ? { weightage: form.weightage } : form)
      else await createGoal(form)
      toast.success(isEdit ? 'Goal updated!' : 'Goal created!')
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save goal')
    } finally {
      setSaving(false)
    }
  }

  const disabledStyle = { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">{isEdit ? '✏️ Edit Goal' : '✦ New Goal'}</div>

        {isShared && (
          <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13, color: 'var(--blue)' }}>
            📌 Shared goal — only weightage can be edited
          </div>
        )}

        <div className="form-group" style={isShared ? disabledStyle : {}}>
          <label className="form-label">Thrust Area</label>
          <select value={form.thrust_area} onChange={e => set('thrust_area', e.target.value)} disabled={isShared}>
            {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="form-group" style={isShared ? disabledStyle : {}}>
          <label className="form-label">Goal Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Increase quarterly revenue by 20%" disabled={isShared} />
        </div>
        <div className="form-group" style={isShared ? disabledStyle : {}}>
          <label className="form-label">Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this goal in detail..." disabled={isShared} />
        </div>
        <div className="form-group" style={isShared ? disabledStyle : {}}>
          <label className="form-label">Unit of Measurement</label>
          <select value={form.uom_type} onChange={e => set('uom_type', e.target.value)} disabled={isShared}>
            {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group" style={isShared ? disabledStyle : {}}>
            <label className="form-label">Target</label>
            <input type="number" value={form.target} onChange={e => set('target', e.target.value)} placeholder="0" disabled={isShared} />
          </div>
          <div className="form-group">
            <label className="form-label">Weightage (%)</label>
            <input type="number" min={10} max={100} value={form.weightage} onChange={e => set('weightage', e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Min 10% · Remaining: {remaining}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Goal'}</button>
        </div>
      </div>
    </div>
  )
}

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [team, setTeam] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const user = JSON.parse(localStorage.getItem('aq_user') || '{}')

  const load = async () => {
    setLoading(true)
    try {
      const res = await getGoals()
      setGoals(res.data)
      if (user.role === 'manager') {
        const t = await getTeam()
        setTeam(t.data)
      }
      if (user.role === 'admin') {
        const u = await getAllUsers()
        setAllUsers(u.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 24 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>
      </Layout>
    )
  }

  if (user.role === 'employee') {
    return (
      <EmployeeGoals
        goals={goals}
        showModal={showModal}
        setShowModal={setShowModal}
        editGoal={editGoal}
        setEditGoal={setEditGoal}
        reload={load}
      />
    )
  }

  if (user.role === 'manager') {
    return (
      <Layout>
        <ManagerGoals goals={goals} team={team} reload={load} />
      </Layout>
    )
  }

  return (
    <Layout>
      <AdminGoals goals={goals} allUsers={allUsers} reload={load} />
    </Layout>
  )
}

/* ───────────── EMPLOYEE ───────────── */
function EmployeeGoals({ goals, showModal, setShowModal, editGoal, setEditGoal, reload }) {
  const draftGoals = goals.filter(g => ['draft','returned'].includes(g.status))
  const totalWeight = draftGoals.reduce((s, g) => s + Number(g.weightage), 0)
  const usedWeightage = goals.filter(g => g.id !== editGoal?.id).reduce((s, g) => s + Number(g.weightage), 0)
  const canSubmit = draftGoals.length > 0 && Math.round(totalWeight) === 100
  const weightColor = Math.round(totalWeight) === 100 ? 'var(--success)' : totalWeight > 100 ? 'var(--danger)' : 'var(--yellow)'

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return
    try { await deleteGoal(id); toast.success('Goal deleted'); reload() }
    catch (err) { toast.error(err.response?.data?.error || 'Cannot delete this goal') }
  }

  const handleSubmit = async () => {
    try { await submitGoals(); toast.success('Goals submitted for approval!'); reload() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to submit') }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>My Goals</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Manage your annual goals · max 8, total 100% weightage</p>
        </div>
        {draftGoals.length < 8 && (
          <button className="btn-primary" onClick={() => { setEditGoal(null); setShowModal(true); }}>
            <Plus size={15} /> Add Goal
          </button>
        )}
      </div>

      {goals.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Weightage</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: weightColor }}>{totalWeight}%</span>
          </div>
          <div className="progress-track" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${Math.min(totalWeight, 100)}%`, background: weightColor }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{totalWeight} / 100%</div>
          {totalWeight > 100 && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={13}/> Total exceeds 100%! Adjust weightage.</div>}
          {Math.round(totalWeight) === 100 && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)' }}>✓ Ready to submit for approval</div>}
        </div>
      )}

      {goals.length === 0 ? (
        <div className="card empty-state">
          <Target size={40} />
          <h3>No goals yet</h3>
          <p style={{ marginBottom: 20 }}>Add up to 8 goals with a combined weightage of 100%</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15}/> Add Your First Goal</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {goals.map(goal => (
            <div key={goal.id} className="card" style={{
              transition: 'transform 0.2s, box-shadow 0.2s',
              borderLeft: goal.status === 'returned' ? '3px solid var(--danger)' : undefined,
              position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(234,179,8,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                {goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}
                <span className="badge badge-gray">{goal.uom_type?.toUpperCase()}</span>
                {goal.is_shared == 1 && <span className="badge badge-blue">Shared</span>}
                {goal.locked == 1 && <span className="badge badge-gray">🔒 Locked</span>}
                <span style={{ marginLeft: 'auto' }} className={`badge ${
                  goal.status === 'approved' ? 'badge-green' :
                  goal.status === 'submitted' ? 'badge-yellow' :
                  goal.status === 'returned' ? 'badge-red' : 'badge-gray'
                }`}>{goal.status}</span>
              </div>

              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '10px 0 4px' }}>{goal.title}</div>
              {goal.description && (
                <div style={{ fontSize: 13, color: 'var(--text2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>
                  {goal.description}
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                <span>🎯 Target: <strong style={{ color: 'var(--text2)' }}>{goal.target}</strong></span>
                <span>⚖️ Weight: <strong style={{ color: 'var(--text2)' }}>{goal.weightage}%</strong></span>
              </div>

              <div className="progress-track">
                <div className="progress-fill progress-fill-success" style={{ width: goal.status === 'approved' ? '100%' : '0%' }} />
              </div>

              {goal.status === 'returned' && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={12}/> Returned for rework
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                {(() => {
                  const isLocked = goal.locked == 1
                  return (
                    <>
                      <button
                        className="btn-ghost btn-sm btn-icon"
                        title={isLocked ? 'Locked — contact admin to unlock' : 'Edit'}
                        onClick={() => {
                          if (isLocked) return toast.error('This goal is locked. Contact admin to unlock.')
                          setEditGoal(goal); setShowModal(true);
                        }}
                      ><Edit2 size={13}/></button>
                      {!isLocked && (
                        <button className="btn-danger btn-sm btn-icon" onClick={() => handleDelete(goal.id)} title="Delete"><Trash2 size={13}/></button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {draftGoals.length > 0 && (
        <button
          className="btn-primary btn-lg"
          style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
          disabled={!canSubmit}
          title={!canSubmit ? 'Total weightage must equal 100%' : ''}
          onClick={handleSubmit}
        >
          📤 Submit All Goals for Approval ({draftGoals.length} goals)
        </button>
      )}

      {showModal && (
        <GoalModal
          goal={editGoal}
          usedWeightage={usedWeightage}
          onClose={() => { setShowModal(false); setEditGoal(null); }}
          onSave={() => { setShowModal(false); setEditGoal(null); reload(); }}
        />
      )}
    </Layout>
  )
}

/* ───────────── MANAGER ───────────── */
function ManagerGoals({ goals, team, reload }) {
  const [selectedEmp, setSelectedEmp] = useState(team[0]?.id || null)
  const [loading, setLoading] = useState(false)
  const [inlineEdits, setInlineEdits] = useState({})
  const [saving, setSaving] = useState({})

  const empGoals = goals.filter(g => g.employee_id === selectedEmp)
  const submittedGoals = empGoals.filter(g => g.status === 'submitted')
  const selectedEmpName = team.find(t => t.id === selectedEmp)?.name || ''

  const getEdit = (goal, field) => {
    if (inlineEdits[goal.id]?.[field] !== undefined) return inlineEdits[goal.id][field]
    return field === 'target' ? goal.target : goal.weightage
  }
  const setEdit = (goalId, field, val) =>
    setInlineEdits(p => ({ ...p, [goalId]: { ...p[goalId], [field]: val } }))

  const handleSaveEdit = async (goal) => {
    const edits = inlineEdits[goal.id]
    if (!edits) return
    setSaving(p => ({ ...p, [goal.id]: true }))
    try {
      await updateGoal(goal.id, {
        target: edits.target !== undefined ? Number(edits.target) : goal.target,
        weightage: edits.weightage !== undefined ? Number(edits.weightage) : goal.weightage,
      })
      toast.success('Goal updated!')
      setInlineEdits(p => { const n = { ...p }; delete n[goal.id]; return n })
      reload()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save')
    } finally {
      setSaving(p => ({ ...p, [goal.id]: false }))
    }
  }

  const handleApproveAll = async () => {
    if (!submittedGoals.length) return toast.error('No submitted goals to approve')
    setLoading(true)
    try {
      await approveGoal(submittedGoals[0].id)
      toast.success(`All goals approved for ${selectedEmpName}!`)
      reload()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error approving goals')
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (goalId, title) => {
    try {
      await returnGoal(goalId)
      toast.success(`Goal "${title}" returned for rework`)
      reload()
    } catch (e) {
      toast.error('Error returning goal')
    }
  }

  if (!team.length) return (
    <div className="card empty-state" style={{ marginTop: 24 }}>
      <Target size={40} />
      <h3>No team members assigned to you</h3>
      <p>Ask admin to assign employees to your account</p>
    </div>
  )

  const totalWeight = empGoals.reduce((s, g) => s + Number(g.weightage), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Team Goals</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 13 }}>Review and approve your team members' goals</p>
        </div>
        {submittedGoals.length > 0 && (
          <button className="btn-success" onClick={handleApproveAll} disabled={loading} style={{ fontSize: 14, padding: '10px 24px' }}>
            {loading ? 'Approving…' : `✓ Approve All Goals for ${selectedEmpName}`}
          </button>
        )}
      </div>

      {/* Employee tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {team.map(emp => {
          const empGoalList = goals.filter(g => g.employee_id === emp.id)
          const pending = empGoalList.filter(g => g.status === 'submitted').length
          const isActive = selectedEmp === emp.id
          return (
            <button
              key={emp.id}
              onClick={() => setSelectedEmp(emp.id)}
              style={{
                padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                background: isActive ? 'var(--yellow)' : 'var(--card)',
                color: isActive ? '#fff' : 'var(--text2)',
                border: `1.5px solid ${isActive ? 'var(--yellow)' : 'var(--border)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {emp.name}
              {pending > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11 }}>{pending}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected employee goals */}
      {empGoals.length === 0 ? (
        <div className="card empty-state">
          <Target size={40} />
          <h3>No goals found for {selectedEmpName}</h3>
          <p style={{ color: 'var(--text3)' }}>This employee hasn't created any goals yet</p>
        </div>
      ) : (
        <>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-gray">Total: {empGoals.length} goals</span>
            <span className="badge badge-yellow">Submitted: {submittedGoals.length}</span>
            <span className="badge badge-green">Approved: {empGoals.filter(g => g.status === 'approved').length}</span>
            <span className="badge badge-red">Returned: {empGoals.filter(g => g.status === 'returned').length}</span>
            <span className="badge" style={{
              background: Math.round(totalWeight) === 100 ? 'var(--success-dim)' : 'var(--danger-dim)',
              color: Math.round(totalWeight) === 100 ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${Math.round(totalWeight) === 100 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
            }}>
              Weightage: {totalWeight}%
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Goal Title</th>
                  <th>Thrust Area</th>
                  <th>UoM</th>
                  <th>Target</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {empGoals.map(goal => (
                  <tr key={goal.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{goal.title}</div>
                      {goal.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.description}</div>}
                    </td>
                    <td>{goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}</td>
                    <td><span className="badge badge-gray">{goal.uom_type?.toUpperCase()}</span></td>
                    <td>
                      {goal.status === 'submitted' ? (
                        <input
                          type="number"
                          value={getEdit(goal, 'target')}
                          onChange={e => setEdit(goal.id, 'target', e.target.value)}
                          style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{goal.target}</span>
                      )}
                    </td>
                    <td>
                      {goal.status === 'submitted' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={getEdit(goal, 'weightage')}
                            onChange={e => setEdit(goal.id, 'weightage', e.target.value)}
                            style={{ width: 60, padding: '4px 8px', fontSize: 13 }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
                          {inlineEdits[goal.id] && (
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => handleSaveEdit(goal)}
                              disabled={saving[goal.id]}
                              style={{ padding: '3px 8px', fontSize: 11 }}
                            >{saving[goal.id] ? '…' : '💾'}</button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{goal.weightage}%</span>
                      )}
                    </td>
                    <td><StatusBadge status={goal.status} /></td>
                    <td>
                      {goal.locked == 1 ? (
                        <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>✓ Locked</span>
                      ) : goal.status === 'submitted' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-success btn-sm" onClick={handleApproveAll} disabled={loading}>✓ Approve All</button>
                          <button className="btn-danger btn-sm" onClick={() => handleReturn(goal.id, goal.title)}>↩ Return</button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>{goal.status === 'draft' ? 'Not submitted yet' : '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ───────────── ADMIN ───────────── */
function AdminGoals({ goals, allUsers, reload }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showShared, setShowShared] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [sharedForm, setSharedForm] = useState({ title: '', thrust_area: THRUST_AREAS[0], target: '', uom_type: 'min', description: '' })
  const [pushing, setPushing] = useState(false)

  const filtered = goals.filter(g => {
    const matchSearch = !search || g.title?.toLowerCase().includes(search.toLowerCase()) || g.employee_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || g.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleUnlock = async (goal) => {
    try { await updateGoal(goal.id, { locked: 0 }); toast.success('Goal unlocked'); reload() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return
    try { await deleteGoal(id); toast.success('Deleted'); reload() }
    catch (err) { toast.error(err.response?.data?.error || 'Cannot delete locked goal') }
  }

  const toggleUser = (id) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => setSelectedUsers(selectedUsers.length === allUsers.length ? [] : allUsers.map(u => u.id))

  const handlePush = async () => {
    if (!sharedForm.title || !selectedUsers.length) return toast.error('Fill title and select employees')
    setPushing(true)
    try {
      await createSharedGoal({ ...sharedForm, employee_ids: selectedUsers })
      toast.success(`Shared goal pushed to ${selectedUsers.length} employees!`)
      setSharedForm({ title: '', thrust_area: THRUST_AREAS[0], target: '', uom_type: 'min', description: '' })
      setSelectedUsers([])
      setShowShared(false)
      reload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>All Goals</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>System-wide goal management — unlock goals and push shared targets</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by employee or title..." style={{ maxWidth: 300 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Title</th>
              <th>Thrust Area</th>
              <th>Status</th>
              <th>Weightage</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>No goals found</td></tr>
            ) : filtered.map((goal, i) => (
              <tr key={goal.id} style={{ background: i % 2 === 1 ? 'var(--yellow-light)' : undefined }}>
                <td style={{ fontWeight: 500 }}>{goal.employee_name}</td>
                <td style={{ maxWidth: 200 }}>{goal.title}</td>
                <td>{goal.thrust_area && <span className="badge badge-orange">{goal.thrust_area}</span>}</td>
                <td><StatusBadge status={goal.status} /></td>
                <td>{goal.weightage}%</td>
                <td style={{ color: 'var(--text3)', fontSize: 12 }}>{goal.created_at?.slice(0,10)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {goal.locked && (
                      <button className="btn-ghost btn-sm" onClick={() => handleUnlock(goal)}>🔓 Unlock</button>
                    )}
                    <button className="btn-danger btn-sm btn-icon" onClick={() => handleDelete(goal.id)}><Trash2 size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Push Shared Goal */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowShared(!showShared)}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>📤 Push Shared Goal</h3>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Distribute a common goal to multiple employees at once</p>
          </div>
          {showShared ? <ChevronUp size={18} color="var(--text3)"/> : <ChevronDown size={18} color="var(--text3)"/>}
        </div>

        {showShared && (
          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <div className="form-row" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Goal Title</label>
                <input value={sharedForm.title} onChange={e => setSharedForm(f => ({...f, title: e.target.value}))} placeholder="Shared goal title" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Thrust Area</label>
                <select value={sharedForm.thrust_area} onChange={e => setSharedForm(f => ({...f, thrust_area: e.target.value}))}>
                  {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target</label>
                <input type="number" value={sharedForm.target} onChange={e => setSharedForm(f => ({...f, target: e.target.value}))} placeholder="0" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Unit of Measurement</label>
                <select value={sharedForm.uom_type} onChange={e => setSharedForm(f => ({...f, uom_type: e.target.value}))}>
                  {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea rows={2} value={sharedForm.description} onChange={e => setSharedForm(f => ({...f, description: e.target.value}))} placeholder="Optional description..." />
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label className="form-label" style={{ margin: 0 }}>Select Employees</label>
                <button className="btn-ghost btn-sm" onClick={toggleAll}>
                  {selectedUsers.length === allUsers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {allUsers.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: selectedUsers.includes(u.id) ? 'var(--yellow-light)' : 'var(--card2)', border: `1.5px solid ${selectedUsers.includes(u.id) ? 'var(--border2)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} style={{ width: 'auto', accentColor: 'var(--yellow)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                    </div>
                  </label>
                ))}
                {allUsers.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '10px 0' }}>No employees found</div>}
              </div>
            </div>

            <button className="btn-primary" style={{ marginTop: 16 }} disabled={!selectedUsers.length || pushing} onClick={handlePush}>
              {pushing ? 'Pushing…' : `Push to ${selectedUsers.length} Employee${selectedUsers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
