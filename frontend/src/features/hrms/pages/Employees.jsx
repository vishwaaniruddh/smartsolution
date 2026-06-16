import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import {
  Search, Plus, Edit3, X, User, Mail, Phone, MapPin,
  Calendar, Briefcase, Building, Eye
} from 'lucide-react';

const statusColors = {
  'Active': { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' },
  'On Probation': { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)' },
  'Resigned': { bg: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' },
  'Terminated': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' },
};

const Employees = () => {
  const { toast, tenantId, activeRole } = useHRMS();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', gender: '', dob: '',
    blood_group: '', address: '', department_id: '', designation_id: '',
    date_of_joining: '', employment_type: 'Full-time', status: 'Active',
    bank_name: '', account_number: '', ifsc_code: '', pan_number: ''
  });

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ tenant_id: tenantId });
    if (searchTerm) params.append('search', searchTerm);
    if (filterDept) params.append('department_id', filterDept);
    if (filterStatus) params.append('status', filterStatus);

    fetch(`${apiBaseUrl}/hrms/employees?${params}`)
      .then(res => res.json())
      .then(data => { if (data.success) setEmployees(data.data || []); })
      .finally(() => setLoading(false));
  }, [tenantId, searchTerm, filterDept, filterStatus]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/hrms/departments?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setDepartments(data.data || []); });
    fetch(`${apiBaseUrl}/hrms/designations?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => { if (data.success) setDesignations(data.data || []); });
  }, [tenantId]);

  const resetForm = () => {
    setForm({
      first_name: '', last_name: '', email: '', phone: '', gender: '', dob: '',
      blood_group: '', address: '', department_id: '', designation_id: '',
      date_of_joining: '', employment_type: 'Full-time', status: 'Active',
      bank_name: '', account_number: '', ifsc_code: '', pan_number: ''
    });
    setEditingEmployee(null);
  };

  const openAddModal = () => { resetForm(); setShowModal(true); };

  const openEditModal = (emp) => {
    // Fetch full details including bank
    fetch(`${apiBaseUrl}/hrms/employees?id=${emp.id}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const e = data.data;
          setForm({
            first_name: e.first_name || '', last_name: e.last_name || '',
            email: e.email || '', phone: e.phone || '', gender: e.gender || '',
            dob: e.dob || '', blood_group: e.blood_group || '', address: e.address || '',
            department_id: e.department_id || '', designation_id: e.designation_id || '',
            date_of_joining: e.date_of_joining || '', employment_type: e.employment_type || 'Full-time',
            status: e.status || 'Active',
            bank_name: e.bank_details?.bank_name || '', account_number: e.bank_details?.account_number || '',
            ifsc_code: e.bank_details?.ifsc_code || '', pan_number: e.bank_details?.pan_number || ''
          });
          setEditingEmployee(e);
          setShowModal(true);
        }
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      toast.error('First name and last name are required.');
      return;
    }

    const payload = { ...form, tenant_id: tenantId };
    const isEdit = !!editingEmployee;
    if (isEdit) payload.id = editingEmployee.id;

    fetch(`${apiBaseUrl}/hrms/employees`, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(isEdit ? 'Employee updated successfully!' : `Employee created! Code: ${data.emp_code}`);
          setShowModal(false);
          resetForm();
          fetchEmployees();
        } else {
          toast.error(data.error || 'Operation failed.');
        }
      });
  };

  const openDrawer = (emp) => {
    fetch(`${apiBaseUrl}/hrms/employees?id=${emp.id}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSelectedEmployee(data.data);
          setShowDrawer(true);
          setActiveTab('personal');
        }
      });
  };

  const filteredDesignations = form.department_id
    ? designations.filter(d => String(d.department_id) === String(form.department_id))
    : designations;

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="leads-search" style={{ minWidth: '260px' }}>
            <Search size={16} />
            <input type="text" placeholder="Search by name, email, code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '150px' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '130px' }}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="On Probation">On Probation</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
        {activeRole !== 'Sales Associate' && (
          <button className="add-lead-btn" onClick={openAddModal} style={{ gap: '6px' }}>
            <Plus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Code</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Type</th>
              <th>Joining Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading employees...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No employees found. Add your first employee!</td></tr>
            ) : employees.map(emp => {
              const sc = statusColors[emp.status] || { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
              return (
                <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => openDrawer(emp)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'var(--gradient-blue)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: 700, flexShrink: 0
                      }}>
                        {(emp.first_name?.charAt(0) || '') + (emp.last_name?.charAt(0) || '')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{emp.first_name} {emp.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>{emp.emp_code}</span></td>
                  <td style={{ fontSize: '13px' }}>{emp.department_name || '—'}</td>
                  <td style={{ fontSize: '13px' }}>{emp.designation_name || '—'}</td>
                  <td style={{ fontSize: '12px' }}>{emp.employment_type}</td>
                  <td style={{ fontSize: '12px' }}>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                  <td>
                    <span style={{
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                      background: sc.bg, color: sc.color
                    }}>{emp.status}</span>
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button onClick={() => openDrawer(emp)} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '4px' }} title="View"><Eye size={15} /></button>
                      {activeRole !== 'Sales Associate' && (
                        <button onClick={() => openEditModal(emp)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }} title="Edit"><Edit3 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Personal Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '4px 0 0' }}>Personal Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>First Name *</label><input style={inputStyle} value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Last Name *</label><input style={inputStyle} value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required /></div>
                  <div><label style={labelStyle}>Email</label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select style={inputStyle} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date of Birth</label><input type="date" style={inputStyle} value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} /></div>
                  <div><label style={labelStyle}>Blood Group</label><input style={inputStyle} value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })} placeholder="e.g. O+" /></div>
                </div>
                <div><label style={labelStyle}>Address</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>

                {/* Job Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 0' }}>Job Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <select style={inputStyle} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value, designation_id: '' })}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Designation</label>
                    <select style={inputStyle} value={form.designation_id} onChange={e => setForm({ ...form, designation_id: e.target.value })}>
                      <option value="">Select Designation</option>
                      {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div><label style={labelStyle}>Date of Joining</label><input type="date" style={inputStyle} value={form.date_of_joining} onChange={e => setForm({ ...form, date_of_joining: e.target.value })} /></div>
                  <div>
                    <label style={labelStyle}>Employment Type</label>
                    <select style={inputStyle} value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="On Probation">On Probation</option>
                      <option value="Resigned">Resigned</option>
                      <option value="Terminated">Terminated</option>
                    </select>
                  </div>
                </div>

                {/* Bank Info */}
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 0' }}>Bank Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Bank Name</label><input style={inputStyle} value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
                  <div><label style={labelStyle}>Account Number</label><input style={inputStyle} value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
                  <div><label style={labelStyle}>IFSC Code</label><input style={inputStyle} value={form.ifsc_code} onChange={e => setForm({ ...form, ifsc_code: e.target.value })} /></div>
                  <div><label style={labelStyle}>PAN Number</label><input style={inputStyle} value={form.pan_number} onChange={e => setForm({ ...form, pan_number: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingEmployee ? 'Update Employee' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Employee Detail Drawer */}
      {showDrawer && selectedEmployee && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setShowDrawer(false)} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', maxWidth: '95vw',
            background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
            zIndex: 1001, display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'var(--gradient-blue)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', fontWeight: 700
                }}>
                  {(selectedEmployee.first_name?.charAt(0) || '') + (selectedEmployee.last_name?.charAt(0) || '')}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{selectedEmployee.first_name} {selectedEmployee.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{selectedEmployee.emp_code} · {selectedEmployee.designation_name || 'No designation'}</div>
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
              {['personal', 'job', 'bank'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '12px 16px', fontSize: '12px', fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  textTransform: 'capitalize', transition: 'all 0.2s'
                }}>
                  {tab === 'personal' ? 'Personal' : tab === 'job' ? 'Job Details' : 'Bank Info'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {activeTab === 'personal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { icon: Mail, label: 'Email', value: selectedEmployee.email },
                    { icon: Phone, label: 'Phone', value: selectedEmployee.phone },
                    { icon: User, label: 'Gender', value: selectedEmployee.gender },
                    { icon: Calendar, label: 'Date of Birth', value: selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                    { icon: User, label: 'Blood Group', value: selectedEmployee.blood_group },
                    { icon: MapPin, label: 'Address', value: selectedEmployee.address },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <item.icon size={16} style={{ color: 'var(--accent-blue)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginTop: '2px' }}>{item.value || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'job' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { icon: Building, label: 'Department', value: selectedEmployee.department_name },
                    { icon: Briefcase, label: 'Designation', value: selectedEmployee.designation_name },
                    { icon: Calendar, label: 'Date of Joining', value: selectedEmployee.date_of_joining ? new Date(selectedEmployee.date_of_joining).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null },
                    { icon: Briefcase, label: 'Employment Type', value: selectedEmployee.employment_type },
                    { icon: User, label: 'Reporting Manager', value: selectedEmployee.manager_name },
                    { icon: User, label: 'Status', value: selectedEmployee.status },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <item.icon size={16} style={{ color: 'var(--accent-emerald)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginTop: '2px' }}>{item.value || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'bank' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {selectedEmployee.bank_details ? [
                    { label: 'Bank Name', value: selectedEmployee.bank_details.bank_name },
                    { label: 'Account Number', value: selectedEmployee.bank_details.account_number },
                    { label: 'IFSC Code', value: selectedEmployee.bank_details.ifsc_code },
                    { label: 'PAN Number', value: selectedEmployee.bank_details.pan_number },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <Briefcase size={16} style={{ color: 'var(--accent-purple)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, marginTop: '2px' }}>{item.value || '—'}</div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>No bank details available.</div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {activeRole !== 'Sales Associate' && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowDrawer(false); openEditModal(selectedEmployee); }} className="modal-btn primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Edit3 size={14} /> Edit Profile
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default Employees;
