import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Plus, X, Check, Edit2, Trash2, UserPlus, MessageSquare, Clock, PlusCircle } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import LeadFormResolver from '../components/LeadFormResolver';
import { apiBaseUrl } from '../../../utils/env.js';

const formatRemarks = (remarks) => {
  if (!remarks) return '';
  const trimmed = remarks.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const json = JSON.parse(trimmed);
      const parts = [];
      if (json.industry_sector) parts.push(json.industry_sector);
      if (json.company_size) parts.push(`Size: ${json.company_size}`);
      if (json.text_remarks) parts.push(json.text_remarks);
      return parts.join(' | ');
    } catch {
      return remarks;
    }
  }
  return remarks;
};



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

const LeadsTable = () => {
  const { toast, confirm, currencySymbol, user: currentUser } = useCRM();

  const [leads, setLeads] = useState([]);
  const [agentsList, setAgentsList] = useState(['Unassigned', 'Emily Davis', 'Alex Lee', 'Sarah Connor']);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState(null); // null = create, number = edit
  
  // Lead Form State (Create or Edit)
  const [savingLead, setSavingLead] = useState(false);

  // Delegation Form State
  const [selectedLead, setSelectedLead] = useState(null);
  const [delegationAgent, setDelegationAgent] = useState('Unassigned');
  const [delegationStatus, setDelegationStatus] = useState('Pending');

  // Interaction drawer state
  const [selectedLogLead, setSelectedLogLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalLead, setLogModalLead] = useState(null);
  const [logForm, setLogForm] = useState({
    type: 'Note',
    details: ''
  });
  const [savingLog, setSavingLog] = useState(false);

  // Fetch leads from backend API
  const fetchLeads = () => {
    fetch(`${apiBaseUrl}/leads`)
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
    fetch(`${apiBaseUrl}/users`)
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
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (lead) => {
    setEditingLeadId(lead.id);
    setIsCreateModalOpen(true);
  };

  // Fetch activities for selected log lead
  const fetchActivities = (leadId) => {
    fetch(`${apiBaseUrl}/activities?lead_id=${leadId}`)
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

  const openLogModal = (lead) => {
    setLogModalLead(lead);
    setLogForm({
      type: 'Note',
      details: ''
    });
    setIsLogModalOpen(false);
    setIsLogModalOpen(true);
  };

  const handleLogModalSubmit = (e) => {
    e.preventDefault();
    if (!logForm.details || !logForm.details.trim()) {
      toast.warning('Please enter details.');
      return;
    }
    
    setSavingLog(true);
    const logData = {
      lead_id: logModalLead.id,
      agent_name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin',
      activity_type: logForm.type,
      details: logForm.details
    };

    fetch(`${apiBaseUrl}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success('Activity logged successfully.');
        setIsLogModalOpen(false);
        if (selectedLogLead && selectedLogLead.id === logModalLead.id) {
          fetchActivities(logModalLead.id);
        }
        fetchLeads();
      } else {
        toast.error(data.error || 'Failed to save activity.');
      }
    })
    .catch((err) => {
      console.error('API error saving activity:', err);
      toast.error('Network error saving activity.');
    })
    .finally(() => {
      setSavingLog(false);
    });
  };

  // Handle lead creation/edit submit
  const handleLeadSubmitDirect = (payload) => {
    setSavingLead(true);
    if (editingLeadId !== null) {
      // PERFORM UPDATE (PUT)
      fetch(`${apiBaseUrl}/leads`, {
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
      })
      .finally(() => {
        setSavingLead(false);
      });
    } else {
      // PERFORM CREATE (POST)
      fetch(`${apiBaseUrl}/leads`, {
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
      })
      .finally(() => {
        setSavingLead(false);
      });
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId, leadName) => {
    const confirmed = await confirm(`Are you sure you want to delete the lead "${leadName}"?`, 'Delete Lead');
    if (!confirmed) {
      return;
    }

    fetch(`${apiBaseUrl}/leads?id=${leadId}`, {
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

    fetch(`${apiBaseUrl}/leads`, {
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
                          title={formatRemarks(lead.remarks)}
                        >
                          {formatRemarks(lead.remarks) || 'No remarks'}
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
                             className="action-icon-btn log" 
                             onClick={() => openLogModal(lead)}
                             title="Log Action or Remark"
                             style={{ color: 'var(--accent-orange)' }}
                           >
                             <PlusCircle size={15} />
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
            <LeadFormResolver
              initialData={editingLeadId !== null ? leads.find(l => l.id === editingLeadId) : null}
              onSubmit={handleLeadSubmitDirect}
              onCancel={() => setIsCreateModalOpen(false)}
              agentsList={agentsList}
              showAgentAssignment={true}
              currencySymbol={currencySymbol}
              saving={savingLead}
            />
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

      {isLogModalOpen && logModalLead && createPortal(
        <div className="modal-overlay" onClick={() => setIsLogModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>Log Action or Remark: {logModalLead.name}</h3>
              <button className="modal-close-btn" onClick={() => setIsLogModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLogModalSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Activity Type
                  </label>
                  <select
                    className="form-control"
                    value={logForm.type}
                    onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
                    style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '0 8px' }}
                  >
                    <option>Note</option>
                    <option>Call</option>
                    <option>Email</option>
                    <option>Meeting</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Details / Remark <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    rows="4"
                    required
                    placeholder="Enter details of action or remark..."
                    className="form-control"
                    value={logForm.details}
                    onChange={(e) => setLogForm({ ...logForm, details: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="modal-btn secondary" onClick={() => setIsLogModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={savingLog} className="modal-btn primary">
                  {savingLog ? 'Saving...' : 'Add Log Entry'}
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

          {/* LOG ACTION BUTTON */}
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
            <button 
              type="button" 
              onClick={() => openLogModal(selectedLogLead)}
              className="modal-btn primary"
              style={{ width: '100%', padding: '8px', fontSize: '13px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={15} /> Log Action or Remark
            </button>
          </div>

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
