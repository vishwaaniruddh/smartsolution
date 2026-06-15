import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { Search, MessageSquare, Clock, X, IndianRupee, TrendingUp, CheckCircle2, UserCircle, Award, Lock } from 'lucide-react';
import { useToast } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';

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

  // Sales Finalization form states
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [finalizeLead, setFinalizeLead] = useState(null);
  const [finalizeForm, setFinalizeForm] = useState({
    sales_status: 'Pending',
    payment_status: 'Unpaid',
    received_payment: 0,
    payment_method: '',
    transaction_reference: '',
    payment_date: '',
    finalization_remarks: ''
  });
  const [finalizeErrors, setFinalizeErrors] = useState({});
  const [savingFinalize, setSavingFinalize] = useState(false);

  // Fetch leads from backend
  const fetchLeads = () => {
    setLoading(true);
    // Determine the current tenant from localStorage or default to 1
    const tenantId = localStorage.getItem('crm_tenant_id') || '1';
    
    fetch(`${apiBaseUrl}/leads?tenant_id=${tenantId}`)
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

    fetch(`${apiBaseUrl}/activities`, {
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

  const updateSalesStatus = (leadId, newSalesStatus) => {
    fetch(`${apiBaseUrl}/leads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, sales_status: newSalesStatus })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success(`Sales status updated to "${newSalesStatus}".`);
        fetchLeads();
        setSelectedLogLead(prev => prev && prev.id === leadId ? { ...prev, sales_status: newSalesStatus } : prev);
      } else {
        toast.error(data.error || 'Failed to update sales status.');
      }
    })
    .catch((err) => {
      console.error('API error updating sales status:', err);
      toast.error('Network error updating sales status.');
    });
  };

  const openFinalizeModal = (lead) => {
    setFinalizeLead(lead);
    setFinalizeForm({
      sales_status: lead.sales_status || 'Pending',
      payment_status: lead.payment_status || 'Unpaid',
      received_payment: lead.received_payment !== undefined && lead.received_payment !== null ? parseFloat(lead.received_payment) : 0,
      payment_method: lead.payment_method || '',
      transaction_reference: lead.transaction_reference || '',
      payment_date: lead.payment_date || new Date().toISOString().split('T')[0],
      finalization_remarks: lead.finalization_remarks || ''
    });
    setFinalizeErrors({});
    setIsFinalizeModalOpen(true);
  };

  const handleFinalizeFormChange = (field, value) => {
    setFinalizeForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-rules based on payment_status changes
      if (field === 'payment_status') {
        if (value === 'Fully Paid') {
          updated.received_payment = parseFloat(finalizeLead.value || 0);
          if (!updated.payment_date) {
            updated.payment_date = new Date().toISOString().split('T')[0];
          }
        } else if (value === 'Unpaid') {
          updated.received_payment = 0;
          updated.payment_method = '';
          updated.transaction_reference = '';
          updated.payment_date = '';
        } else if (value === 'Partially Paid') {
          const currentVal = parseFloat(prev.received_payment || 0);
          const leadVal = parseFloat(finalizeLead.value || 0);
          if (currentVal <= 0 || currentVal >= leadVal) {
            updated.received_payment = leadVal / 2;
          }
          if (!updated.payment_date) {
            updated.payment_date = new Date().toISOString().split('T')[0];
          }
        }
      }
      
      // Auto-rules based on sales_status changes
      if (field === 'sales_status') {
        if (value === 'Not Done') {
          updated.payment_status = 'Unpaid';
          updated.received_payment = 0;
          updated.payment_method = '';
          updated.transaction_reference = '';
          updated.payment_date = '';
        } else if (value === 'Sales Done') {
          if (prev.payment_status === 'Unpaid') {
            updated.payment_status = 'Fully Paid';
            updated.received_payment = parseFloat(finalizeLead.value || 0);
            if (!updated.payment_date) {
              updated.payment_date = new Date().toISOString().split('T')[0];
            }
          }
        }
      }
      
      return updated;
    });
  };

  const handleFinalizeSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    const dealValue = parseFloat(finalizeLead.value || 0);
    const receivedPayment = parseFloat(finalizeForm.received_payment || 0);
    
    // Check received payment limits
    if (isNaN(receivedPayment) || receivedPayment < 0) {
      errors.received_payment = 'Received payment must be a valid non-negative number';
    } else if (receivedPayment > dealValue) {
      errors.received_payment = `Received payment cannot exceed the deal value of ${currencySymbol}${dealValue}`;
    }
    
    // Validate matching payment status
    if (finalizeForm.payment_status === 'Fully Paid' && receivedPayment !== dealValue) {
      errors.received_payment = `For Fully Paid status, received payment must equal the deal value of ${currencySymbol}${dealValue}`;
    } else if (finalizeForm.payment_status === 'Unpaid' && receivedPayment !== 0) {
      errors.received_payment = 'For Unpaid status, received payment must be 0';
    } else if (finalizeForm.payment_status === 'Partially Paid' && (receivedPayment <= 0 || receivedPayment >= dealValue)) {
      errors.received_payment = `For Partially Paid status, received payment must be between 0 and the deal value of ${currencySymbol}${dealValue}`;
    }
    
    // Validate details if payment is received
    if (finalizeForm.payment_status !== 'Unpaid') {
      if (!finalizeForm.payment_method) {
        errors.payment_method = 'Payment method is required';
      }
      if (!finalizeForm.transaction_reference || !finalizeForm.transaction_reference.trim()) {
        errors.transaction_reference = 'Transaction reference/ID is required';
      }
      if (!finalizeForm.payment_date) {
        errors.payment_date = 'Payment date is required';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFinalizeErrors(errors);
      toast.warning('Please fix the validation errors in the form.');
      return;
    }
    
    setSavingFinalize(true);
    
    const apiData = {
      id: finalizeLead.id,
      sales_status: finalizeForm.sales_status,
      payment_status: finalizeForm.payment_status,
      received_payment: receivedPayment,
      payment_method: finalizeForm.payment_status === 'Unpaid' ? null : finalizeForm.payment_method,
      transaction_reference: finalizeForm.payment_status === 'Unpaid' ? null : finalizeForm.transaction_reference,
      payment_date: finalizeForm.payment_status === 'Unpaid' ? null : finalizeForm.payment_date,
      finalization_remarks: finalizeForm.finalization_remarks || null
    };
    
    fetch(`${apiBaseUrl}/leads`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let logDetails = `Sale finalization updated. Status: ${finalizeForm.sales_status}. Payment Status: ${finalizeForm.payment_status}.`;
        if (finalizeForm.payment_status !== 'Unpaid') {
          logDetails += ` Amount Collected: ${currencySymbol}${receivedPayment} via ${finalizeForm.payment_method} (Ref: ${finalizeForm.transaction_reference}).`;
        }
        if (finalizeForm.finalization_remarks) {
          logDetails += ` Remarks: ${finalizeForm.finalization_remarks}`;
        }
        
        const logData = {
          lead_id: finalizeLead.id,
          agent_name: activeRole === 'Sales Associate' ? activeAgent : 'Admin',
          activity_type: 'Note',
          details: logDetails
        };
        
        return fetch(`${apiBaseUrl}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData)
        })
        .then(res => res.json())
        .then(() => {
          toast.success('Sale finalization and payment updated successfully.');
          setIsFinalizeModalOpen(false);
          fetchLeads();
          setSelectedLogLead(prev => {
            if (prev && prev.id === finalizeLead.id) {
              return { 
                ...prev, 
                sales_status: finalizeForm.sales_status,
                payment_status: finalizeForm.payment_status,
                received_payment: receivedPayment,
                payment_method: apiData.payment_method,
                transaction_reference: apiData.transaction_reference,
                payment_date: apiData.payment_date,
                finalization_remarks: apiData.finalization_remarks
              };
            }
            return prev;
          });
        });
      } else {
        toast.error(data.error || 'Failed to update finalization details.');
      }
    })
    .catch(err => {
      console.error('Error finalising sale:', err);
      toast.error('Network error finalising sale.');
    })
    .finally(() => {
      setSavingFinalize(false);
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
  const cashCollected = filteredSales.reduce((acc, curr) => acc + parseFloat(curr.received_payment || 0), 0);
  const outstandingBalance = totalRevenue - cashCollected;
  const salesDoneCount = filteredSales.filter(l => l.sales_status === 'Sales Done').length;

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

          {/* Cash Collected */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Payments Received</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {currencySymbol}{cashCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-orange)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Outstanding Balance</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {currencySymbol}{outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Completed Sales */}
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12.5px', fontWeight: 500 }}>Completed Sales</div>
              <div style={{ color: 'var(--text-white)', fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                {salesDoneCount} {salesDoneCount === 1 ? 'Deal' : 'Deals'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{filteredSales.length} total conversions</div>
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
                  <th>Deal Value</th>
                  <th>Payment Status</th>
                  <th>Collected</th>
                  {activeRole !== 'Sales Associate' && <th>Assigned Agent</th>}
                  <th>Sales Status</th>
                  <th>Remarks / Delivery Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((lead) => (
                    <tr 
                      key={lead.id} 
                      onClick={() => openLeadLog(lead)} 
                      style={{ 
                        cursor: 'pointer',
                        background: lead.sales_status === 'Sales Done'
                          ? 'rgba(16, 185, 129, 0.05)'
                          : lead.sales_status === 'Not Done'
                          ? 'rgba(239, 68, 68, 0.05)'
                          : 'rgba(249, 115, 22, 0.05)'
                      }}
                    >
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
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {currencySymbol}{parseFloat(lead.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          lead.payment_status === 'Fully Paid' 
                            ? 'status-won' 
                            : lead.payment_status === 'Partially Paid' 
                            ? 'status-contacted'
                            : 'status-lost'
                        }`} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {lead.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                        {currencySymbol}{parseFloat(lead.received_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '11px' }}> / {currencySymbol}{parseFloat(lead.value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </td>
                      {activeRole !== 'Sales Associate' && (
                        <td style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {lead.agent || 'Unassigned'}
                        </td>
                      )}
                      <td>
                        <span className={`status-badge ${
                          lead.sales_status === 'Sales Done' 
                            ? 'status-won' 
                            : lead.sales_status === 'Not Done' 
                            ? 'status-lost' 
                            : 'status-contacted'
                        }`} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {lead.sales_status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div 
                          style={{ 
                            maxWidth: '180px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            color: lead.finalization_remarks ? 'var(--text-secondary)' : 'var(--text-muted)',
                            fontStyle: lead.finalization_remarks ? 'normal' : 'italic',
                            fontSize: '12px'
                          }}
                          title={lead.finalization_remarks || lead.remarks || ''}
                        >
                          {lead.finalization_remarks || lead.remarks || 'No remarks'}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons-cell" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="delegate-link"
                            onClick={() => openLeadLog(lead)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)' }}
                          >
                            <MessageSquare size={13} /> Logs
                          </button>
                          <button 
                            className="delegate-link"
                            disabled={lead.sales_status === 'Sales Done' && activeRole === 'Sales Associate'}
                            onClick={() => openFinalizeModal(lead)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              color: (lead.sales_status === 'Sales Done' && activeRole === 'Sales Associate') ? 'var(--text-muted)' : 'var(--accent-green)',
                              cursor: (lead.sales_status === 'Sales Done' && activeRole === 'Sales Associate') ? 'not-allowed' : 'pointer',
                              opacity: (lead.sales_status === 'Sales Done' && activeRole === 'Sales Associate') ? 0.6 : 1
                            }}
                          >
                            <Award size={13} /> {lead.sales_status === 'Sales Done' && activeRole === 'Sales Associate' ? 'Locked' : 'Finalize'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeRole === 'Sales Associate' ? '9' : '10'} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Revenue Value: </span>
              <strong style={{ color: 'var(--accent-green)', fontSize: '13px' }}>{currencySymbol}{parseFloat(selectedLogLead.value || 0).toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Lead Status: </span>
              <span className="status-badge status-won" style={{ padding: '1px 8px', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={10} /> Converted
              </span>
            </div>
            
            <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sales & Payment Details</span>
                {(!(selectedLogLead.sales_status === 'Sales Done' && activeRole === 'Sales Associate')) ? (
                  <button 
                    type="button" 
                    onClick={() => openFinalizeModal(selectedLogLead)}
                    className="delegate-link"
                    style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}
                  >
                    Edit Details
                  </button>
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={10} /> Locked
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sales Status: </span>
                  <span className={`status-badge ${
                    selectedLogLead.sales_status === 'Sales Done' 
                      ? 'status-won' 
                      : selectedLogLead.sales_status === 'Not Done' 
                      ? 'status-lost' 
                      : 'status-contacted'
                  }`} style={{ padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>
                    {selectedLogLead.sales_status || 'Pending'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Payment: </span>
                  <span className={`status-badge ${
                    selectedLogLead.payment_status === 'Fully Paid' 
                      ? 'status-won' 
                      : selectedLogLead.payment_status === 'Partially Paid' 
                      ? 'status-contacted' 
                      : 'status-lost'
                  }`} style={{ padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>
                    {selectedLogLead.payment_status || 'Unpaid'}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Collected: </span>
                  <strong style={{ color: 'var(--accent-green)' }}>{currencySymbol}{parseFloat(selectedLogLead.received_payment || 0).toLocaleString()}</strong>
                  <span style={{ color: 'var(--text-muted)' }}> / {currencySymbol}{parseFloat(selectedLogLead.value || 0).toLocaleString()}</span>
                </div>
                {selectedLogLead.payment_status && selectedLogLead.payment_status !== 'Unpaid' && (
                  <>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Method: </span>
                      {selectedLogLead.payment_method || 'N/A'}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Ref: </span>
                      {selectedLogLead.transaction_reference || 'N/A'}
                    </div>
                    {selectedLogLead.payment_date && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Paid Date: </span>
                        {selectedLogLead.payment_date}
                      </div>
                    )}
                  </>
                )}
                {selectedLogLead.finalization_remarks && (
                  <div style={{ gridColumn: 'span 2', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px dashed var(--border)', paddingTop: '4px' }}>
                    Remarks: {selectedLogLead.finalization_remarks}
                  </div>
                )}
              </div>
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

      {isFinalizeModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsFinalizeModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%' }}>
            <div className="modal-header">
              <h3>Finalize Sale & Payments</h3>
              <button className="modal-close-btn" onClick={() => setIsFinalizeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFinalizeSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Client / Deal Reference</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '14.5px' }}>{finalizeLead?.name}</strong>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '14.5px' }}>
                      Deal Value: {currencySymbol}{parseFloat(finalizeLead?.value || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Sales Status <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={finalizeForm.sales_status}
                      onChange={(e) => handleFinalizeFormChange('sales_status', e.target.value)}
                      style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 8px' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Sales Done">Sales Done</option>
                      <option value="Not Done">Not Done</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Payment Status <span style={{ color: 'red' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={finalizeForm.payment_status}
                      onChange={(e) => handleFinalizeFormChange('payment_status', e.target.value)}
                      style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 8px' }}
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Fully Paid">Fully Paid</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Received Payment Amount ({currencySymbol}) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={finalizeForm.payment_status === 'Unpaid' || finalizeForm.payment_status === 'Fully Paid'}
                    className="form-control"
                    value={finalizeForm.received_payment}
                    onChange={(e) => handleFinalizeFormChange('received_payment', e.target.value)}
                    style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 10px' }}
                  />
                  {finalizeErrors.received_payment && (
                    <span style={{ color: 'var(--accent-orange)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {finalizeErrors.received_payment}
                    </span>
                  )}
                  {(finalizeForm.payment_status === 'Fully Paid' || finalizeForm.payment_status === 'Unpaid') && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block', fontStyle: 'italic' }}>
                      Amount is auto-locked based on payment status.
                    </span>
                  )}
                </div>

                {finalizeForm.payment_status !== 'Unpaid' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Payment Method <span style={{ color: 'red' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={finalizeForm.payment_method}
                          onChange={(e) => handleFinalizeFormChange('payment_method', e.target.value)}
                          style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 8px' }}
                        >
                          <option value="">Select Method</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="UPI / QR Code">UPI / QR Code</option>
                          <option value="Credit/Debit Card">Credit/Debit Card</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                        {finalizeErrors.payment_method && (
                          <span style={{ color: 'var(--accent-orange)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            {finalizeErrors.payment_method}
                          </span>
                        )}
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Payment Date <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={finalizeForm.payment_date}
                          onChange={(e) => handleFinalizeFormChange('payment_date', e.target.value)}
                          style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 10px' }}
                        />
                        {finalizeErrors.payment_date && (
                          <span style={{ color: 'var(--accent-orange)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            {finalizeErrors.payment_date}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Transaction Reference / UTR ID / Cheque No. <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR123456789, CHQ-998822"
                        className="form-control"
                        value={finalizeForm.transaction_reference}
                        onChange={(e) => handleFinalizeFormChange('transaction_reference', e.target.value)}
                        style={{ width: '100%', height: '36px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '0 10px' }}
                      />
                      {finalizeErrors.transaction_reference && (
                        <span style={{ color: 'var(--accent-orange)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                          {finalizeErrors.transaction_reference}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Remarks & Delivery Notes
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Enter special delivery instructions or remarks..."
                    className="form-control"
                    value={finalizeForm.finalization_remarks}
                    onChange={(e) => handleFinalizeFormChange('finalization_remarks', e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 10px', resize: 'vertical' }}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setIsFinalizeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={savingFinalize}>
                  {savingFinalize ? 'Saving Details...' : 'Save Finalization'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Sales;
