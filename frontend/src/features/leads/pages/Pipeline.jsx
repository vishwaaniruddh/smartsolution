import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useToast } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';

const Pipeline = () => {
  const toast = useToast();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all leads
  const fetchLeads = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/leads`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLeads(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error in Pipeline, falling back to mock deals:', err);
        // Fallback mock data
        const mockLeads = [
          { id: 1, name: 'Acme Corp', contact: 'alice@acme.com', status: 'New', source: 'Website', value: 5000, agent: 'Emily Davis' },
          { id: 2, name: 'TechFlow', contact: 'bob@techflow.io', status: 'Contacted', source: 'Referral', value: 12500, agent: 'Emily Davis' },
          { id: 3, name: 'Apex Org', contact: 'mbrown@apex.org', status: 'Qualified', source: 'LinkedIn', value: 8200, agent: 'Alex Lee' },
          { id: 4, name: 'Global Tech', contact: 'gtech@global.com', status: 'Closed', source: 'Website', value: 15000, agent: 'Emily Davis' },
          { id: 5, name: 'Delta Co', contact: 'delta@delta.org', status: 'Lost', source: 'Referral', value: 3400, agent: 'Alex Lee' }
        ];
        setLeads(mockLeads);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Update lead status in database
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
        toast.error('Error: ' + data.error);
      }
    })
    .catch(() => {
      // Local fallback
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    });
  };

  // Group deals by status
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
    <div>
      <div className="pipeline-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-white)' }}>
            Sales Pipeline Kanban Board
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Interactive board showing all deals categorized by lead status stages.
          </p>
        </div>
      </div>

      <div className="pipeline-board" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginTop: '24px' }}>
        {Object.keys(columns).map((colName) => (
          <div key={colName} className="pipeline-column animate-in">
            <div className="pipeline-col-header">
              <span className={`pipeline-col-title ${getColTitleClass(colName)}`}>
                {getColLabel(colName)}
              </span>
              <span className="pipeline-col-count">{columns[colName].length}</span>
            </div>
            
            <div className="pipeline-cards" style={{ minHeight: '350px' }}>
              {columns[colName].length > 0 ? (
                columns[colName].map((lead) => (
                  <div key={lead.id} className="pipeline-deal-card">
                    <div className="pipeline-deal-name">{lead.name}</div>
                    <div className="pipeline-deal-value" style={{ margin: '4px 0 8px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {currencySymbol}{parseFloat(lead.value || 0).toLocaleString()}
                    </div>
                    <div className="pipeline-deal-contact" style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', marginTop: '4px' }}>
                      {lead.email && <div>{lead.email}</div>}
                      {lead.contact_number && <div>{lead.contact_number}</div>}
                      {!lead.email && !lead.contact_number && <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No contact info</div>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Agent: <strong>{lead.agent || 'Unassigned'}</strong>
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
                        marginTop: '10px',
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
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '11px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  No deals in stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pipeline;
