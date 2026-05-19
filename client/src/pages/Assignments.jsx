import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { getAdminEmployees, getAdminManagers, assignManager } from '../api'
import { Users, UserCheck, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Assignments() {
  const [employees, setEmployees] = useState([])
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [assignments, setAssignments] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const [empRes, mgrRes] = await Promise.all([getAdminEmployees(), getAdminManagers()])
      setEmployees(empRes.data)
      setManagers(mgrRes.data)
      const initialAssignments = {}
      empRes.data.forEach(emp => {
        initialAssignments[emp.id] = emp.manager_id || ''
      })
      setAssignments(initialAssignments)
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAssignmentChange = (empId, managerId) => {
    setAssignments(prev => ({ ...prev, [empId]: managerId }))
  }

  const handleSave = async (empId) => {
    setSaving(prev => ({ ...prev, [empId]: true }))
    try {
      await assignManager(empId, assignments[empId] || null)
      toast.success('Manager assignment updated')
      load()
    } catch (err) {
      toast.error('Failed to update assignment')
    } finally {
      setSaving(prev => ({ ...prev, [empId]: false }))
    }
  }

  const handleBulkSave = async () => {
    const promises = Object.keys(assignments).map(empId => 
      assignManager(empId, assignments[empId] || null)
    )
    try {
      await Promise.all(promises)
      toast.success('All assignments updated')
      load()
    } catch (err) {
      toast.error('Failed to update some assignments')
    }
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Employee Assignments</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>Assign employees to managers for goal approval workflow</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : employees.length === 0 ? (
        <div className="card empty-state">
          <Users size={40} />
          <h3>No employees found</h3>
          <p>Create employee accounts to assign them to managers</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Email</th>
                  <th>Current Manager</th>
                  <th>Assign Manager</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{emp.name}</td>
                    <td style={{ color: 'var(--text2)' }}>{emp.email}</td>
                    <td>
                      {emp.manager_name ? (
                        <span className="badge badge-green">{emp.manager_name}</span>
                      ) : (
                        <span style={{ color: 'var(--text3)', fontSize: 13 }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={assignments[emp.id] || ''}
                        onChange={e => handleAssignmentChange(emp.id, e.target.value)}
                        style={{ minWidth: 180 }}
                      >
                        <option value="">— Unassigned —</option>
                        {managers.map(mgr => (
                          <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleSave(emp.id)}
                        disabled={saving[emp.id]}
                      >
                        {saving[emp.id] ? 'Saving...' : <><Save size={13} /> Save</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={16} color="var(--success)" />
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                {employees.filter(e => e.manager_id).length} of {employees.length} employees assigned
              </span>
            </div>
            <button className="btn-primary" onClick={handleBulkSave}>
              Save All Changes
            </button>
          </div>
        </>
      )}
    </Layout>
  )
}
