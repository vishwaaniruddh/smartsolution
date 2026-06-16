import React, { useState, useEffect, useCallback } from 'react';
import { apiBaseUrl } from '../../../utils/env.js';
import { useToast } from '../../../components/NotificationContext';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Users, ChevronLeft, ChevronRight, Save } from 'lucide-react';

const statusOptions = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];
const statusConfig = {
  'Present': { color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.1)', icon: '✓' },
  'Absent': { color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)', icon: '✗' },
  'Half-Day': { color: 'var(--accent-orange)', bg: 'rgba(249, 115, 22, 0.1)', icon: '½' },
  'Late': { color: 'var(--accent-yellow)', bg: 'rgba(245, 158, 11, 0.1)', icon: '⏰' },
  'On Leave': { color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.1)', icon: '🏖' },
};

const Attendance = () => {
  const toast = useToast();
  const tenantId = localStorage.getItem('crm_tenant_id') || '1';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState([]);
  const [selectedEmpForCalendar, setSelectedEmpForCalendar] = useState('');

  // Fetch employees
  useEffect(() => {
    fetch(`${apiBaseUrl}/hrms/employees?tenant_id=${tenantId}&status=Active`)
      .then(r => r.json())
      .then(data => { if (data.success) setEmployees(data.data || []); });
  }, [tenantId]);

  // Fetch attendance for selected date
  const fetchDailyAttendance = useCallback(() => {
    setLoading(true);
    fetch(`${apiBaseUrl}/hrms/attendance?tenant_id=${tenantId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const map = {};
          (data.data || []).forEach(a => {
            map[a.employee_id] = { status: a.status, clock_in: a.clock_in || '', clock_out: a.clock_out || '', remarks: a.remarks || '' };
          });
          setAttendanceMap(map);
        }
      })
      .finally(() => setLoading(false));
  }, [tenantId, selectedDate]);

  useEffect(() => { if (viewMode === 'daily') fetchDailyAttendance(); }, [fetchDailyAttendance, viewMode]);

  // Fetch calendar data
  useEffect(() => {
    if (viewMode === 'calendar' && selectedEmpForCalendar) {
      fetch(`${apiBaseUrl}/hrms/attendance?tenant_id=${tenantId}&employee_id=${selectedEmpForCalendar}&month=${calendarMonth}&year=${calendarYear}`)
        .then(r => r.json())
        .then(data => { if (data.success) setCalendarData(data.data || []); });
    }
  }, [viewMode, selectedEmpForCalendar, calendarMonth, calendarYear, tenantId]);

  const updateEntry = (empId, field, value) => {
    setAttendanceMap(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || { status: 'Present', clock_in: '', clock_out: '', remarks: '' }), [field]: value }
    }));
  };

  const handleMarkAll = (status) => {
    const newMap = {};
    employees.forEach(emp => {
      newMap[emp.id] = { ...(attendanceMap[emp.id] || { clock_in: '', clock_out: '', remarks: '' }), status };
    });
    setAttendanceMap(newMap);
  };

  const handleSave = () => {
    setSaving(true);
    const entries = employees.map(emp => ({
      employee_id: emp.id,
      status: attendanceMap[emp.id]?.status || 'Present',
      clock_in: attendanceMap[emp.id]?.clock_in || null,
      clock_out: attendanceMap[emp.id]?.clock_out || null,
      remarks: attendanceMap[emp.id]?.remarks || ''
    }));

    fetch(`${apiBaseUrl}/hrms/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, date: selectedDate, tenant_id: tenantId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
        } else {
          toast.error(data.error || 'Save failed.');
        }
      })
      .finally(() => setSaving(false));
  };

  // Calendar generation
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const calMap = {};
    calendarData.forEach(a => {
      const day = new Date(a.date).getDate();
      calMap[day] = a.status;
    });

    const cells = [];
    // Empty cells for offset
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} style={{ padding: '8px' }} />);
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const st = calMap[d];
      const cfg = st ? statusConfig[st] : null;
      cells.push(
        <div key={d} style={{
          padding: '8px', textAlign: 'center', borderRadius: 'var(--radius-sm)',
          background: cfg ? cfg.bg : 'var(--bg-hover)', border: '1px solid var(--border)',
          fontSize: '12px', minHeight: '44px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '2px'
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d}</span>
          {cfg && <span style={{ fontSize: '10px', color: cfg.color, fontWeight: 600 }}>{st}</span>}
        </div>
      );
    }
    return cells;
  };

  const inputStyle = {
    padding: '6px 8px', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none'
  };

  const summary = {
    Present: 0, Absent: 0, 'Half-Day': 0, Late: 0, 'On Leave': 0, 'Not Marked': 0
  };
  employees.forEach(emp => {
    const s = attendanceMap[emp.id]?.status;
    if (s) summary[s] = (summary[s] || 0) + 1;
    else summary['Not Marked']++;
  });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setViewMode('daily')} className="modal-btn secondary" style={{
            padding: '8px 16px', fontSize: '12px', fontWeight: 600,
            background: viewMode === 'daily' ? 'var(--bg-hover)' : 'transparent',
            color: viewMode === 'daily' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: viewMode === 'daily' ? '1px solid var(--accent-cyan)' : '1px solid var(--border)', cursor: 'pointer'
          }}>
            <Clock size={14} style={{ marginRight: '6px' }} /> Daily View
          </button>
          <button onClick={() => setViewMode('calendar')} className="modal-btn secondary" style={{
            padding: '8px 16px', fontSize: '12px', fontWeight: 600,
            background: viewMode === 'calendar' ? 'var(--bg-hover)' : 'transparent',
            color: viewMode === 'calendar' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: viewMode === 'calendar' ? '1px solid var(--accent-cyan)' : '1px solid var(--border)', cursor: 'pointer'
          }}>
            <Calendar size={14} style={{ marginRight: '6px' }} /> Calendar View
          </button>
        </div>

        {viewMode === 'daily' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...inputStyle, padding: '8px 12px' }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              {['Present', 'Absent'].map(s => (
                <button key={s} onClick={() => handleMarkAll(s)} style={{
                  padding: '6px 12px', fontSize: '11px', fontWeight: 600,
                  background: statusConfig[s].bg, color: statusConfig[s].color,
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                }}>Mark All {s}</button>
              ))}
            </div>
            <button onClick={handleSave} disabled={saving} className="add-lead-btn" style={{ gap: '6px' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {viewMode === 'daily' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.entries(summary).map(([label, count]) => {
            const cfg = statusConfig[label] || { color: 'var(--text-muted)', bg: 'var(--bg-hover)' };
            return (
              <div key={label} style={{
                padding: '12px 20px', borderRadius: 'var(--radius-md)',
                background: cfg.bg, border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px'
              }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: cfg.color }}>{count}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily View Table */}
      {viewMode === 'daily' && (
        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Status</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No active employees found.</td></tr>
              ) : employees.map(emp => {
                const entry = attendanceMap[emp.id] || { status: '', clock_in: '', clock_out: '', remarks: '' };
                return (
                  <tr key={emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: 'var(--gradient-blue)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, flexShrink: 0
                        }}>{(emp.first_name?.charAt(0) || '') + (emp.last_name?.charAt(0) || '')}</div>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{emp.first_name} {emp.last_name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{emp.emp_code}</td>
                    <td style={{ fontSize: '12px' }}>{emp.department_name || '—'}</td>
                    <td>
                      <select value={entry.status} onChange={e => updateEntry(emp.id, 'status', e.target.value)} style={{
                        ...inputStyle, width: '110px',
                        color: entry.status ? (statusConfig[entry.status]?.color || 'var(--text-primary)') : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        <option value="">Select</option>
                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><input type="time" value={entry.clock_in} onChange={e => updateEntry(emp.id, 'clock_in', e.target.value)} style={{ ...inputStyle, width: '100px' }} /></td>
                    <td><input type="time" value={entry.clock_out} onChange={e => updateEntry(emp.id, 'clock_out', e.target.value)} style={{ ...inputStyle, width: '100px' }} /></td>
                    <td><input type="text" value={entry.remarks} onChange={e => updateEntry(emp.id, 'remarks', e.target.value)} placeholder="Optional" style={{ ...inputStyle, width: '140px' }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <select value={selectedEmpForCalendar} onChange={e => setSelectedEmpForCalendar(e.target.value)} style={{ ...inputStyle, minWidth: '220px', padding: '8px 12px' }}>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.emp_code})</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => {
                if (calendarMonth === 1) { setCalendarMonth(12); setCalendarYear(calendarYear - 1); }
                else setCalendarMonth(calendarMonth - 1);
              }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '120px', textAlign: 'center' }}>
                {new Date(calendarYear, calendarMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => {
                if (calendarMonth === 12) { setCalendarMonth(1); setCalendarYear(calendarYear + 1); }
                else setCalendarMonth(calendarMonth + 1);
              }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {!selectedEmpForCalendar ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Select an employee to view their attendance calendar.</div>
          ) : (
            <>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '6px' }}>{d}</div>
                ))}
              </div>
              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {renderCalendar()}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                {Object.entries(statusConfig).map(([label, cfg]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: cfg.bg, border: `1px solid ${cfg.color}` }} />
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Attendance;
