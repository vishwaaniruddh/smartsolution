import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, MessageSquare, Check, X, FileText, Phone, Mail, Clock, Plus } from 'lucide-react';
import { useToast } from '../../components/NotificationContext';


const getStatusClass = (status) => {
  switch (status) {
    case 'New': return 'status-new';
    case 'Contacted': return 'status-contacted';
    case 'Qualified': return 'status-qualified';
    case 'Closed': return 'status-closed';
    case 'Lost': return 'status-lost';
    default: return 'status-new';
  }
};

const getDelegationStatusClass = (status) => {
  switch (status) {
    case 'Accepted': return 'status-del-accepted';
    case 'Pending': return 'status-del-pending';
    case 'Rejected': return 'status-del-rejected';
    case 'None':
    default: return 'status-del-none';
  }
};

const SAMyLeads = () => {
  const toast = useToast();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';
  const { activeAgent } = useOutletContext();
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Create Lead modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    contact_number: '',
    source: 'Website',
    status: 'New',
    value: '',
    remarks: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Side Drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    type: 'Call',
    details: ''
  });
  const [loggingActivity, setLoggingActivity] = useState(false);

  const handleOpenCreateModal = () => {

    setLeadForm({
      name: '',
      email: '',
      contact_number: '',
      source: 'Website',
      status: 'New',
      value: '',
      remarks: ''
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleLeadSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!leadForm.name || !leadForm.name.trim()) {
      errors.name = 'Lead name is required.';
    }
    
    // Validate email if provided
    if (leadForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    
    // Validate phone if provided
    if (leadForm.contact_number) {
      const digitsOnly = leadForm.contact_number.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15 || !/^\+?[0-9\s\-()]+$/.test(leadForm.contact_number)) {
        errors.contact_number = 'Please enter a valid phone number (7-15 digits).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);

    const payload = {
      name: leadForm.name,
      email: leadForm.email || null,
      contact_number: leadForm.contact_number || null,
      source: leadForm.source,
      status: leadForm.status,
      value: leadForm.value ? parseFloat(leadForm.value) : 0.00,
      agent: activeAgent,
      delegation_status: 'Accepted',
      remarks: leadForm.remarks || null
    };

    fetch('http://localhost/lead/api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Lead created successfully.');
          fetchLeads();
          setIsCreateModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to create lead.');
        }
      })
      .catch(err => {
        console.warn('API error creating lead, using local fallback:', err);
        const localLead = {
          id: Date.now(),
          ...payload,
          value: payload.value.toString()
        };
        setLeads([localLead, ...leads]);
        setIsCreateModalOpen(false);
        toast.success('Lead created (local fallback).');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  // Fetch leads and filter by simulated agent

  const fetchLeads = () => {
    setLoading(true);
    fetch('http://localhost/lead/api/leads.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const agentLeads = data.data.filter(l => l.agent === activeAgent);
          setLeads(agentLeads);
        }
      })
      .catch((err) => {
        console.warn('API error, falling back to mock leads:', err);
        // Fallback mock leads specific to current agent
        const mockLeads = [
          { id: 1, name: 'Acme Corp', email: 'alice@acme.com', contact_number: '+1 (555) 019-2834', status: 'New', source: 'Website', value: 5000, agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 2, name: 'TechFlow', email: 'bob@techflow.io', contact_number: '+1 (555) 019-5847', status: 'Contacted', source: 'Referral', value: 12500, agent: 'Emily Davis', delegation_status: 'Pending' },
          { id: 3, name: 'Apex Org', email: 'mbrown@apex.org', contact_number: '+1 (555) 019-0000', status: 'Qualified', source: 'LinkedIn', value: 8200, agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 5, name: 'Jessica Taylor', email: 'jtaylor@ventures.net', contact_number: '+1 (555) 019-1111', status: 'Qualified', source: 'LinkedIn', value: 9500, agent: 'Alex Lee', delegation_status: 'Pending' },
          { id: 7, name: 'James Wilson', email: 'jwilson@cloudops.com', contact_number: '+1 (555) 019-2222', status: 'Lost', source: 'Referral', value: 3200, agent: 'Alex Lee', delegation_status: 'Rejected' },
          { id: 8, name: 'Sophia Garcia', email: 'sgarcia@innovate.co', contact_number: '+1 (555) 019-3333', status: 'Contacted', source: 'LinkedIn', value: 6400, agent: 'Emily Davis', delegation_status: 'Pending' },
          { id: 10, name: 'Greenfield Co', email: 'linda@greenfield.com', contact_number: '+1 (555) 019-4444', status: 'Closed', source: 'LinkedIn', value: 15000, agent: 'Emily Davis', delegation_status: 'Accepted' },
        ];
        setLeads(mockLeads.filter(l => l.agent === activeAgent));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
    setSelectedLead(null); // Close drawer on agent switch
  }, [activeAgent]);

  // Fetch activities for selected lead
  const fetchActivities = (leadId) => {
    fetch(`http://localhost/lead/api/activities.php?lead_id=${leadId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setActivities(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error, using mock activities:', err);
        const mockActivities = [
          { id: 1, lead_id: 1, agent_name: 'Emily Davis', activity_type: 'Call', details: 'Initial discovery call with buyer. Discussed scope.', logged_at: '2026-06-12 11:30' },
          { id: 2, lead_id: 1, agent_name: 'Emily Davis', activity_type: 'Email', details: 'Sent calendar invite and follow-up docs.', logged_at: '2026-06-12 12:45' }
        ];
        setActivities(mockActivities.filter(a => a.lead_id === leadId));
      });
  };

  // Open Drawer and load interactions
  const openLeadDetails = (lead) => {
    setSelectedLead(lead);
    fetchActivities(lead.id);
  };

  // Log activity submit
  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!newActivity.details) {
      toast.warning('Please enter activity notes.');
      return;
    }
    
    setLoggingActivity(true);
    const logData = {
      lead_id: selectedLead.id,
      agent_name: activeAgent,
      activity_type: newActivity.type,
      details: newActivity.details
    };

    fetch('http://localhost/lead/api/activities.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success('Activity logged successfully.');
        fetchActivities(selectedLead.id);
        setNewActivity({ type: 'Call', details: '' });
      }
    })
    .catch(() => {
      // Local state fallback
      const localLog = {
        id: Date.now(),
        lead_id: selectedLead.id,
        agent_name: activeAgent,
        activity_type: newActivity.type,
        details: newActivity.details,
        logged_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
      setActivities([localLog, ...activities]);
      setNewActivity({ type: 'Call', details: '' });
    })
    .finally(() => {
      setLoggingActivity(false);
    });
  };

  // Accept or Reject Delegation
  const updateDelegation = (leadId, newStatus) => {
    const updatedData = {
      id: leadId,
      delegation_status: newStatus
    };

    fetch('http://localhost/lead/api/leads.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchLeads();
      }
    })
    .catch(() => {
      // Local fallback
      setLeads(leads.map(l => l.id === leadId ? { ...l, delegation_status: newStatus } : l));
    });
  };

  // Filter & Search
  const filteredLeads = leads.filter(l => {
    const nameStr = l.name || '';
    const emailStr = l.email || '';
    const phoneStr = l.contact_number || '';
    const sourceStr = l.source || '';
    const matchesSearch = 
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sourceStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-in" style={{ display: 'flex', gap: '24px', position: 'relative' }}>
      
      {/* LEADS LIST TABLE */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="leads-page-header">
          <div className="leads-toolbar">
            <div className="leads-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search my leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-btn" style={{ position: 'relative', padding: 0 }}>
              <Filter size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  padding: '9px 14px 9px 34px',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  fontWeight: 500
                }}
              >
                <option value="All" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                <option value="New" style={{ background: 'var(--bg-card)' }}>New</option>
                <option value="Contacted" style={{ background: 'var(--bg-card)' }}>Contacted</option>
                <option value="Qualified" style={{ background: 'var(--bg-card)' }}>Qualified</option>
                <option value="Closed" style={{ background: 'var(--bg-card)' }}>Closed</option>
                <option value="Lost" style={{ background: 'var(--bg-card)' }}>Lost</option>
              </select>
            </div>
          </div>
          <button className="add-lead-btn" onClick={handleOpenCreateModal}>
            <Plus size={16} /> Add Lead
          </button>
        </div>


        <div className="leads-table-card">
          <h2>My Assigned Leads ({leads.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead Details</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Value</th>
                  <th>Delegation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => openLeadDetails(lead)} 
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}>{lead.name}</span>
                          {lead.email && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lead.email}</span>}
                          {lead.contact_number && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{lead.contact_number}</span>}
                          {!lead.email && !lead.contact_number && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>No contact details</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(lead.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {lead.status === 'Closed' || lead.status === 'Won' ? (
                            <>
                              <Check size={12} /> Converted
                            </>
                          ) : (
                            lead.status
                          )}
                        </span>
                      </td>
                      <td>{lead.source}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {currencySymbol}{parseFloat(lead.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`delegation-status-badge ${getDelegationStatusClass(lead.delegation_status)}`}>
                          {lead.delegation_status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-cell">
                          {lead.delegation_status === 'Pending' ? (
                            <div className="accept-reject-actions">
                              <button 
                                className="quick-action-btn accept" 
                                onClick={(e) => { e.stopPropagation(); updateDelegation(lead.id, 'Accepted'); }}
                                title="Accept Lead"
                              >
                                <Check size={14} /> Accept
                              </button>
                              <button 
                                className="quick-action-btn reject" 
                                onClick={(e) => { e.stopPropagation(); updateDelegation(lead.id, 'Rejected'); }}
                                title="Reject Lead"
                              >
                                <X size={14} /> Decline
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="delegate-link"
                              onClick={(e) => { e.stopPropagation(); openLeadDetails(lead); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <MessageSquare size={13} /> View Log
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No leads assigned to you match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LEAD DETAILS & INTERACTION DRAWER */}
      {selectedLead && (
        <div 
          className="chart-card" 
          style={{ 
            width: '420px', 
            flexShrink: 0,
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: 'calc(100vh - 120px)',
            position: 'sticky', 
            top: '20px',
            animation: 'scaleUp 0.25s ease-out',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
                Lead Log: {selectedLead.name}
              </h3>
              {selectedLead.email && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedLead.email}</div>}
              {selectedLead.contact_number && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedLead.contact_number}</div>}
            </div>
            <button 
              className="modal-close-btn" 
              onClick={() => setSelectedLead(null)}
              style={{ padding: '2px', borderRadius: '4px' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Value: </span>
              <strong style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(selectedLead.value).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span className={`status-badge ${getStatusClass(selectedLead.status)}`} style={{ padding: '1px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {selectedLead.status === 'Closed' || selectedLead.status === 'Won' ? (
                  <>
                    <Check size={10} /> Converted
                  </>
                ) : (
                  selectedLead.status
                )}
              </span>
            </div>
          </div>

          {/* LOG ACTIVITY FORM */}
          <form onSubmit={handleLogSubmit} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Log New Interaction</h4>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <select
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
              >
                <option>Call</option>
                <option>Email</option>
                <option>Meeting</option>
                <option>Note</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <textarea
                rows="2"
                required
                placeholder="Enter details of conversation..."
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '12px', resize: 'vertical' }}
                value={newActivity.details}
                onChange={(e) => setNewActivity({ ...newActivity, details: e.target.value })}
              />
            </div>
            <button 
              type="submit" 
              disabled={loggingActivity}
              className="modal-btn primary"
              style={{ width: '100%', padding: '6px', fontSize: '12px', justifyContent: 'center' }}
            >
              {loggingActivity ? 'Saving...' : 'Log Interaction'}
            </button>
          </form>

          {/* ACTIVITY HISTORY FEED */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Interaction History</h4>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activities.map((act) => (
                  <div 
                    key={act.id} 
                    style={{ 
                      padding: '10px', 
                      background: 'var(--bg-hover)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border)',
                      fontSize: '12px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ 
                        fontWeight: 600, 
                        color: act.activity_type === 'Call' ? 'var(--accent-blue)' : act.activity_type === 'Email' ? 'var(--accent-orange)' : 'var(--accent-green)'
                      }}>
                        {act.activity_type}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {act.logged_at}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, lineBreak: 'anywhere' }}>{act.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '11px' }}>
                No interactions logged for this lead.
              </div>
            )}
          </div>
        </div>
      )}
      {/* CREATE LEAD MODAL */}
      {isCreateModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Lead</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLeadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Lead Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation or Jane Doe"
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    value={leadForm.name}
                    onChange={(e) => {
                      setLeadForm({ ...leadForm, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                    }}
                  />
                  {formErrors.name && <span className="invalid-feedback">{formErrors.name}</span>}
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. john@acme.com"
                      className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                      value={leadForm.email || ''}
                      onChange={(e) => {
                        setLeadForm({ ...leadForm, email: e.target.value });
                        if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                      }}
                    />
                    {formErrors.email && <span className="invalid-feedback">{formErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 012-3456"
                      className={`form-control ${formErrors.contact_number ? 'is-invalid' : ''}`}
                      value={leadForm.contact_number || ''}
                      onChange={(e) => {
                        setLeadForm({ ...leadForm, contact_number: e.target.value });
                        if (formErrors.contact_number) setFormErrors({ ...formErrors, contact_number: null });
                      }}
                    />
                    {formErrors.contact_number && <span className="invalid-feedback">{formErrors.contact_number}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Source</label>
                    <select
                      className="form-control"
                      value={leadForm.source}
                      onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    >
                      <option>Website</option>
                      <option>Referral</option>
                      <option>LinkedIn</option>
                      <option>Partner</option>
                      <option>Cold Call</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-control"
                      value={leadForm.status}
                      onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Qualified</option>
                      <option>Closed</option>
                      <option>Lost</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Value ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 5000.00"
                    className="form-control"
                    value={leadForm.value}
                    onChange={(e) => setLeadForm({ ...leadForm, value: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <textarea
                    rows="3"
                    placeholder="General remarks, notes, or background information about this lead..."
                    className="form-control"
                    style={{ resize: 'vertical' }}
                    value={leadForm.remarks || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, remarks: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default SAMyLeads;

