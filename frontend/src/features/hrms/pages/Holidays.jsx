import React, { useState, useEffect, useCallback } from 'react';
import { apiBaseUrl } from '../../../utils/env.js';
import { useToast } from '../../../components/NotificationContext';
import { Calendar, Plus, Edit3, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';

const Holidays = () => {
  const toast = useToast();
  const tenantId = localStorage.getItem('crm_tenant_id') || '1';

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form, setForm] = useState({ name: '', date: '' });

  const fetchHolidays = useCallback(() => {
    setLoading(true);
    fetch(`${apiBaseUrl}/hrms/holidays?tenant_id=${tenantId}&year=${year}`)
      .then(r => r.json())
      .then(data => { if (data.success) setHolidays(data.data || []); })
      .finally(() => setLoading(false));
  }, [tenantId, year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.date) { toast.error('Name and date are required.'); return; }

    const payload = { ...form, tenant_id: tenantId };
    if (editingHoliday) payload.id = editingHoliday.id;

    fetch(`${apiBaseUrl}/hrms/holidays`, {
      method: editingHoliday ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowModal(false);
          setEditingHoliday(null);
          setForm({ name: '', date: '' });
          fetchHolidays();
        } else {
          toast.error(data.error || 'Failed.');
        }
      });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this holiday?')) return;
    fetch(`${apiBaseUrl}/hrms/holidays?id=${id}&tenant_id=${tenantId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data.success) { toast.success(data.message); fetchHolidays(); }
        else toast.error(data.error || 'Delete failed.');
      });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  // Group holidays by month
  const groupedByMonth = {};
  holidays.forEach(h => {
    const month = new Date(h.date).toLocaleDateString('en-US', { month: 'long' });
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(h);
  });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setYear(year - 1)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '60px', textAlign: 'center' }}>{year}</span>
          <button onClick={() => setYear(year + 1)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}>
            <ChevronRight size={16} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>{holidays.length} holidays</span>
        </div>
        <button className="add-lead-btn" onClick={() => { setEditingHoliday(null); setForm({ name: '', date: '' }); setShowModal(true); }} style={{ gap: '6px' }}>
          <Plus size={16} /> Add Holiday
        </button>
      </div>

      {/* Holidays List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading holidays...</div>
      ) : holidays.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          No holidays configured for {year}. Add your first holiday!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(groupedByMonth).map(([month, items]) => (
            <div key={month}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px', letterSpacing: '0.02em' }}>{month}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map(h => {
                  const d = new Date(h.date);
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                  const dayNum = d.getDate();
                  const isPast = d < new Date(new Date().toDateString());
                  return (
                    <div key={h.id} style={{
                      background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', padding: '14px 20px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      opacity: isPast ? 0.6 : 1, transition: 'opacity 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
                          color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 700, border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                          {dayNum}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{h.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{dayName}, {d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setEditingHoliday(h); setForm({ name: h.name, date: h.date }); setShowModal(true); }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(h.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Holiday Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Diwali" required /></div>
                <div><label style={labelStyle}>Date *</label><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingHoliday ? 'Update' : 'Add Holiday'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;
