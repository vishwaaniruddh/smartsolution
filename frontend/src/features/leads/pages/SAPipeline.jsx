import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Filter, IndianRupee } from 'lucide-react';
import { useToast } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';

const SAPipeline = () => {
  const toast = useToast();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';
  const { activeAgent } = useOutletContext();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch leads and filter by simulated agent
  const fetchLeads = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/leads`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          // Show only leads delegated to this agent that are accepted (active deals)
          const agentLeads = data.data.filter(l => l.agent === activeAgent && l.delegation_status === 'Accepted');
          setLeads(agentLeads);
        }
      })
      .catch((err) => {
        console.warn('API error in SAPipeline, falling back to mock leads:', err);
        const mockLeads = [
          { id: 1, name: 'Acme Corp', email: 'alice@acme.com', contact_number: '+1 (555) 019-2834', status: 'New', source: 'Website', value: 5000, agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 2, name: 'TechFlow', email: 'bob@techflow.io', contact_number: '+1 (555) 019-5847', status: 'Contacted', source: 'Referral', value: 12500, agent: 'Emily Davis', delegation_status: 'Pending' },
          { id: 3, name: 'Apex Org', email: 'mbrown@apex.org', contact_number: '+1 (555) 019-0000', status: 'Qualified', source: 'LinkedIn', value: 8200, agent: 'Emily Davis', delegation_status: 'Accepted' },
          { id: 5, name: 'Jessica Taylor', email: 'jtaylor@ventures.net', contact_number: '+1 (555) 019-1111', status: 'Qualified', source: 'Alex Lee', delegation_status: 'Accepted' },
          { id: 10, name: 'Greenfield Co', email: 'linda@greenfield.com', contact_number: '+1 (555) 019-2222', status: 'Closed', source: 'LinkedIn', value: 15000, agent: 'Emily Davis', delegation_status: 'Accepted' },
        ];
        setLeads(mockLeads.filter(l => l.agent === activeAgent && l.delegation_status === 'Accepted'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, [activeAgent]);

  // Update lead status in backend
  const updateLeadStatus = (leadId, newStatus) => {
    const updatedData = {
      id: leadId,
      status: newStatus
    };

    fetch(`${apiBaseUrl}/leads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchLeads();
      } else {
        toast.error('Error updating status: ' + data.error);
      }
    })
    .catch(() => {
      // Fallback local update
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    });
  };

  // Group leads by status
  const columns = {
    New: leads.filter(l => l.status === 'New'),
    Contacted: leads.filter(l => l.status === 'Contacted'),
    Qualified: leads.filter(l => l.status === 'Qualified'),
    Closed: leads.filter(l => l.status === 'Closed' || l.status === 'Won'),
    Lost: leads.filter(l => l.status === 'Lost')
  };

  const getColTitleClass = (col) => {
    switch (col) {
      case 'New': return 'todo';
      case 'Contacted': return 'in-progress';
      case 'Qualified': return 'in-progress';
      case 'Closed': return 'won';
      case 'Lost': return 'lost';
      default: return 'todo';
    }
  };

  const getColLabel = (col) => {
    switch (col) {
      case 'Closed': return 'Closed-Won';
      case 'Lost': return 'Closed-Lost';
      default: return col;
    }
  };

  return (
    <div className="animate-in">
      <div className="pipeline-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-white)' }}>
            My Opportunities Pipeline
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Pipeline showing active leads accepted by <strong>{activeAgent}</strong>.
          </p>
        </div>
      </div>

      <div className="pipeline-board" style={{ marginTop: '20px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {Object.keys(columns).map((colName) => (
          <div key={colName} className="pipeline-column">
            <div className="pipeline-col-header">
              <span className={`pipeline-col-title ${getColTitleClass(colName)}`}>
                {getColLabel(colName)}
              </span>
              <span className="pipeline-col-count">{columns[colName].length}</span>
            </div>

            <div className="pipeline-cards" style={{ minHeight: '300px' }}>
              {columns[colName].length > 0 ? (
                columns[colName].map((lead) => (
                  <div key={lead.id} className="pipeline-deal-card">
                    <div className="pipeline-deal-name">{lead.name}</div>
                    <div className="pipeline-deal-value" style={{ display: 'flex', alignItems: 'center', gap: '2px', margin: '4px 0 8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
                      {currencySymbol}{parseFloat(lead.value || 0).toLocaleString()}
                    </div>
                    <div className="pipeline-deal-contact" style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', marginTop: '4px' }}>
                      {lead.email && <div>{lead.email}</div>}
                      {lead.contact_number && <div>{lead.contact_number}</div>}
                      {!lead.email && !lead.contact_number && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No contact info</div>}
                    </div>
                    <div className="pipeline-deal-contact" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', marginTop: '4px' }}>
                      Source: {lead.source}
                    </div>
                    
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        padding: '4px 8px',
                        outline: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        fontWeight: 500
                      }}
                    >
                      <option value="New">Move to New</option>
                      <option value="Contacted">Move to Contacted</option>
                      <option value="Qualified">Move to Qualified</option>
                      <option value="Closed">Move to Closed-Won</option>
                      <option value="Lost">Move to Closed-Lost</option>
                    </select>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)' }}>
                  Empty Stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SAPipeline;
