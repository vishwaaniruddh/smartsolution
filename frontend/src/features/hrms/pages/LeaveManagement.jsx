import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Check, X, Clock } from 'lucide-react';

const LeaveManagement = () => {
  const { toast, tenantId } = useHRMS();

  const { user } = useAuth();
  const isHRMSAdmin = ['Admin', 'Manager', 'Superadmin'].includes(user?.role);

  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', default_days: 12 });
  const [editingType, setEditingType] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');

  const [applyForm, setApplyForm] = useState({
    employee_id: isHRMSAdmin ? '' : 'me', leave_type_id: '', from_date: '', to_date: '', reason: ''
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (filterStatus) params.append('status', filterStatus);

    Promise.all([
      fetch(`${apiBaseUrl}/hrms/leaves?${params}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/leaves?action=types&tenant_id=${tenantId}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/employees?tenant_id=${tenantId}&status=Active`).then(r => r.json()),
    ]).then(([leavesRes, typesRes, empRes]) => {
      if (leavesRes.success) setLeaves(leavesRes.data || []);
      if (typesRes.success) setLeaveTypes(typesRes.data || []);
      if (empRes.success) setEmployees(empRes.data || []);
    }).finally(() => setLoading(false));
  }, [tenantId, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = (e) => {
    e.preventDefault();
    if (!applyForm.employee_id || !applyForm.leave_type_id || !applyForm.from_date || !applyForm.to_date) {
      toast.error('All fields are required.');
      return;
    }

    fetch(`${apiBaseUrl}/hrms/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...applyForm, tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success('Leave request submitted!');
          setShowApplyModal(false);
          setApplyForm({ employee_id: isHRMSAdmin ? '' : 'me', leave_type_id: '', from_date: '', to_date: '', reason: '' });
          fetchData();
        } else {
          toast.error(data.error || 'Failed to submit.');
        }
      });
  };

  const handleAction = (id, status) => {
    fetch(`${apiBaseUrl}/hrms/leaves`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(`Leave ${status.toLowerCase()}.`);
          fetchData();
        } else {
          toast.error(data.error || 'Action failed.');
        }
      });
  };

  const handleTypeSubmit = (e) => {
    e.preventDefault();
    if (!typeForm.name) { toast.error('Name is required.'); return; }

    const payload = { ...typeForm, tenant_id: tenantId };
    if (editingType) payload.id = editingType.id;

    fetch(`${apiBaseUrl}/hrms/leaves?action=types`, {
      method: editingType ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowTypeModal(false);
          setEditingType(null);
          setTypeForm({ name: '', default_days: 12 });
          fetchData();
        } else {
          toast.error(data.error || 'Failed.');
        }
      });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Pending', count: pendingCount, color: 'var(--accent-yellow)', bg: 'rgba(245, 158, 11, 0.1)', icon: Clock },
          { label: 'Approved', count: approvedCount, color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.1)', icon: Check },
          { label: 'Rejected', count: rejectedCount, color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)', icon: X },
        ].map(item => (
          <div key={item.label} style={{
            background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
              background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${item.color}20`
            }}><item.icon size={22} /></div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{item.label} Requests</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['requests', ...(isHRMSAdmin ? ['types'] : [])].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="modal-btn secondary" style={{
              padding: '8px 18px', fontSize: '12px', fontWeight: 600,
              background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === tab ? '1px solid var(--accent-cyan)' : '1px solid var(--border)', cursor: 'pointer'
            }}>
              {tab === 'requests' ? '📋 Leave Requests' : '⚙️ Leave Types'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'requests' && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '130px' }}>
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}
          <button className="add-lead-btn" onClick={() => activeTab === 'requests' ? setShowApplyModal(true) : (() => { setEditingType(null); setTypeForm({ name: '', default_days: 12 }); setShowTypeModal(true); })()} style={{ gap: '6px' }}>
            <Plus size={16} /> {activeTab === 'requests' ? 'Apply for Leave' : 'Add Leave Type'}
          </button>
        </div>
      </div>

      {/* Leave Requests Table */}
      {activeTab === 'requests' && (
        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                {isHRMSAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
              ) : leaves.map(lr => (
                <tr key={lr.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{lr.employee_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lr.emp_code} · {lr.department_name || '—'}</div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '12px', fontWeight: 500, padding: '3px 8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>{lr.leave_type_name}</span></td>
                  <td style={{ fontSize: '12px' }}>{new Date(lr.from_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ fontSize: '12px' }}>{new Date(lr.to_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ fontSize: '13px', fontWeight: 600 }}>{lr.days}</td>
                  <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.reason}>{lr.reason || '—'}</td>
                  <td>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                      background: lr.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : lr.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: lr.status === 'Pending' ? 'var(--accent-yellow)' : lr.status === 'Approved' ? 'var(--accent-emerald)' : 'var(--accent-red)'
                    }}>{lr.status}</span>
                  </td>
                  {isHRMSAdmin && (
                    <td style={{ textAlign: 'center' }}>
                      {lr.status === 'Pending' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button onClick={() => handleAction(lr.id, 'Approved')} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--accent-emerald)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Approve</button>
                          <button onClick={() => handleAction(lr.id, 'Rejected')} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><X size={12} /> Reject</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lr.approver_name ? `By ${lr.approver_name}` : '—'}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Types */}
      {activeTab === 'types' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {leaveTypes.map(lt => (
            <div key={lt.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{lt.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{lt.default_days} days / year</div>
              </div>
              <button onClick={() => { setEditingType(lt); setTypeForm({ name: lt.name, default_days: lt.default_days }); setShowTypeModal(true); }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer' }}>Edit</button>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal-container" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Apply for Leave</h2>
              <button className="modal-close" onClick={() => setShowApplyModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {isHRMSAdmin && (
                  <div>
                    <label style={labelStyle}>Employee *</label>
                    <select style={inputStyle} value={applyForm.employee_id} onChange={e => setApplyForm({ ...applyForm, employee_id: e.target.value })} required>
                      <option value="">Select Employee</option>
                      {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.emp_code})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>Leave Type *</label>
                  <select style={inputStyle} value={applyForm.leave_type_id} onChange={e => setApplyForm({ ...applyForm, leave_type_id: e.target.value })} required>
                    <option value="">Select Type</option>
                    {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.default_days}d/yr)</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>From Date *</label><input type="date" style={inputStyle} value={applyForm.from_date} onChange={e => setApplyForm({ ...applyForm, from_date: e.target.value })} required /></div>
                  <div><label style={labelStyle}>To Date *</label><input type="date" style={inputStyle} value={applyForm.to_date} onChange={e => setApplyForm({ ...applyForm, to_date: e.target.value })} required /></div>
                </div>
                <div><label style={labelStyle}>Reason</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={applyForm.reason} onChange={e => setApplyForm({ ...applyForm, reason: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Leave Type Modal */}
      {showTypeModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingType ? 'Edit' : 'Add'} Leave Type</h2>
              <button className="modal-close" onClick={() => setShowTypeModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleTypeSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} required /></div>
                <div><label style={labelStyle}>Default Days / Year</label><input type="number" style={inputStyle} value={typeForm.default_days} onChange={e => setTypeForm({ ...typeForm, default_days: e.target.value })} min="0" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowTypeModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingType ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeaveManagement;
