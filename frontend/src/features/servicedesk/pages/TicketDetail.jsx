import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useServiceDesk } from '../context/ServiceDeskContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { ArrowLeft, MessageSquare, Lock, CheckCircle2, Clock, UserCheck, AlertTriangle, Paperclip, Send, X, RefreshCw } from 'lucide-react';

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

const ACT_LABELS = {
  ticket_created:       '🎫 Ticket created',
  status_changed:       '🔄 Status changed to',
  assigned:             '👤 Assigned to',
  comment_added:        '💬 Comment added',
  internal_note_added:  '🔒 Internal note added',
  priority_changed:     '⚡ Priority changed to',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId, user, toast, confirm, categories, agents } = useServiceDesk();

  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('details');

  // Comment form
  const [commentBody, setCommentBody]     = useState('');
  const [isInternal, setIsInternal]       = useState(false);
  const [submittingComment, setSubmitting] = useState(false);

  // Sidebar edit state
  const [editStatus,   setEditStatus]   = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editAssigned, setEditAssigned] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Material requests form state
  const [materialName, setMaterialName]   = useState('');
  const [materialQty, setMaterialQty]     = useState(1);
  const [materialUnit, setMaterialUnit]   = useState('pcs');
  const [materialRemarks, setMaterialRemarks] = useState('');
  const [submittingMaterial, setSubmittingMaterial] = useState(false);

  // Fund requests form state
  const [fundAmount, setFundAmount]       = useState('');
  const [fundMethod, setFundMethod]       = useState('UPI');
  const [fundDetails, setFundDetails]     = useState('');
  const [fundRemarks, setFundRemarks]     = useState('');
  const [submittingFund, setSubmittingFund] = useState(false);

  // Visit Schedule form state
  const [scheduledVisitAt, setScheduledVisitAt] = useState('');
  const [scheduledStatus, setScheduledStatus]   = useState('None');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // After Photo form state
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [afterPhotoDesc, setAfterPhotoDesc] = useState('');
  const [uploadingAfterPhoto, setUploadingAfterPhoto] = useState(false);

  const isAdmin = ['Admin', 'Manager'].includes(user?.role);
  const actorName = user ? `${user.first_name} ${user.last_name}` : 'User';

  const fetchTicket = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/servicedesk/tickets?id=${id}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setTicket(res.data);
          setEditStatus(res.data.status);
          setEditPriority(res.data.priority);
          setEditAssigned(res.data.assigned_to || '');
          setEditCategory(res.data.category);
          setScheduledVisitAt(res.data.scheduled_visit_at ? res.data.scheduled_visit_at.slice(0, 16) : '');
          setScheduledStatus(res.data.scheduled_status || 'None');
        } else toast.showError('Ticket not found.');
      })
      .catch(() => toast.showError('Connection error.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTicket(); }, [id]);

  const handleSaveChanges = async () => {
    if (!isAdmin) return;
    const agent = agents.find(a => a.id === parseInt(editAssigned));
    const agentName = agent ? `${agent.first_name} ${agent.last_name}` : '';
    setSaving(true);
    fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: parseInt(id), status: editStatus, priority: editPriority,
        assigned_to: editAssigned ? parseInt(editAssigned) : null,
        agent_name: agentName, category: editCategory, actor_name: actorName, tenant_id: tenantId
      })
    }).then(r => r.json()).then(res => {
      if (res.success) { toast.showSuccess('Ticket updated.'); fetchTicket(); }
      else toast.showError(res.error || 'Update failed.');
    }).finally(() => setSaving(false));
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmitting(true);
    fetch(`${apiBaseUrl}/servicedesk/comments?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket_id: parseInt(id), author_id: user?.id || 1,
        author_name: actorName, author_role: user?.role || 'User',
        body: commentBody.trim(), is_internal: isInternal ? 1 : 0, tenant_id: tenantId
      })
    }).then(r => r.json()).then(res => {
      if (res.success) { toast.showSuccess('Comment added.'); setCommentBody(''); fetchTicket(); }
      else toast.showError(res.error || 'Failed to add comment.');
    }).finally(() => setSubmitting(false));
  };

  const handleQuickResolve = async () => {
    const ok = await confirm(`Mark ticket ${ticket.ticket_number} as Resolved?`, 'Resolve Ticket');
    if (!ok) return;
    fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(id), status: 'Resolved', actor_name: actorName, tenant_id: tenantId })
    }).then(r => r.json()).then(res => {
      if (res.success) { toast.showSuccess('Ticket marked as Resolved.'); fetchTicket(); }
      else toast.showError(res.error || 'Failed to resolve.');
    });
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialName.trim()) return;
    setSubmittingMaterial(true);
    try {
      const res = await fetch(`${apiBaseUrl}/servicedesk/materials?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: parseInt(id),
          material_name: materialName.trim(),
          quantity: parseFloat(materialQty) || 1,
          unit: materialUnit,
          remarks: materialRemarks,
          requested_by: user?.id || 1,
          requested_by_name: actorName
        })
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess('Material request added.');
        setMaterialName('');
        setMaterialQty(1);
        setMaterialUnit('pcs');
        setMaterialRemarks('');
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to request material.');
      }
    } catch (err) {
      toast.showError('Network error.');
    } finally {
      setSubmittingMaterial(false);
    }
  };

  const handleUpdateMaterialStatus = async (matId, newStatus) => {
    try {
      const res = await fetch(`${apiBaseUrl}/servicedesk/materials?tenant_id=${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: matId,
          status: newStatus,
          actor_name: actorName
        })
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess(`Material request status updated to ${newStatus}.`);
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to update material request.');
      }
    } catch (err) {
      toast.showError('Network error.');
    }
  };

  const handleAddFund = async (e) => {
    e.preventDefault();
    if (parseFloat(fundAmount) <= 0) return;
    setSubmittingFund(true);
    try {
      const res = await fetch(`${apiBaseUrl}/servicedesk/funds?tenant_id=${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: parseInt(id),
          amount: parseFloat(fundAmount),
          payment_method: fundMethod,
          payment_details: fundDetails,
          remarks: fundRemarks,
          requested_by: user?.id || 1,
          requested_by_name: actorName
        })
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess('Fund request added.');
        setFundAmount('');
        setFundMethod('UPI');
        setFundDetails('');
        setFundRemarks('');
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to request funds.');
      }
    } catch (err) {
      toast.showError('Network error.');
    } finally {
      setSubmittingFund(false);
    }
  };

  const handleUpdateFundStatus = async (fundId, newStatus) => {
    try {
      const res = await fetch(`${apiBaseUrl}/servicedesk/funds?tenant_id=${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fundId,
          status: newStatus,
          actor_name: actorName
        })
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess(`Fund request status updated to ${newStatus}.`);
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to update fund request.');
      }
    } catch (err) {
      toast.showError('Network error.');
    }
  };

  const handleUpdateSchedule = async (newStatus = null) => {
    setSubmittingSchedule(true);
    try {
      const payload = {
        id: parseInt(id),
        scheduled_visit_at: scheduledVisitAt || null,
        scheduled_status: newStatus || (scheduledVisitAt ? 'Tentative' : 'None'),
        scheduled_confirmed_by: newStatus === 'Confirmed' ? actorName : null,
        actor_name: actorName
      };

      const res = await fetch(`${apiBaseUrl}/servicedesk/tickets?tenant_id=${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess('Visit schedule updated.');
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to update schedule.');
      }
    } catch (err) {
      toast.showError('Network error.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleUploadAfterPhoto = async (e) => {
    e.preventDefault();
    if (!afterPhotoFile) return;
    setUploadingAfterPhoto(true);
    try {
      const formData = new FormData();
      formData.append('ticket_id', id);
      formData.append('uploaded_by', user?.id || 1);
      formData.append('file', afterPhotoFile);
      formData.append('attachment_type', 'After Photo');
      formData.append('description', afterPhotoDesc);

      const res = await fetch(`${apiBaseUrl}/servicedesk/attachments?tenant_id=${tenantId}`, {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (res.success) {
        toast.showSuccess('Proof of resolution photo uploaded successfully!');
        setAfterPhotoFile(null);
        setAfterPhotoDesc('');
        fetchTicket();
      } else {
        toast.showError(res.error || 'Failed to upload photo.');
      }
    } catch (err) {
      toast.showError('Network error.');
    } finally {
      setUploadingAfterPhoto(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
      Loading ticket...
    </div>
  );
  if (!ticket) return <div style={{ color: 'var(--accent-red)', padding: '40px', textAlign: 'center' }}>Ticket not found.</div>;

  const sc = STATUS_COLORS[ticket.status] || {};
  const pc = PRIORITY_COLORS[ticket.priority] || {};
  const now = new Date();
  const slaDate = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null;
  const slaDiff = slaDate ? Math.round((slaDate - now) / (1000 * 60 * 60)) : null;
  const slaBreach = ticket.is_sla_breached || (slaDate && slaDate < now && !['Resolved','Closed'].includes(ticket.status));

  // Categorize attachments
  const attachments = ticket.attachments || [];
  const beforePhotos = attachments.filter(a => a.attachment_type === 'Before Photo');
  const afterPhotos = attachments.filter(a => a.attachment_type === 'After Photo');
  const videos = attachments.filter(a => a.attachment_type === 'Video' || a.file_type.startsWith('video/'));
  const otherDocs = attachments.filter(a => !['Before Photo', 'After Photo'].includes(a.attachment_type) && !a.file_type.startsWith('video/'));

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button className="modal-btn secondary" onClick={() => navigate(-1)} style={{ height: '34px', padding: '0 12px', minHeight: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-cyan)' }}>{ticket.ticket_number}</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-white)' }}>{ticket.subject}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.color}33` }}>{ticket.status}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: pc.bg, color: pc.color, border: `1px solid ${pc.color}33` }}>{ticket.priority}</span>
            {slaBreach && <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>🔴 SLA Breached</span>}
          </div>
        </div>
        <button className="modal-btn secondary" onClick={fetchTicket} style={{ height: '34px', padding: '0 10px', minHeight: 0 }} title="Refresh"><RefreshCw size={14} /></button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
        {[
          { id: 'details', label: 'Ticket Details & Discussion' },
          { id: 'materials', label: `Materials (${ticket.material_requests?.length || 0})` },
          { id: 'funds', label: `Funds (${ticket.fund_requests?.length || 0})` },
          { id: 'schedule', label: ticket.scheduled_visit_at ? `Visit Schedule (${ticket.scheduled_status})` : 'Visit Schedule' }
        ].map(t => (
          <button key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 16px',
              background: activeTab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--text-white)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>
        
        {/* Main Content Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 1: DETAILS & DISCUSSION */}
          {activeTab === 'details' && (
            <>
              {/* Ticket description */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Description</div>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
                
                {otherDocs.length > 0 && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Paperclip size={13} /> General Documents
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {otherDocs.map(att => (
                        <a key={att.id} href={`${apiBaseUrl.replace('/api', '')}/${att.file_path}`} target="_blank" rel="noreferrer"
                          style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Paperclip size={12} /> {att.file_name} {att.description && <span style={{ color: 'var(--text-muted)' }}>({att.description})</span>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Before and After Photos Section */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🖼 Visual Proof & Media
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* Before Photos */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#ff8a65' }}>⚠️ Before Photos / Videos</h4>
                    {beforePhotos.length === 0 && videos.length === 0 ? (
                      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>No media attached at creation.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {beforePhotos.map(p => (
                          <div key={p.id}>
                            <img src={`${apiBaseUrl.replace('/api', '')}/${p.file_path}`} alt="Before" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '200px', objectFit: 'cover' }} />
                            {p.description && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.description}</div>}
                          </div>
                        ))}
                        {videos.map(v => (
                          <div key={v.id}>
                            <video src={`${apiBaseUrl.replace('/api', '')}/${v.file_path}`} controls style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '200px', background: '#000' }} />
                            {v.description && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{v.description}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* After Photos */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#4db6ac' }}>✅ After Photos (Proof of Resolution)</h4>
                    {afterPhotos.length === 0 ? (
                      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>No resolution proof uploaded yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {afterPhotos.map(p => (
                          <div key={p.id}>
                            <img src={`${apiBaseUrl.replace('/api', '')}/${p.file_path}`} alt="After" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: '200px', objectFit: 'cover' }} />
                            {p.description && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{p.description}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload After Photo form */}
                {!['Closed'].includes(ticket.status) && (
                  <form onSubmit={handleUploadAfterPhoto} style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--text-white)' }}>Upload Proof of Work (After Photo)</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '8px', alignItems: 'center' }}>
                      <input type="file" className="form-control" onChange={e => setAfterPhotoFile(e.target.files?.[0] || null)} accept="image/*" required style={{ fontSize: '12px', height: 'auto', paddingTop: '5px' }} />
                      <input type="text" className="form-control" placeholder="Describe photo (e.g. Fixed compressor wiring)" value={afterPhotoDesc} onChange={e => setAfterPhotoDesc(e.target.value)} style={{ fontSize: '12.5px', height: '32px' }} />
                      <button type="submit" className="modal-btn primary" disabled={uploadingAfterPhoto || !afterPhotoFile} style={{ height: '32px', minHeight: 0, fontSize: '12px', opacity: uploadingAfterPhoto ? 0.6 : 1 }}>
                        {uploadingAfterPhoto ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Discussion Timeline */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> Activity & Comments Thread
                </div>

                {/* Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                  {(ticket.activity || []).length === 0 && (ticket.comments || []).length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No activity logs.</div>
                  )}
                  {[
                    ...(ticket.activity || []).map(a => ({ ...a, _type: 'activity' })),
                    ...(ticket.comments || []).map(c => ({ ...c, _type: 'comment' }))
                  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((item, idx) => (
                    <div key={`${item._type}-${item.id}`} style={{
                      display: 'flex', gap: '12px', alignItems: 'flex-start',
                      padding: item._type === 'comment' ? '12px' : '6px 4px',
                      background: item._type === 'comment' ? (item.is_internal ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)') : 'transparent',
                      border: item._type === 'comment' ? `1px solid ${item.is_internal ? 'rgba(245,158,11,0.2)' : 'var(--border)'}` : 'none',
                      borderRadius: item._type === 'comment' ? 'var(--radius-md)' : '0',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700,
                        background: item._type === 'comment' ? (item.is_internal ? 'rgba(245,158,11,0.2)' : 'rgba(96,165,250,0.2)') : 'rgba(255,255,255,0.06)',
                        color: item._type === 'comment' ? (item.is_internal ? '#f59e0b' : '#60a5fa') : 'var(--text-muted)',
                      }}>
                        {item._type === 'comment' ? item.author_name?.[0]?.toUpperCase() || '?' : '⚡'}
                      </div>
                      <div style={{ flex: 1 }}>
                        {item._type === 'comment' ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>{item.author_name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.author_role}</span>
                              {item.is_internal === 1 && <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Internal Note</span>}
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(item.created_at).toLocaleString()}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</p>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                              {ACT_LABELS[item.action] || item.action}
                              {item.new_value && <strong style={{ color: 'var(--text-primary)' }}> {item.new_value}</strong>}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>by {item.actor_name} · {new Date(item.created_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                {!['Closed'].includes(ticket.status) && (
                  <form onSubmit={handleAddComment} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <textarea className="form-control" rows={3} placeholder={isInternal ? 'Write an internal note (only visible to agents)...' : 'Write a public comment...'}
                      value={commentBody} onChange={e => setCommentBody(e.target.value)}
                      style={{ resize: 'vertical', marginBottom: '10px', background: isInternal ? 'rgba(245,158,11,0.04)' : undefined, borderColor: isInternal ? 'rgba(245,158,11,0.3)' : undefined }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      {isAdmin && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                          <Lock size={12} /> Internal note (hidden from requester)
                        </label>
                      )}
                      <button type="submit" className="modal-btn primary" disabled={submittingComment || !commentBody.trim()}
                        style={{ height: '36px', padding: '0 16px', minHeight: 0, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!commentBody.trim() || submittingComment) ? 0.5 : 1 }}>
                        <Send size={14} /> {submittingComment ? 'Sending...' : (isInternal ? 'Add Note' : 'Add Comment')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          {/* TAB 2: MATERIAL REQUESTS */}
          {activeTab === 'materials' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>Material Requirements & Orders</span>
              </div>

              {/* Material Requests Table */}
              <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '24px', overflowX: 'auto' }}>
                <table className="leads-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Quantity</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      <th>Date</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(ticket.material_requests || []).length === 0 ? (
                      <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No material requests raised for this ticket.</td></tr>
                    ) : (
                      ticket.material_requests.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{m.material_name}</td>
                          <td>{parseFloat(m.quantity)} {m.unit}</td>
                          <td>{m.requested_by_name}</td>
                          <td>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                              background: m.status === 'Delivered' ? 'rgba(16,185,129,0.1)' : m.status === 'Cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              color: m.status === 'Delivered' ? '#10b981' : m.status === 'Cancelled' ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${m.status === 'Delivered' ? '#10b98133' : m.status === 'Cancelled' ? '#ef444433' : '#f59e0b33'}`
                            }}>{m.status}</span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                {m.status === 'Pending' && (
                                  <button onClick={() => handleUpdateMaterialStatus(m.id, 'Approved')} className="modal-btn primary" style={{ height: '24px', padding: '0 8px', minHeight: 0, fontSize: '11px' }}>Approve</button>
                                )}
                                {m.status === 'Approved' && (
                                  <button onClick={() => handleUpdateMaterialStatus(m.id, 'Dispatched')} className="modal-btn primary" style={{ height: '24px', padding: '0 8px', minHeight: 0, fontSize: '11px', background: 'var(--accent-orange)' }}>Dispatch</button>
                                )}
                                {m.status === 'Dispatched' && (
                                  <button onClick={() => handleUpdateMaterialStatus(m.id, 'Delivered')} className="modal-btn primary" style={{ height: '24px', padding: '0 8px', minHeight: 0, fontSize: '11px', background: 'var(--accent-green)' }}>Deliver</button>
                                )}
                                {!['Delivered', 'Cancelled'].includes(m.status) && (
                                  <button onClick={() => handleUpdateMaterialStatus(m.id, 'Cancelled')}
                                    style={{ height: '24px', padding: '0 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Material Request Form */}
              {!['Closed'].includes(ticket.status) && (
                <form onSubmit={handleAddMaterial} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-white)' }}>Request Additional Materials</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px', gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Item Name *</label>
                      <input type="text" className="form-control" placeholder=" Compressor model, RJ45 patch..." value={materialName} onChange={e => setMaterialName(e.target.value)} required style={{ fontSize: '13px', height: '32px' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Qty *</label>
                      <input type="number" className="form-control" value={materialQty} min="1" step="any" onChange={e => setMaterialQty(parseFloat(e.target.value) || 1)} required style={{ fontSize: '13px', height: '32px' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Unit</label>
                      <select className="form-control" value={materialUnit} onChange={e => setMaterialUnit(e.target.value)} style={{ fontSize: '13px', height: '32px', padding: '0 4px' }}>
                        <option value="pcs">pcs</option>
                        <option value="meters">meters</option>
                        <option value="kg">kg</option>
                        <option value="box">box</option>
                        <option value="liter">liter</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Remarks / Purpose</label>
                    <input type="text" className="form-control" placeholder="Specify why materials are needed on site..." value={materialRemarks} onChange={e => setMaterialRemarks(e.target.value)} style={{ fontSize: '13px', height: '32px' }} />
                  </div>
                  <button type="submit" className="modal-btn primary" disabled={submittingMaterial || !materialName.trim()} style={{ height: '34px', minHeight: 0, fontSize: '13px', opacity: submittingMaterial ? 0.6 : 1 }}>
                    {submittingMaterial ? 'Submitting...' : 'Request Materials'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FUND REQUESTS */}
          {activeTab === 'funds' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)' }}>Petty Cash & Expense Fund Requests</span>
              </div>

              {/* Fund Requests Table */}
              <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '24px', overflowX: 'auto' }}>
                <table className="leads-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Details / Purpose</th>
                      <th>Requested By</th>
                      <th>Status</th>
                      <th>Date</th>
                      {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(ticket.fund_requests || []).length === 0 ? (
                      <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No fund requests raised for this ticket.</td></tr>
                    ) : (
                      ticket.fund_requests.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>₹{parseFloat(f.amount).toFixed(2)}</td>
                          <td>{f.payment_method}</td>
                          <td style={{ maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={f.remarks || f.payment_details}>{f.remarks || f.payment_details || '—'}</td>
                          <td>{f.requested_by_name}</td>
                          <td>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                              background: f.status === 'Paid' ? 'rgba(16,185,129,0.1)' : f.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                              color: f.status === 'Paid' ? '#10b981' : f.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${f.status === 'Paid' ? '#10b98133' : f.status === 'Rejected' ? '#ef444433' : '#f59e0b33'}`
                            }}>{f.status}</span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{new Date(f.created_at).toLocaleDateString()}</td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                {f.status === 'Pending' && (
                                  <button onClick={() => handleUpdateFundStatus(f.id, 'Approved')} className="modal-btn primary" style={{ height: '24px', padding: '0 8px', minHeight: 0, fontSize: '11px' }}>Approve</button>
                                )}
                                {f.status === 'Approved' && (
                                  <button onClick={() => handleUpdateFundStatus(f.id, 'Paid')} className="modal-btn primary" style={{ height: '24px', padding: '0 8px', minHeight: 0, fontSize: '11px', background: 'var(--accent-green)' }}>Mark Paid</button>
                                )}
                                {!['Paid', 'Rejected'].includes(f.status) && (
                                  <button onClick={() => handleUpdateFundStatus(f.id, 'Rejected')}
                                    style={{ height: '24px', padding: '0 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px' }}>Reject</button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Fund Request Form */}
              {!['Closed'].includes(ticket.status) && (
                <form onSubmit={handleAddFund} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-white)' }}>Request Site Funds / Reimbursement</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Amount (INR) *</label>
                      <input type="number" className="form-control" placeholder="0.00" value={fundAmount} min="1" step="any" onChange={e => setFundAmount(e.target.value)} required style={{ fontSize: '13px', height: '32px' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>Payment Mode</label>
                      <select className="form-control" value={fundMethod} onChange={e => setFundMethod(e.target.value)} style={{ fontSize: '13px', height: '32px' }}>
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11px' }}>UPI ID / Bank details *</label>
                      <input type="text" className="form-control" placeholder="e.g. mobile@upi or account/IFSC details" value={fundDetails} onChange={e => setFundDetails(e.target.value)} required style={{ fontSize: '13px', height: '32px' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Purpose / Remarks</label>
                    <input type="text" className="form-control" placeholder="e.g. Purchase of CAT6 cable on site" value={fundRemarks} onChange={e => setFundRemarks(e.target.value)} style={{ fontSize: '13px', height: '32px' }} />
                  </div>
                  <button type="submit" className="modal-btn primary" disabled={submittingFund || parseFloat(fundAmount) <= 0} style={{ height: '34px', minHeight: 0, fontSize: '13px', opacity: (submittingFund || parseFloat(fundAmount) <= 0) ? 0.6 : 1 }}>
                    {submittingFund ? 'Submitting...' : 'Request Cash Funds'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: VISIT SCHEDULING */}
          {activeTab === 'schedule' && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', display: 'block', marginBottom: '14px' }}>Visit Schedule & Confirmation</span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* Visit info */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Current Schedule Status</h4>
                  {[
                    { label: 'Scheduled Date/Time', value: ticket.scheduled_visit_at ? new Date(ticket.scheduled_visit_at).toLocaleString() : 'Not scheduled yet' },
                    { label: 'Confirmation Status', value: (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '8px',
                        background: ticket.scheduled_status === 'Confirmed' ? 'rgba(16,185,129,0.1)' : ticket.scheduled_status === 'Completed' ? 'rgba(34,211,238,0.1)' : 'rgba(245,158,11,0.1)',
                        color: ticket.scheduled_status === 'Confirmed' ? '#10b981' : ticket.scheduled_status === 'Completed' ? 'var(--accent-cyan)' : '#f59e0b',
                        border: `1px solid ${ticket.scheduled_status === 'Confirmed' ? '#10b98133' : ticket.scheduled_status === 'Completed' ? 'var(--accent-cyan)33' : '#f59e0b33'}`
                      }}>{ticket.scheduled_status || 'None'}</span>
                    ) },
                    ticket.scheduled_confirmed_by && { label: 'Confirmed By', value: ticket.scheduled_confirmed_by }
                  ].filter(Boolean).map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                      <strong style={{ color: 'var(--text-white)' }}>{value}</strong>
                    </div>
                  ))}

                  {/* Confirm actions */}
                  {ticket.scheduled_visit_at && ticket.scheduled_status !== 'Completed' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      {ticket.scheduled_status !== 'Confirmed' && (
                        <button onClick={() => handleUpdateSchedule('Confirmed')} className="modal-btn primary" style={{ height: '32px', minHeight: 0, fontSize: '12px' }}>Confirm Schedule</button>
                      )}
                      <button onClick={() => handleUpdateSchedule('Completed')} className="modal-btn primary" style={{ height: '32px', minHeight: 0, fontSize: '12px', background: 'var(--accent-green)' }}>Mark Completed</button>
                    </div>
                  )}
                </div>

                {/* Edit Schedule */}
                {!['Closed'].includes(ticket.status) && (
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Suggest / Update Visit Date & Time</h4>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <input type="datetime-local" className="form-control" value={scheduledVisitAt} onChange={e => setScheduledVisitAt(e.target.value)} />
                    </div>
                    <button onClick={() => handleUpdateSchedule(null)} disabled={submittingSchedule} className="modal-btn secondary" style={{ height: '34px', minHeight: 0, fontSize: '12.5px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {submittingSchedule ? 'Updating...' : 'Save Visit Schedule'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Ticket Info */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Ticket Info</div>
            {[
              { label: 'Category', value: ticket.category },
              { label: 'Requester', value: ticket.requester_name },
              { label: 'Created', value: new Date(ticket.created_at).toLocaleString() },
              { label: 'Last Updated', value: new Date(ticket.updated_at).toLocaleString() },
              ticket.resolved_at && { label: 'Resolved', value: new Date(ticket.resolved_at).toLocaleString() },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            {slaDate && (
              <div style={{ marginTop: '10px', padding: '10px', borderRadius: 'var(--radius-md)', background: slaBreach ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${slaBreach ? 'rgba(239,68,68,0.3)' : 'var(--border)'}` }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={11} /> SLA Deadline
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: slaBreach ? '#ef4444' : slaDiff < 4 ? '#f59e0b' : 'var(--text-primary)' }}>
                  {slaDate.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: slaBreach ? '#ef4444' : 'var(--text-muted)', marginTop: '2px' }}>
                  {slaBreach ? '🔴 SLA has been breached' : `${slaDiff}h remaining`}
                </div>
              </div>
            )}
          </div>

          {/* Actions (Admin only) */}
          {isAdmin && !['Closed'].includes(ticket.status) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>Update Ticket</div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Status</label>
                <select className="form-control" value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ fontSize: '13px', height: '34px', padding: '0 10px' }}>
                  {['Open','In Progress','On Hold','Resolved','Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Priority</label>
                <select className="form-control" value={editPriority} onChange={e => setEditPriority(e.target.value)} style={{ fontSize: '13px', height: '34px', padding: '0 10px' }}>
                  {['Low','Medium','High','Critical'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Assign To</label>
                <select className="form-control" value={editAssigned} onChange={e => setEditAssigned(e.target.value)} style={{ fontSize: '13px', height: '34px', padding: '0 10px' }}>
                  <option value="">— Unassigned —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Category</label>
                <select className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ fontSize: '13px', height: '34px', padding: '0 10px' }}>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <button className="modal-btn primary" onClick={handleSaveChanges} disabled={saving}
                style={{ width: '100%', height: '36px', minHeight: 0, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Quick resolve button for agents */}
          {!isAdmin && !['Resolved','Closed'].includes(ticket.status) && ticket.assigned_to === user?.id && (
            <button className="modal-btn primary" onClick={handleQuickResolve}
              style={{ width: '100%', height: '38px', minHeight: 0, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--accent-green)' }}>
              <CheckCircle2 size={15} /> Mark as Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
