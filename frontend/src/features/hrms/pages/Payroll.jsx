import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import { useAuth } from '../../../context/AuthContext';
import { Plus, Play, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';

const Payroll = () => {
  const { toast, tenantId } = useHRMS();

  const { user } = useAuth();
  const isHRMSAdmin = ['Admin', 'Manager', 'Superadmin'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('payroll');
  const [payrollData, setPayrollData] = useState([]);
  const [structures, setStructures] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureForm, setStructureForm] = useState({
    employee_id: '', basic: '', hra: '', da: '', special_allowance: '',
    pf_deduction: '', esi_deduction: '', tax_deduction: '', other_deductions: ''
  });
  const [processing, setProcessing] = useState(false);

  const fetchPayroll = useCallback(() => {
    setLoading(true);
    fetch(`${apiBaseUrl}/hrms/payroll?tenant_id=${tenantId}&month=${selectedMonth}&year=${selectedYear}`)
      .then(r => r.json())
      .then(data => { if (data.success) setPayrollData(data.data || []); })
      .finally(() => setLoading(false));
  }, [tenantId, selectedMonth, selectedYear]);

  const fetchStructures = useCallback(() => {
    fetch(`${apiBaseUrl}/hrms/payroll?action=structure&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(data => { if (data.success) setStructures(data.data || []); });
  }, [tenantId]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/hrms/employees?tenant_id=${tenantId}&status=Active`)
      .then(r => r.json())
      .then(data => { if (data.success) setEmployees(data.data || []); });
  }, [tenantId]);

  useEffect(() => { if (activeTab === 'payroll') fetchPayroll(); else fetchStructures(); }, [activeTab, fetchPayroll, fetchStructures]);

  const handleRunPayroll = () => {
    setProcessing(true);
    fetch(`${apiBaseUrl}/hrms/payroll?action=run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: selectedMonth, year: selectedYear, tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchPayroll();
        } else {
          toast.error(data.error || 'Payroll run failed.');
        }
      })
      .finally(() => setProcessing(false));
  };

  const handleMarkPaid = (id) => {
    fetch(`${apiBaseUrl}/hrms/payroll`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'Paid', paid_on: new Date().toISOString().split('T')[0], tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) { toast.success('Marked as paid.'); fetchPayroll(); }
      });
  };

  const handleStructureSubmit = (e) => {
    e.preventDefault();
    if (!structureForm.employee_id) { toast.error('Select an employee.'); return; }

    fetch(`${apiBaseUrl}/hrms/payroll?action=structure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...structureForm, tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowStructureModal(false);
          setStructureForm({ employee_id: '', basic: '', hra: '', da: '', special_allowance: '', pf_deduction: '', esi_deduction: '', tax_deduction: '', other_deductions: '' });
          fetchStructures();
        } else {
          toast.error(data.error || 'Failed.');
        }
      });
  };

  const openEditStructure = (s) => {
    setStructureForm({
      employee_id: s.employee_id, basic: s.basic, hra: s.hra, da: s.da,
      special_allowance: s.special_allowance, pf_deduction: s.pf_deduction,
      esi_deduction: s.esi_deduction, tax_deduction: s.tax_deduction,
      other_deductions: s.other_deductions
    });
    setShowStructureModal(true);
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  const totalGross = payrollData.reduce((s, p) => s + parseFloat(p.gross_salary || 0), 0);
  const totalNet = payrollData.reduce((s, p) => s + parseFloat(p.net_salary || 0), 0);
  const paidCount = payrollData.filter(p => p.status === 'Paid').length;

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['payroll', ...(isHRMSAdmin ? ['structures'] : [])].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="modal-btn secondary" style={{
              padding: '8px 18px', fontSize: '12px', fontWeight: 600,
              background: activeTab === tab ? 'var(--bg-hover)' : 'transparent',
              color: activeTab === tab ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              border: activeTab === tab ? '1px solid var(--accent-cyan)' : '1px solid var(--border)', cursor: 'pointer'
            }}>
              {tab === 'payroll' ? '💰 Monthly Payroll' : '⚙️ Salary Structures'}
            </button>
          ))}
        </div>

        {activeTab === 'payroll' ? (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => { if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(selectedYear - 1); } else setSelectedMonth(selectedMonth - 1); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '140px', textAlign: 'center' }}>{monthName}</span>
              <button onClick={() => { if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(selectedYear + 1); } else setSelectedMonth(selectedMonth + 1); }}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}><ChevronRight size={16} /></button>
            </div>
            {isHRMSAdmin && (
              <button onClick={handleRunPayroll} disabled={processing} className="add-lead-btn" style={{ gap: '6px' }}>
                <Play size={14} /> {processing ? 'Processing...' : 'Run Payroll'}
              </button>
            )}
          </div>
        ) : (
          isHRMSAdmin && (
            <button className="add-lead-btn" onClick={() => { setStructureForm({ employee_id: '', basic: '', hra: '', da: '', special_allowance: '', pf_deduction: '', esi_deduction: '', tax_deduction: '', other_deductions: '' }); setShowStructureModal(true); }} style={{ gap: '6px' }}>
              <Plus size={16} /> Add Salary Structure
            </button>
          )
        )}
      </div>

      {/* Payroll Summary */}
      {activeTab === 'payroll' && (
        <>
          {isHRMSAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Gross</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '4px' }}>{formatCurrency(totalGross)}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Net Payable</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: '4px' }}>{formatCurrency(totalNet)}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Paid / Total</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{paidCount} / {payrollData.length}</div>
              </div>
            </div>
          )}

          <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net Salary</th>
                  <th>Status</th>
                  {isHRMSAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
                ) : payrollData.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No payroll data for {monthName}. Set up salary structures and run payroll.</td></tr>
                ) : payrollData.map(pr => (
                  <tr key={pr.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{pr.employee_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{pr.emp_code}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{pr.department_name || '—'}</td>
                    <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 500 }}>{formatCurrency(pr.gross_salary)}</td>
                    <td style={{ textAlign: 'right', fontSize: '13px', color: 'var(--accent-red)' }}>{formatCurrency(pr.total_deductions)}</td>
                    <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatCurrency(pr.net_salary)}</td>
                    <td>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                        background: pr.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : pr.status === 'Processed' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: pr.status === 'Paid' ? 'var(--accent-emerald)' : pr.status === 'Processed' ? 'var(--accent-blue)' : 'var(--accent-yellow)'
                      }}>{pr.status}</span>
                    </td>
                    {isHRMSAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        {pr.status === 'Processed' && (
                          <button onClick={() => handleMarkPaid(pr.id)} style={{
                            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: 'var(--accent-emerald)', cursor: 'pointer', padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}><Check size={12} /> Mark Paid</button>
                        )}
                        {pr.status === 'Paid' && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{pr.paid_on ? new Date(pr.paid_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Paid'}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Salary Structures */}
      {activeTab === 'structures' && (
        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th style={{ textAlign: 'right' }}>Basic</th>
                <th style={{ textAlign: 'right' }}>HRA</th>
                <th style={{ textAlign: 'right' }}>DA</th>
                <th style={{ textAlign: 'right' }}>Allowance</th>
                <th style={{ textAlign: 'right' }}>PF</th>
                <th style={{ textAlign: 'right' }}>Net</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {structures.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No salary structures configured yet.</td></tr>
              ) : structures.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{s.employee_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{s.emp_code}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{s.department_name || '—'}</td>
                  <td style={{ textAlign: 'right', fontSize: '12px' }}>{formatCurrency(s.basic)}</td>
                  <td style={{ textAlign: 'right', fontSize: '12px' }}>{formatCurrency(s.hra)}</td>
                  <td style={{ textAlign: 'right', fontSize: '12px' }}>{formatCurrency(s.da)}</td>
                  <td style={{ textAlign: 'right', fontSize: '12px' }}>{formatCurrency(s.special_allowance)}</td>
                  <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--accent-red)' }}>{formatCurrency(s.pf_deduction)}</td>
                  <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatCurrency(s.net_salary)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => openEditStructure(s)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Salary Structure Modal */}
      {showStructureModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowStructureModal(false)}>
          <div className="modal-container" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Salary Structure</h2>
              <button className="modal-close" onClick={() => setShowStructureModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleStructureSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Employee *</label>
                  <select style={inputStyle} value={structureForm.employee_id} onChange={e => setStructureForm({ ...structureForm, employee_id: e.target.value })} required>
                    <option value="">Select Employee</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.emp_code})</option>)}
                  </select>
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', margin: '4px 0 0' }}>Earnings</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Basic Salary</label><input type="number" style={inputStyle} value={structureForm.basic} onChange={e => setStructureForm({ ...structureForm, basic: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>HRA</label><input type="number" style={inputStyle} value={structureForm.hra} onChange={e => setStructureForm({ ...structureForm, hra: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>DA</label><input type="number" style={inputStyle} value={structureForm.da} onChange={e => setStructureForm({ ...structureForm, da: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>Special Allowance</label><input type="number" style={inputStyle} value={structureForm.special_allowance} onChange={e => setStructureForm({ ...structureForm, special_allowance: e.target.value })} placeholder="0.00" /></div>
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', margin: '4px 0 0' }}>Deductions</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>PF Deduction</label><input type="number" style={inputStyle} value={structureForm.pf_deduction} onChange={e => setStructureForm({ ...structureForm, pf_deduction: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>ESI Deduction</label><input type="number" style={inputStyle} value={structureForm.esi_deduction} onChange={e => setStructureForm({ ...structureForm, esi_deduction: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>Tax Deduction</label><input type="number" style={inputStyle} value={structureForm.tax_deduction} onChange={e => setStructureForm({ ...structureForm, tax_deduction: e.target.value })} placeholder="0.00" /></div>
                  <div><label style={labelStyle}>Other Deductions</label><input type="number" style={inputStyle} value={structureForm.other_deductions} onChange={e => setStructureForm({ ...structureForm, other_deductions: e.target.value })} placeholder="0.00" /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowStructureModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Save Structure</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Payroll;
