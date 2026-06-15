import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Plus, X, Check, XCircle, Edit2, Trash2, UserPlus, MessageSquare, Clock } from 'lucide-react';
import { useToast, useConfirm } from '../components/NotificationContext';

const defaultLeads = [
  { id: 1, name: 'John Smith', email: 'john.smith@gmail.com', contact_number: '+1 (555) 019-2834', status: 'New', source: 'Website', value: 5000.00, agent: 'Emily Davis', delegation_status: 'Accepted' },
  { id: 2, name: 'Sarah Chen', email: 'schen@techflow.io', contact_number: '+1 (555) 019-5847', status: 'Contacted', source: 'Referral', value: 12500.00, agent: 'Emily Davis', delegation_status: 'Pending' },
  { id: 3, name: 'Michael Brown', email: 'mbrown@apex.org', contact_number: '+1 (555) 019-0000', status: 'Qualified', source: 'LinkedIn', value: 8200.00, agent: 'Alex Lee', delegation_status: 'Accepted' },
  { id: 4, name: 'David Miller', email: 'dmiller@millerco.com', contact_number: '+1 (555) 019-1111', status: 'Closed', source: 'Website', value: 15000.00, agent: 'Emily Davis', delegation_status: 'Accepted' },
];

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

const validateEmail = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone) => {
  if (!phone) return true;
  const trimmed = phone.trim();
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
  if (phoneRegex.test(trimmed)) {
    const digitCount = trimmed.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15;
  }
  return false;
};

const LeadsTable = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';

  const [leads, setLeads] = useState(defaultLeads);
  const [agentsList, setAgentsList] = useState(['Unassigned', 'Emily Davis', 'Alex Lee', 'Sarah Connor']);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null); // null = create, number = edit
  
  // Lead Form State (Create or Edit)
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    contact_number: '',
    source: 'Website',
    status: 'New',
    value: '',
    agent: 'Unassigned',
    delegation_status: 'None',
    remarks: ''
  });

  // Validation feedback state
  const [formErrors, setFormErrors] = useState({});

  // Delegation Form State
  const [selectedLead, setSelectedLead] = useState(null);
  const [delegationAgent, setDelegationAgent] = useState('Unassigned');
  const [delegationStatus, setDelegationStatus] = useState('Pending');

  // Interaction drawer state
  const [selectedLogLead, setSelectedLogLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    type: 'Note',
    details: ''
  });
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Fetch leads from backend API
  const fetchLeads = () => {
    fetch('http://localhost/lead/api/leads.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLeads(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error fetching leads, falling back to mock state:', err);
      });
  };

  // Fetch agents list dynamically from users table
  const fetchAgents = () => {
    fetch('http://localhost/lead/api/users.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Filter users with roles Sales Associate or Manager to populate assignable agents
          const dbAgents = data.data
            .filter(user => user.role === 'Sales Associate' || user.role === 'Manager')
            .map(user => `${user.first_name} ${user.last_name}`);
          
          // Ensure uniqueness and prepend Unassigned
          const uniqueAgents = ['Unassigned', ...new Set(dbAgents)];
          setAgentsList(uniqueAgents);
        }
      })
      .catch((err) => {
        console.warn('API error fetching agents, keeping default mock agents:', err);
      });
  };

  useEffect(() => {
    fetchLeads();
    fetchAgents();
  }, []);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingLeadId(null);
    setFormErrors({});
    setLeadForm({
      name: '',
      email: '',
      contact_number: '',
      source: 'Website',
      status: 'New',
      value: '',
      agent: 'Unassigned',
      delegation_status: 'None',
      remarks: ''
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (lead) => {
    setEditingLeadId(lead.id);
    setFormErrors({});
    setLeadForm({
      name: lead.name || '',
      email: lead.email || '',
      contact_number: lead.contact_number || '',
      source: lead.source || 'Website',
      status: lead.status || 'New',
      value: lead.value ? lead.value.toString() : '',
      agent: lead.agent || 'Unassigned',
      delegation_status: lead.delegation_status || 'None',
      remarks: lead.remarks || ''
    });
    setIsCreateModalOpen(true);
  };

  // Fetch activities for selected log lead
  const fetchActivities = (leadId) => {
    fetch(`http://localhost/lead/api/activities.php?lead_id=${leadId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setActivities(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error fetching activities:', err);
      });
  };

  const openLeadLog = (lead) => {
    setSelectedLogLead(lead);
    fetchActivities(lead.id);
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    if (!newActivity.details) {
      toast.warning('Please enter activity notes.');
      return;
    }
    
    setLoggingActivity(true);
    const logData = {
      lead_id: selectedLogLead.id,
      agent_name: 'Admin',
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
        fetchActivities(selectedLogLead.id);
        setNewActivity({ type: 'Note', details: '' });
      }
    })
    .catch((err) => {
      console.error('API error saving activity:', err);
    })
    .finally(() => {
      setLoggingActivity(false);
    });
  };

  // Handle lead creation/edit submit
  const handleLeadSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!leadForm.name || !leadForm.name.trim()) {
      errors.name = 'Lead Name is required.';
    }

    if (leadForm.email && !validateEmail(leadForm.email)) {
      errors.email = 'Please enter a valid Email Address (e.g. name@domain.com).';
    }

    if (leadForm.contact_number && !validatePhone(leadForm.contact_number)) {
      errors.contact_number = 'Please enter a valid Contact Number (7-15 digits).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    const payload = {
      ...leadForm,
      value: leadForm.value === '' ? 0.00 : parseFloat(leadForm.value),
      delegation_status: leadForm.agent === 'Unassigned' ? 'None' : leadForm.delegation_status
    };

    if (editingLeadId !== null) {
      // PERFORM UPDATE (PUT)
      fetch('http://localhost/lead/api/leads.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingLeadId, ...payload })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Lead updated successfully.');
          fetchLeads();
          setIsCreateModalOpen(false);
        } else {
          toast.error('Error: ' + data.error);
        }
      })
      .catch(() => {
        // Fallback local update
        setLeads(leads.map(l => l.id === editingLeadId ? { ...l, id: editingLeadId, ...payload } : l));
        setIsCreateModalOpen(false);
      });
    } else {
      // PERFORM CREATE (POST)
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
          toast.error('Error: ' + data.error);
        }
      })
      .catch(() => {
        // Fallback local create
        const localNewLead = {
          ...payload,
          id: Date.now()
        };
        setLeads([localNewLead, ...leads]);
        setIsCreateModalOpen(false);
      });
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId, leadName) => {
    const confirmed = await confirm(`Are you sure you want to delete the lead "${leadName}"?`, 'Delete Lead');
    if (!confirmed) {
      return;
    }

    fetch(`http://localhost/lead/api/leads.php?id=${leadId}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success('Lead deleted successfully.');
        fetchLeads();
      } else {
        toast.error('Error deleting lead: ' + data.error);
      }
    })
    .catch(() => {
      // Fallback local delete
      setLeads(leads.filter(l => l.id !== leadId));
      toast.success('Lead deleted (local fallback).');
    });
  };

  // Open delegation modal
  const openDelegateModal = (lead) => {
    setSelectedLead(lead);
    setDelegationAgent(lead.agent || 'Unassigned');
    setDelegationStatus(lead.delegation_status && lead.delegation_status !== 'None' ? lead.delegation_status : 'Pending');
    setIsDelegateModalOpen(true);
  };

  // Handle delegation submit
  const handleDelegateSubmit = (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    const updatedData = {
      id: selectedLead.id,
      agent: delegationAgent,
      delegation_status: delegationAgent === 'Unassigned' ? 'None' : delegationStatus
    };

    fetch('http://localhost/lead/api/leads.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success('Lead delegation updated.');
        fetchLeads();
        setIsDelegateModalOpen(false);
      } else {
        toast.error('Error: ' + data.error);
      }
    })
    .catch(() => {
      // Fallback local update
      setLeads(leads.map(l => 
        l.id === selectedLead.id 
          ? { ...l, agent: delegationAgent, delegation_status: delegationAgent === 'Unassigned' ? 'None' : delegationStatus } 
          : l
      ));
      setIsDelegateModalOpen(false);
    });
  };

  // Quick Accept/Reject actions in row
  const updateDelegationQuick = (leadId, newStatus) => {
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
      setLeads(leads.map(l => 
        l.id === leadId ? { ...l, delegation_status: newStatus } : l
      ));
    });
  };

  // Filter & Search Logic
  const filteredLeads = leads.filter(lead => {
    const nameStr = lead.name || '';
    const emailStr = lead.email || '';
    const phoneStr = lead.contact_number || '';
    const agentStr = lead.agent || 'Unassigned';

    const matchesSearch = 
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agentStr.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    
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
                placeholder="Search leads, contacts, or agents..."
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
          <button className="add-lead-btn" onClick={openCreateModal}>
            <Plus size={16} /> Add Lead
          </button>
        </div>

        <div className="leads-table-card">
          <h2>Leads Management & Delegation</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Value</th>
                  <th>Assigned Agent</th>
                  <th>Delegation Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead, i) => (
                    <tr key={lead.id || i}>
                      <td>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>{lead.name}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {lead.email && <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{lead.email}</span>}
                          {lead.contact_number && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{lead.contact_number}</span>}
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
                      <td style={{ color: lead.agent === 'Unassigned' ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: lead.agent === 'Unassigned' ? 400 : 500 }}>
                        {lead.agent || 'Unassigned'}
                      </td>
                      <td>
                        <span className={`delegation-status-badge ${getDelegationStatusClass(lead.delegation_status)}`}>
                          {lead.delegation_status || 'None'}
                        </span>
                      </td>
                      <td>
                        <div 
                          style={{ 
                            maxWidth: '180px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: lead.remarks ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontStyle: lead.remarks ? 'normal' : 'italic',
                            fontSize: '12.5px'
                          }}
                          title={lead.remarks || ''}
                        >
                          {lead.remarks || 'No remarks'}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            className="action-icon-btn log" 
                            onClick={() => openLeadLog(lead)}
                            title="View Interaction Log"
                            style={{ color: 'var(--accent-cyan)' }}
                          >
                            <MessageSquare size={15} />
                          </button>
                          <button 
                            className="action-icon-btn delegate" 
                            onClick={() => openDelegateModal(lead)}
                            title="Delegate Lead"
                          >
                            <UserPlus size={15} />
                          </button>
                          <button 
                            className="action-icon-btn edit" 
                            onClick={() => openEditModal(lead)}
                            title="Edit Lead"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="action-icon-btn delete" 
                            onClick={() => handleDeleteLead(lead.id, lead.name)}
                            title="Delete Lead"
                          >
                            <Trash2 size={15} />
                          </button>
                          {lead.delegation_status === 'Pending' && (
                            <div className="accept-reject-actions" style={{ marginLeft: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                              <button 
                                className="quick-action-btn accept" 
                                onClick={() => updateDelegationQuick(lead.id, 'Accepted')}
                                title="Accept Delegation"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                className="quick-action-btn reject" 
                                onClick={() => updateDelegationQuick(lead.id, 'Rejected')}
                                title="Reject Delegation"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No leads found matching the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* LEAD FORM MODAL (CREATE OR EDIT) */}
      {isCreateModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLeadId !== null ? 'Edit Lead Account' : 'Create New Lead'}</h3>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLeadSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Lead Name</label>
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
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assign Agent</label>
                    <select
                      className="form-control"
                      value={leadForm.agent}
                      onChange={(e) => {
                        const agent = e.target.value;
                        const status = agent === 'Unassigned' ? 'None' : 'Pending';
                        setLeadForm({ ...leadForm, agent, delegation_status: status });
                      }}
                    >
                      {agentsList.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  {leadForm.agent !== 'Unassigned' && (
                    <div className="form-group">
                      <label className="form-label">Delegation Status</label>
                      <select
                        className="form-control"
                        value={leadForm.delegation_status}
                        onChange={(e) => setLeadForm({ ...leadForm, delegation_status: e.target.value })}
                      >
                        <option>Pending</option>
                        <option>Accepted</option>
                        <option>Rejected</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary">
                  {editingLeadId !== null ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* DELEGATE LEAD MODAL */}
      {isDelegateModalOpen && selectedLead && createPortal(
        <div className="modal-overlay" onClick={() => setIsDelegateModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delegate Lead: {selectedLead.name}</h3>
              <button className="modal-close-btn" onClick={() => setIsDelegateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDelegateSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Assign this lead to a sales agent and set their initial assignment/delegation status.
                </div>
                <div className="form-group">
                  <label className="form-label">Select Agent</label>
                  <select
                    className="form-control"
                    value={delegationAgent}
                    onChange={(e) => {
                      const agent = e.target.value;
                      setDelegationAgent(agent);
                      if (agent === 'Unassigned') {
                        setDelegationStatus('None');
                      } else if (delegationStatus === 'None') {
                        setDelegationStatus('Pending');
                      }
                    }}
                  >
                    {agentsList.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                {delegationAgent !== 'Unassigned' && (
                  <div className="form-group">
                    <label className="form-label">Delegation Status</label>
                    <select
                      className="form-control"
                      value={delegationStatus}
                      onChange={(e) => setDelegationStatus(e.target.value)}
                    >
                      <option>Pending</option>
                      <option>Accepted</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setIsDelegateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* LEAD DETAILS & INTERACTION DRAWER */}
      {selectedLogLead && (
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
                Lead Log: {selectedLogLead.name}
              </h3>
              {selectedLogLead.email && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedLogLead.email}</div>}
              {selectedLogLead.contact_number && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedLogLead.contact_number}</div>}
            </div>
            <button 
              className="modal-close-btn" 
              onClick={() => setSelectedLogLead(null)}
              style={{ padding: '2px', borderRadius: '4px' }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Value: </span>
              <strong style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(selectedLogLead.value || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span className={`status-badge ${getStatusClass(selectedLogLead.status)}`} style={{ padding: '1px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {selectedLogLead.status === 'Closed' || selectedLogLead.status === 'Won' ? (
                  <>
                    <Check size={10} /> Converted
                  </>
                ) : (
                  selectedLogLead.status
                )}
              </span>
            </div>
          </div>

          {/* LOG ACTIVITY FORM */}
          <form onSubmit={handleLogSubmit} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Log Action or Remark</h4>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <select
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
              >
                <option>Note</option>
                <option>Call</option>
                <option>Email</option>
                <option>Meeting</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '10px' }}>
              <textarea
                rows="2"
                required
                placeholder="Enter details of action or remark..."
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
              {loggingActivity ? 'Saving...' : 'Add Log Entry'}
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
                        color: act.activity_type === 'Call' ? 'var(--accent-blue)' : act.activity_type === 'Email' ? 'var(--accent-orange)' : act.activity_type === 'Meeting' ? 'var(--accent-purple)' : 'var(--accent-green)'
                      }}>
                        {act.activity_type}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {act.logged_at}
                      </span>
                    </div>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Logged by: {act.agent_name}</span>
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
    </div>
  );
};

export default LeadsTable;
