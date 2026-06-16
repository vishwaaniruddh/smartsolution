import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import { Plus, Edit3, Trash2, X, Building, Briefcase, Users } from 'lucide-react';

const Departments = () => {
  const { toast, tenantId } = useHRMS();

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('departments');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('department'); // 'department' or 'designation'
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', department_id: '' });

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`${apiBaseUrl}/hrms/departments?tenant_id=${tenantId}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/hrms/designations?tenant_id=${tenantId}`).then(r => r.json()),
    ]).then(([deptRes, desRes]) => {
      if (deptRes.success) setDepartments(deptRes.data || []);
      if (desRes.success) setDesignations(desRes.data || []);
    }).finally(() => setLoading(false));
  }, [tenantId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setForm({ name: '', description: '', department_id: '' });
    setShowModal(true);
  };

  const openEditModal = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      department_id: item.department_id || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required.'); return; }

    const url = modalType === 'department'
      ? `${apiBaseUrl}/hrms/departments`
      : `${apiBaseUrl}/hrms/designations`;

    const payload = { ...form, tenant_id: tenantId };
    if (editingItem) payload.id = editingItem.id;

    fetch(url, {
      method: editingItem ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowModal(false);
          fetchData();
        } else {
          toast.error(data.error || 'Failed.');
        }
      });
  };

  const handleDelete = (type, id) => {
    if (!confirm(`Delete this ${type}?`)) return;
    const url = type === 'department'
      ? `${apiBaseUrl}/hrms/departments?id=${id}&tenant_id=${tenantId}`
      : `${apiBaseUrl}/hrms/designations?id=${id}&tenant_id=${tenantId}`;

    fetch(url, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchData();
        } else {
          toast.error(data.error || 'Delete failed.');
        }
      });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['departments', 'designations'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="modal-btn secondary" style={{
              padding: '8px 18px', fontSize: '12px', fontWeight: 600, borderRadius: 'var(--radius-md)',
              background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === tab ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
              cursor: 'pointer', textTransform: 'capitalize'
            }}>
              {tab === 'departments' ? <><Building size={14} style={{ marginRight: '6px' }} /> Departments</> : <><Briefcase size={14} style={{ marginRight: '6px' }} /> Designations</>}
            </button>
          ))}
        </div>
        {activeRole !== 'Sales Associate' && (
          <button className="add-lead-btn" onClick={() => openAddModal(activeTab === 'departments' ? 'department' : 'designation')} style={{ gap: '6px' }}>
            <Plus size={16} /> Add {activeTab === 'departments' ? 'Department' : 'Designation'}
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {loading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : departments.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
              No departments yet. Create your first department.
            </div>
          ) : departments.map(dept => (
            <div key={dept.id} style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                    color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}><Building size={20} /></div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{dept.name}</div>
                    {dept.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{dept.description}</div>}
                  </div>
                </div>
                {activeRole !== 'Sales Associate' && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => openEditModal('department', dept)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={14} /></button>
                    <button onClick={() => handleDelete('department', dept.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={13} /> {dept.employee_count || 0} employees</span>
                {dept.head_name && <span>Head: <strong style={{ color: 'var(--text-primary)' }}>{dept.head_name}</strong></span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'designations' && (
        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Designation</th>
                <th>Department</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : designations.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No designations yet.</td></tr>
              ) : designations.map(des => (
                <tr key={des.id}>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{des.name}</td>
                  <td style={{ fontSize: '13px' }}>{des.department_name || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {activeRole !== 'Sales Associate' ? (
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button onClick={() => openEditModal('designation', des)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete('designation', des.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit' : 'Add'} {modalType === 'department' ? 'Department' : 'Designation'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                {modalType === 'department' && (
                  <div><label style={labelStyle}>Description</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                )}
                {modalType === 'designation' && (
                  <div>
                    <label style={labelStyle}>Department</label>
                    <select style={inputStyle} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Departments;
