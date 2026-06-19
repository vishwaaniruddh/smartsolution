import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useServiceDesk } from '../context/ServiceDeskContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Eye, Trash2, CheckCircle2, UserCheck, X, Search, Filter, ChevronDown, Ticket, Paperclip, RefreshCw, Calendar, DollarSign, PlusCircle, Trash } from 'lucide-react';

const PRIORITY_COLORS = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  Low:      { color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};
const STATUS_COLORS = {
  'Open':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  'In Progress': { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  'On Hold':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Resolved':    { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Closed':      { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

export default function Tickets({ myTicketsOnly = false }) {
  const { tenantId, user, toast, confirm, categories, agents } = useServiceDesk();
  const navigate = useNavigate();

  // List state
  const [tickets, setTickets]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [slaFilter, setSlaFilter]       = useState('');
  const [limit, setLimit]             = useState(10);

  // Bulk selection
  const [selected, setSelected]       = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState('');

  // New Ticket form
  const [newSubject, setNewSubject]       = useState('');
  const [newDesc, setNewDesc]             = useState('');
  const [newCategory, setNewCategory]     = useState('General');
  const [newPriority, setNewPriority]     = useState('Medium');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  
  // Custom ticket attributes form state
  const [newMaterials, setNewMaterials]   = useState([{ material_name: '', quantity: 1, unit: 'pcs' }]);
  const [newFunds, setNewFunds]           = useState({ amount: '', payment_method: 'Cash', payment_details: '', remarks: '' });
  const [newSchedule, setNewSchedule]     = useState('');
  const [attachmentsQueue, setAttachmentsQueue] = useState([]); // Array of { file, type, description }

  const fetchTickets = (
    pg = page,
    s = search,
    st = statusFilter,
    pr = priorityFilter,
    cat = categoryFilter,
    df = dateFrom,
    dt = dateTo,
    ag = assignedFilter,
    sla = slaFilter,
    lim = limit
  ) => {
    setLoading(true);
    const params = new URLSearchParams({
      tenant_id: tenantId,
      page: pg,
      limit: lim,
      search: s,
      status: st,
      priority: pr,
      category: cat,
      date_from: df,
      date_to: dt,
      assigned_to: ag,
      sla_breached: sla === 'breached' ? 1 : '',
      ...(myTicketsOnly && user?.id ? { requester_id: user.id } : {})
    });
    fetch(`${apiBaseUrl}/servicedesk/tickets?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setTickets(res.data || []);
          setPage(res.pagination?.page || 1);
          setTotalPages(res.pagination?.total_pages || 1);
          setTotalRecords(res.pagination?.total_records || 0);
        } else toast.showError(res.error || 'Failed to load tickets.');
      })
      .catch(() => toast.showError('Connection error.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets(1, '', '', '', '', '', '', '', '', limit);
  }, [tenantId, limit]);

  // Select all
  const allSelected = tickets.length > 0 && selected.length === tickets.length;
  const toggleAll = () => setSelected(allSelected ? [] : tickets.map(t => t.id));
  const toggleOne = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // Create ticket
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) {
      toast.showError('Subject and description are required.');
      return;
    }
    const agent = agents.find(a => a.id === parseInt(newAssignedTo));
    
    // Filter out empty material rows
    const materials = newMaterials.filter(m => m.material_name.trim() !== '');

    // Parse fund request
    const funds = parseFloat(newFunds.amount) > 0 ? {
      amount: parseFloat(newFunds.amount),
      payment_method: newFunds.payment_method,
      payment_details: newFunds.payment_details,
      remarks: newFunds.remarks
    } : null;

    const payload = {
      subject: newSubject,
      description: newDesc,
      category: newCategory,
      priority: newPriority,
      requester_id: user?.id || 1,
      requester_name: user ? `${user.first_name} ${user.last_name}` : 'User',
      assigned_to: newAssignedTo ? parseInt(newAssignedTo) : null,
      agent_name: agent ? `${agent.first_name} ${agent.last_name}` : '',
      scheduled_visit_at: newSchedule || null,
      materials,
      funds,
      tenant_id: tenantId
    };

    try {
      const response = await fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const res = await response.json();
      if (!res.success) {
        toast.showError(res.error || 'Failed to create ticket.');
        return;
      }

      const newTicketId = res.id;

      // Upload attachments sequentially if any exist in the queue
      if (attachmentsQueue.length > 0) {
        toast.info(`Ticket created. Uploading ${attachmentsQueue.length} attachments...`);
        const uploadPromises = attachmentsQueue.map(async (item) => {
          const formData = new FormData();
          formData.append('ticket_id', newTicketId);
          formData.append('uploaded_by', user?.id || 1);
          formData.append('file', item.file);
          formData.append('attachment_type', item.type);
          formData.append('description', item.description);

          const uploadRes = await fetch(`${apiBaseUrl}/servicedesk/attachments?tenant_id=${tenantId}`, {
            method: 'POST',
            body: formData
          });
          return uploadRes.json();
        });
        await Promise.all(uploadPromises);
      }

      toast.showSuccess(`Ticket ${res.ticket_number} created successfully!`);
      setShowAddModal(false);
      resetForm();
      fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit);
    } catch (err) {
      console.error(err);
      toast.showError('Error creating ticket or uploading attachments.');
    }
  };

  const resetForm = () => {
    setNewSubject('');
    setNewDesc('');
    setNewCategory('General');
    setNewPriority('Medium');
    setNewAssignedTo('');
    setNewMaterials([{ material_name: '', quantity: 1, unit: 'pcs' }]);
    setNewFunds({ amount: '', payment_method: 'Cash', payment_details: '', remarks: '' });
    setNewSchedule('');
    setAttachmentsQueue([]);
  };

  // Delete
  const handleDelete = async (ticket) => {
    const ok = await confirm(`Delete ticket ${ticket.ticket_number}? This action cannot be undone.`, 'Delete Ticket');
    if (!ok) return;
    fetch(`${apiBaseUrl}/servicedesk/tickets?id=${ticket.id}&tenant_id=${tenantId}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(res => {
        if (res.success) { toast.showSuccess('Ticket deleted.'); fetchTickets(); }
        else toast.showError(res.error || 'Failed to delete.');
      });
  };

  // Quick status change
  const handleQuickStatus = async (ticket, newStatus) => {
    const ok = await confirm(`Mark ticket ${ticket.ticket_number} as "${newStatus}"?`, 'Update Status');
    if (!ok) return;
    fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ticket.id, status: newStatus, actor_name: user ? `${user.first_name} ${user.last_name}` : 'System', tenant_id: tenantId })
    }).then(r => r.json()).then(res => {
      if (res.success) { toast.showSuccess(`Ticket status updated to "${newStatus}".`); fetchTickets(); }
      else toast.showError(res.error || 'Failed to update status.');
    });
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selected.length === 0) { toast.showError('Select at least one ticket.'); return; }
    if (action === 'assign') { setShowBulkAssign(true); return; }

    const labels = { close: 'close', resolve: 'resolve', delete: 'delete' };
    const ok = await confirm(`Are you sure you want to ${labels[action]} ${selected.length} selected ticket(s)?`, `Bulk ${action}`);
    if (!ok) return;

    fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk_action: action, ids: selected,
        actor_name: user ? `${user.first_name} ${user.last_name}` : 'System',
        tenant_id: tenantId
      })
    }).then(r => r.json()).then(res => {
      if (res.success) { toast.showSuccess(res.message); setSelected([]); fetchTickets(); }
      else toast.showError(res.error || 'Bulk action failed.');
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignTarget) { toast.showError('Select an agent.'); return; }
    const agent = agents.find(a => a.id === parseInt(bulkAssignTarget));
    const agentName = agent ? `${agent.first_name} ${agent.last_name}` : '';
    fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulk_action: 'assign', ids: selected, assign_to: parseInt(bulkAssignTarget),
        agent_name: agentName, actor_name: user ? `${user.first_name} ${user.last_name}` : 'System',
        tenant_id: tenantId
      })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        toast.showSuccess(res.message);
        setShowBulkAssign(false); setBulkAssignTarget(''); setSelected([]);
        fetchTickets();
      } else toast.showError(res.error || 'Bulk assign failed.');
    });
  };

  const isAdmin = ['Admin', 'Manager'].includes(user?.role);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          {myTicketsOnly ? 'Tickets you have raised.' : `All support tickets across your organization.`}
          {totalRecords > 0 && <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}> ({totalRecords} total)</span>}
        </p>
        <button className="add-lead-btn" onClick={() => setShowAddModal(true)} style={{ gap: '8px' }}>
          <Plus size={16} /> Raise New Ticket
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
          <input type="text" className="form-control" placeholder="Search tickets, subject, requester..." value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); } }}
            style={{ fontSize: '13px', height: '36px' }}
          />
          <button className="modal-btn primary" onClick={() => { setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); }}
            style={{ height: '36px', padding: '0 14px', minHeight: 0 }}>
            <Search size={14} />
          </button>
        </div>

        <select className="form-control" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchTickets(1, search, e.target.value, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '120px' }}>
          <option value="">All Status</option>
          {['Open','In Progress','On Hold','Resolved','Closed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className="form-control" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, e.target.value, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '120px' }}>
          <option value="">All Priority</option>
          {['Critical','High','Medium','Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select className="form-control" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, e.target.value, dateFrom, dateTo, assignedFilter, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '130px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <select className="form-control" value={assignedFilter} onChange={e => { setAssignedFilter(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, e.target.value, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '130px' }}>
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
        </select>

        <select className="form-control" value={slaFilter} onChange={e => { setSlaFilter(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, e.target.value, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '120px' }}>
          <option value="">SLA Status</option>
          <option value="breached">Breached</option>
          <option value="met">Met / Normal</option>
        </select>

        <input type="date" className="form-control" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, e.target.value, dateTo, assignedFilter, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '130px' }} title="From date" />

        <input type="date" className="form-control" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, e.target.value, assignedFilter, slaFilter, limit); }}
          style={{ fontSize: '13px', height: '36px', width: '130px' }} title="To date" />

        <select className="form-control" value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); fetchTickets(1, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, parseInt(e.target.value)); }}
          style={{ fontSize: '13px', height: '36px', width: '95px' }}>
          <option value="10">10 / pg</option>
          <option value="25">25 / pg</option>
          <option value="50">50 / pg</option>
        </select>

        {(search || statusFilter || priorityFilter || categoryFilter || dateFrom || dateTo || assignedFilter || slaFilter) && (
          <button className="modal-btn secondary" onClick={() => {
            setSearch(''); setStatusFilter(''); setPriorityFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); setAssignedFilter(''); setSlaFilter('');
            setPage(1); fetchTickets(1, '', '', '', '', '', '', '', '', limit);
          }} style={{ height: '36px', padding: '0 12px', minHeight: 0 }}>
            Reset
          </button>
        )}

        <button className="modal-btn secondary" onClick={() => fetchTickets(page, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit)} style={{ height: '36px', padding: '0 10px', minHeight: 0 }} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && isAdmin && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.3)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#60a5fa' }}>{selected.length} ticket(s) selected</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button className="modal-btn secondary" onClick={() => handleBulkAction('resolve')} style={{ height: '32px', padding: '0 12px', minHeight: 0, fontSize: '12px' }}>✔ Resolve</button>
            <button className="modal-btn secondary" onClick={() => handleBulkAction('close')} style={{ height: '32px', padding: '0 12px', minHeight: 0, fontSize: '12px' }}>✕ Close</button>
            <button className="modal-btn secondary" onClick={() => handleBulkAction('assign')} style={{ height: '32px', padding: '0 12px', minHeight: 0, fontSize: '12px' }}>👤 Assign</button>
            <button onClick={() => handleBulkAction('delete')} style={{ height: '32px', padding: '0 12px', minHeight: 0, fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>🗑 Delete</button>
            <button className="modal-btn secondary" onClick={() => setSelected([])} style={{ height: '32px', padding: '0 10px', minHeight: 0, fontSize: '12px' }}>Clear</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table className="leads-table">
          <thead>
            <tr>
              {isAdmin && <th style={{ width: '40px' }}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} /></th>}
              <th>Ticket ID</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Requester</th>
              <th>Assigned To</th>
              <th>SLA Due</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading tickets...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Ticket size={40} style={{ opacity: 0.3 }} />
                  <span>No tickets found. {myTicketsOnly ? 'Raise your first ticket!' : 'All quiet!'}</span>
                </div>
              </td></tr>
            ) : tickets.map(t => {
              const sc = STATUS_COLORS[t.status] || {};
              const pc = PRIORITY_COLORS[t.priority] || {};
              const now = new Date();
              const slaDate = t.sla_due_at ? new Date(t.sla_due_at) : null;
              const slaDiff = slaDate ? Math.round((slaDate - now) / (1000 * 60 * 60)) : null;
              const slaBreach = t.is_sla_breached || (slaDate && slaDate < now && !['Resolved','Closed'].includes(t.status));
              return (
                <tr key={t.id} style={{ background: selected.includes(t.id) ? 'rgba(96,165,250,0.05)' : 'transparent' }}>
                  {isAdmin && (
                    <td><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleOne(t.id)} style={{ cursor: 'pointer' }} /></td>
                  )}
                  <td style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--accent-cyan)', cursor: 'pointer' }} onClick={() => navigate(`/feature/servicedesk/tickets/${t.id}`)}>
                    {t.ticket_number}
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                      onClick={() => navigate(`/feature/servicedesk/tickets/${t.id}`)}>
                      {t.subject}
                    </div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{t.category}</td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: pc.bg, color: pc.color, border: `1px solid ${pc.color}33` }}>{t.priority}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.color}33` }}>{t.status}</span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>{t.requester_name}</td>
                  <td style={{ fontSize: '12.5px', color: t.agent_name ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.agent_name || '—'}</td>
                  <td>
                    {slaDate ? (
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: slaBreach ? '#ef4444' : slaDiff < 4 ? '#f59e0b' : 'var(--text-muted)' }}>
                        {slaBreach ? '🔴 Breached' : slaDiff < 0 ? '⚠ Overdue' : `${slaDiff}h left`}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button onClick={() => navigate(`/feature/servicedesk/tickets/${t.id}`)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        title="View Ticket"><Eye size={14} /></button>
                      {isAdmin && !['Resolved','Closed'].includes(t.status) && (
                        <button onClick={() => handleQuickStatus(t, 'Resolved')}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          title="Mark Resolved"><CheckCircle2 size={14} /></button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDelete(t)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          title="Delete Ticket"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Page <strong style={{ color: 'var(--text-white)' }}>{page}</strong> of <strong style={{ color: 'var(--text-white)' }}>{totalPages}</strong> — {totalRecords} tickets
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="modal-btn secondary" onClick={() => { const p = page-1; setPage(p); fetchTickets(p, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); }} disabled={page <= 1}
              style={{ height: '32px', padding: '0 12px', minHeight: 0, opacity: page<=1?0.4:1 }}>← Previous</button>
            <button className="modal-btn secondary" onClick={() => { const p = page+1; setPage(p); fetchTickets(p, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo, assignedFilter, slaFilter, limit); }} disabled={page >= totalPages}
              style={{ height: '32px', padding: '0 12px', minHeight: 0, opacity: page>=totalPages?0.4:1 }}>Next →</button>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && createPortal(
        <div className="modal-overlay" onClick={() => setShowBulkAssign(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Assign {selected.length} Ticket(s)</h3>
              <button className="modal-close-btn" onClick={() => setShowBulkAssign(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Assign To Agent *</label>
                <select className="form-control" value={bulkAssignTarget} onChange={e => setBulkAssignTarget(e.target.value)}>
                  <option value="">-- Select Agent --</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.role})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" onClick={() => setShowBulkAssign(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleBulkAssign}>Assign</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* New Ticket Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1, paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
              <h3>Raise New Support Ticket</h3>
              <button className="modal-close-btn" onClick={() => { setShowAddModal(false); resetForm(); }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                
                {/* Subject */}
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input type="text" className="form-control" placeholder="Brief description of the issue" value={newSubject} onChange={e => setNewSubject(e.target.value)} required />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-control" rows={3} placeholder="Describe the issue in detail — steps to reproduce, impact, urgency..." value={newDesc} onChange={e => setNewDesc(e.target.value)} required style={{ resize: 'vertical' }} />
                </div>

                {/* Category & Priority */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-control" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                      {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                        : ['General','IT Support','HR Query','Finance','Operations'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-control" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                      <option value="Low">Low — 5 day SLA</option>
                      <option value="Medium">Medium — 2 day SLA</option>
                      <option value="High">High — 8 hour SLA</option>
                      <option value="Critical">Critical — 2 hour SLA</option>
                    </select>
                  </div>
                </div>

                {/* Assign Agent & Scheduling */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  {isAdmin && (
                    <div className="form-group">
                      <label className="form-label">Assign To (Optional)</label>
                      <select className="form-control" value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)}>
                        <option value="">— Leave Unassigned —</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name} ({a.role})</option>)}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} /> Preferred Visit Schedule (Optional)</label>
                    <input type="datetime-local" className="form-control" value={newSchedule} onChange={e => setNewSchedule(e.target.value)} style={{ fontSize: '13px' }} />
                  </div>
                </div>

                {/* Material Requests section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⚙ Required Materials (Optional)
                    </span>
                    <button type="button" className="modal-btn secondary" onClick={() => setNewMaterials([...newMaterials, { material_name: '', quantity: 1, unit: 'pcs' }])}
                      style={{ height: '28px', padding: '0 8px', fontSize: '12px', minHeight: 0, gap: '4px' }}>
                      <PlusCircle size={12} /> Add Item
                    </button>
                  </div>
                  {newMaterials.map((m, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 40px', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                      <input type="text" className="form-control" placeholder="Item name (e.g. Compressor, CAT6 Cable)" value={m.material_name}
                        onChange={e => setNewMaterials(newMaterials.map((val, i) => i === idx ? { ...val, material_name: e.target.value } : val))} style={{ fontSize: '12.5px', height: '32px' }} />
                      <input type="number" className="form-control" placeholder="Qty" value={m.quantity} min="1" step="any"
                        onChange={e => setNewMaterials(newMaterials.map((val, i) => i === idx ? { ...val, quantity: parseFloat(e.target.value) || 1 } : val))} style={{ fontSize: '12.5px', height: '32px' }} />
                      <select className="form-control" value={m.unit}
                        onChange={e => setNewMaterials(newMaterials.map((val, i) => i === idx ? { ...val, unit: e.target.value } : val))} style={{ fontSize: '12.5px', height: '32px', padding: '0 4px' }}>
                        <option value="pcs">pcs</option>
                        <option value="meters">meters</option>
                        <option value="kg">kg</option>
                        <option value="box">box</option>
                        <option value="liter">liter</option>
                      </select>
                      <button type="button" onClick={() => setNewMaterials(newMaterials.filter((_, i) => i !== idx))}
                        style={{ height: '32px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Fund Request Section */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <DollarSign size={13} /> Request Funds / Petty Cash (Optional)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Amount</label>
                      <input type="number" className="form-control" placeholder="0.00" value={newFunds.amount} min="0" step="any"
                        onChange={e => setNewFunds({ ...newFunds, amount: e.target.value })} style={{ fontSize: '12.5px', height: '32px' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Payment Method</label>
                      <select className="form-control" value={newFunds.payment_method}
                        onChange={e => setNewFunds({ ...newFunds, payment_method: e.target.value })} style={{ fontSize: '12.5px', height: '32px' }}>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>UPI ID / Bank details / Remarks</label>
                      <input type="text" className="form-control" placeholder="e.g. UPI details or expense purpose" value={newFunds.payment_details}
                        onChange={e => setNewFunds({ ...newFunds, payment_details: e.target.value })} style={{ fontSize: '12.5px', height: '32px' }} />
                    </div>
                  </div>
                </div>

                {/* Attachments Queue Upload */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <Paperclip size={13} /> Attach Photos, Videos, or Documents
                  </label>
                  <input type="file" className="form-control" multiple onChange={e => {
                    const files = e.target.files;
                    if (!files) return;
                    setAttachmentsQueue([
                      ...attachmentsQueue,
                      ...Array.from(files).map(file => ({
                        file,
                        type: file.type.startsWith('video/') ? 'Video' : 'Before Photo',
                        description: ''
                      }))
                    ]);
                    e.target.value = '';
                  }} accept="image/*,video/*,application/pdf,.txt" style={{ fontSize: '13px', paddingTop: '6px', height: 'auto', marginBottom: '10px' }} />
                  
                  {/* Queue Display */}
                  {attachmentsQueue.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Upload Queue ({attachmentsQueue.length} files):</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {attachmentsQueue.map((item, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 40px', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.file.name}</span>
                            <select className="form-control" value={item.type}
                              onChange={e => setAttachmentsQueue(attachmentsQueue.map((val, i) => i === idx ? { ...val, type: e.target.value } : val))}
                              style={{ fontSize: '11.5px', height: '28px', padding: '0 4px' }}>
                              <option value="Before Photo">Before Photo</option>
                              <option value="Video">Video</option>
                              <option value="General">General Doc</option>
                            </select>
                            <input type="text" className="form-control" placeholder="Caption/Description" value={item.description}
                              onChange={e => setAttachmentsQueue(attachmentsQueue.map((val, i) => i === idx ? { ...val, description: e.target.value } : val))}
                              style={{ fontSize: '11.5px', height: '28px' }} />
                            <button type="button" onClick={() => setAttachmentsQueue(attachmentsQueue.filter((_, i) => i !== idx))}
                              style={{ height: '28px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Supported: Images (PNG, JPG), Videos (MP4, WEBM), PDF. Max 20MB per file.</span>
                </div>

              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '12px', position: 'sticky', bottom: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                <button type="button" className="modal-btn secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="modal-btn primary"><Ticket size={14} style={{ marginRight: '6px' }} />Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
