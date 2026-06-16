import { useState, useEffect } from 'react';
import { apiBaseUrl } from '../../../utils/env.js';
import { useHRMS } from '../context/HRMSContext';
import {
  Users, Calendar, Clock, Briefcase, UserPlus, Gift,
  AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';

const HRMSDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { tenantId } = useHRMS();

  useEffect(() => {
    fetch(`${apiBaseUrl}/hrms/dashboard?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) setData(result.data);
      })
      .catch(err => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          Loading HRMS Dashboard...
        </div>
      </div>
    );
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Failed to load dashboard data.</div>;
  }

  const attToday = data.attendance_today || {};
  const presentCount = (attToday['Present'] || 0) + (attToday['Late'] || 0);
  const absentCount = attToday['Absent'] || 0;
  const onLeaveCount = attToday['On Leave'] || 0;
  const halfDayCount = attToday['Half-Day'] || 0;
  const notMarked = attToday['Not Marked'] || 0;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Total Employees */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
            color: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.total_employees}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Employees</div>
          </div>
        </div>

        {/* Present Today */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))',
            color: 'var(--accent-emerald)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{presentCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Present Today</div>
          </div>
        </div>

        {/* Absent Today */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
            color: 'var(--accent-red)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <XCircle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{absentCount + onLeaveCount}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Absent / On Leave</div>
          </div>
        </div>

        {/* Pending Leaves */}
        <div style={{
          background: 'var(--bg-card)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
            color: 'var(--accent-yellow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <AlertCircle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.pending_leave_count}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Pending Leave Requests</div>
          </div>
        </div>
      </div>

      {/* Middle Row: Department Breakdown + Attendance Ring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Department Breakdown */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={16} style={{ color: 'var(--accent-blue)' }} /> Department Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.departments?.length > 0 ? data.departments.map((dept, i) => {
              const maxCount = Math.max(...data.departments.map(d => parseInt(d.count) || 1));
              const pct = Math.max(5, (parseInt(dept.count) / maxCount) * 100);
              const colors = ['var(--accent-blue)', 'var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-purple)', 'var(--accent-orange)'];
              const color = colors[i % colors.length];
              return (
                <div key={dept.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{dept.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{dept.count}</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No departments configured yet.</div>
            )}
          </div>
        </div>

        {/* Today's Attendance Summary */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--accent-emerald)' }} /> Today's Attendance
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Present', count: presentCount, color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.1)' },
              { label: 'Absent', count: absentCount, color: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.1)' },
              { label: 'On Leave', count: onLeaveCount, color: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.1)' },
              { label: 'Half Day', count: halfDayCount, color: 'var(--accent-orange)', bg: 'rgba(249, 115, 22, 0.1)' },
              { label: 'Late', count: attToday['Late'] || 0, color: 'var(--accent-yellow)', bg: 'rgba(245, 158, 11, 0.1)' },
              { label: 'Not Marked', count: notMarked, color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
            ].map(item => (
              <div key={item.label} style={{
                background: item.bg,
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                textAlign: 'center',
                border: '1px solid transparent'
              }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: item.color }}>{item.count}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Leaves + Recent Hires + Birthdays */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Pending Leave Requests */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--accent-yellow)' }} /> Recent Leave Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.recent_leave_requests?.length > 0 ? data.recent_leave_requests.map(lr => (
              <div key={lr.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{lr.employee_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lr.leave_type_name} · {lr.days}d</div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px',
                  background: lr.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : lr.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: lr.status === 'Pending' ? 'var(--accent-yellow)' : lr.status === 'Approved' ? 'var(--accent-emerald)' : 'var(--accent-red)'
                }}>
                  {lr.status}
                </span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>No leave requests yet.</div>
            )}
          </div>
        </div>

        {/* Recent Hires */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={16} style={{ color: 'var(--accent-cyan)' }} /> Recent Hires
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.recent_hires?.length > 0 ? data.recent_hires.map((hire, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{hire.first_name} {hire.last_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hire.department_name || 'Unassigned'}</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                  {hire.date_of_joining ? new Date(hire.date_of_joining).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>No recent hires in the last 30 days.</div>
            )}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={16} style={{ color: 'var(--accent-purple)' }} /> Upcoming Birthdays
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.upcoming_birthdays?.length > 0 ? data.upcoming_birthdays.map((bday, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  🎂 {bday.first_name} {bday.last_name}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 500 }}>
                  {bday.dob ? new Date(bday.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </span>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>No upcoming birthdays this week.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRMSDashboard;
