import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, MessageSquare, Clock, X, IndianRupee, TrendingUp, CheckCircle2, UserCircle } from 'lucide-react';
import { useToast } from '../components/NotificationContext';

const Sales = () => {
  const toast = useToast();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';
  const { activeRole, activeAgent } = useOutletContext();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interaction drawer state
  const [selectedLogLead, setSelectedLogLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    type: 'Note',
    details: ''
  });
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Fetch leads from backend
  const fetchLeads = () => {
    setLoading(true);
    // Determine the current tenant from localStorage or default to 1
    const tenantId = localStorage.getItem('crm_tenant_id') || '1';
    
    fetch(`http://localhost/lead/api/leads.php?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Filter: show only leads with status 'Closed' or 'Won' (Converted Leads)
          let converted = data.data.filter(l => l.status === 'Closed' || l.status === 'Won');
          
          // Role Based Filtering:
          if (activeRole === 'Sales Associate') {
            converted = converted.filter(l => l.agent === activeAgent);
          }
          
          setLeads(converted);
        }
      })
      .catch((err) => {
        console.warn('API error fetching sales leads, using mock data:', err);
        // Fallback mock converted data
        const mockConverted = [
          { id: 4, name: 'David Miller', email: 'dmiller@millerco.com', contact_number: '+1 (555) 019-1111', status: 'Closed', source: 'Website', value: 15000.00, agent: 'Emily Davis', delegation_status: 'Accepted', remarks: 'Client finalized contract for 1 year.' },
          { id: 10, name: 'Greenfield Co', email: 'linda@greenfield.com', contact_number: '+1 (555) 019-2222', status: 'Closed', source: 'LinkedIn', value: 12000.00, agent: 'Emily Davis', delegation_status: 'Accepted', remarks: 'Agreed on custom enterprise plan.' },
          { id: 12, name: 'Alpha Tech', email: 'sales@alphatech.com', contact_number: '+1 (555) 019-9999', status: 'Won', source: 'Referral', value: 25000.00, agent: 'Alex Lee', delegation_status: 'Accepted', remarks: 'Converted from cold pipeline.' }
        ];
        
        let filteredMock = mockConverted;
        if (activeRole === 'Sales Associate') {
          filteredMock = mockConverted.filter(l => l.agent === activeAgent);
        }
        setLeads(filteredMock);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
    setSelectedLogLead(null); // Close log drawer on role/agent switch
  }, [activeRole, activeAgent]);

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
      toast.warning('Please enter details.');
      return;
    }
    
    setLoggingActivity(true);
    const logData = {
      lead_id: selectedLogLead.id,
      agent_name: activeRole === 'Sales Associate' ? activeAgent : 'Admin',
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

  // Search filter logic
  const filteredSales = leads.filter(l => {
    const nameStr = l.name || '';
    const emailStr = l.email || '';
    const agentStr = l.agent || '';
    const sourceStr = l.source || '';
    
    return (
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agentStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sourceStr.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Calculate Metrics
  const totalRevenue = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
  const dealsCount = filteredSales.length;
  const averageDealSize = dealsCount > 0 ? totalRevenue / dealsCount : 0;

  return (
    <div className="animate-in sales-page-layout">
      
      {/* SALES MAIN PANEL */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* METRICS DASHBOARD */}
        <div className="sales-stats-grid">
          
          {/* Total Sales Value */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <IndianRupee size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Total Sales Revenue</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {currencySymbol}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Total Conversions */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Conversions Closed</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {dealsCount} {dealsCount === 1 ? 'Deal' : 'Deals'}
              </div>
            </div>
          </div>

          {/* Average Deal Value */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-orange)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Average Deal Size</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {currencySymbol}{averageDealSize.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

        </div>

        {/* SEARCH BAR */}
        <div className="leads-page-header" style={{ marginBottom: '20px' }}>
          <div className="leads-toolbar">
            <div className="leads-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search sales by client, source, or agent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SALES TABLE */}
        <div className="leads-table-card">
          <h2>Converted Sales Records ({filteredSales.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Contact Info</th>
                  <th>Source</th>
                  <th>Value</th>
                  {activeRole !== 'Sales Associate' && <th>Assigned Agent</th>}
                  <th>Latest Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((lead) => (
                    <tr key={lead.id} onClick={() => openLeadLog(lead)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13.5px' }}>{lead.name}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {lead.email && <span style={{ color: 'var(--text-primary)', fontSize: '12.5px' }}>{lead.email}</span>}
                          {lead.contact_number && <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>{lead.contact_number}</span>}
                          {!lead.email && !lead.contact_number && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>No contact</span>}
                        </div>
                      </td>
                      <td>{lead.source}</td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                        {currencySymbol}{parseFloat(lead.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      {activeRole !== 'Sales Associate' && (
                        <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {lead.agent || 'Unassigned'}
                        </td>
                      )}
                      <td>
                        <div 
                          style={{ 
                            maxWidth: '220px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: lead.remarks ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontStyle: lead.remarks ? 'normal' : 'italic',
                            fontSize: '12px'
                          }}
                          title={lead.remarks || ''}
                        >
                          {lead.remarks || 'No remarks'}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons-cell" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="delegate-link"
                            onClick={() => openLeadLog(lead)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)' }}
                          >
                            <MessageSquare size={13} /> View Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeRole === 'Sales Associate' ? '6' : '7'} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No converted sales found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* LEAD DETAILS & INTERACTION DRAWER */}
      {selectedLogLead && (
        <div 
          className="chart-card sales-drawer" 
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
                Sale Log: {selectedLogLead.name}
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
              <span style={{ color: 'var(--text-muted)' }}>Revenue Value: </span>
              <strong style={{ color: 'var(--accent-green)', fontSize: '13px' }}>{currencySymbol}{parseFloat(selectedLogLead.value || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span className="status-badge status-won" style={{ padding: '1px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={10} /> Converted
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
                No interactions logged for this sale.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Sales;
