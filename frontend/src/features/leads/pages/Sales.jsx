import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, MessageSquare, Clock, X, IndianRupee, TrendingUp, CheckCircle2, Award, Lock, Trash2, PlusCircle } from 'lucide-react';
import { apiBaseUrl } from '../../../utils/env.js';
import { useCRM } from '../context/CRMContext';

const Sales = () => {
  const { toast, confirm, currencySymbol, activeRole, activeAgent, tenantId } = useCRM();
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  const [savingFinalize, setSavingFinalize] = useState(false);

  // Payments tracking states
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_method: '',
    transaction_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [paymentErrors, setPaymentErrors] = useState({});

  // Fetch leads from backend
  const fetchLeads = useCallback(() => {
    // tenantId from useCRM hook
    
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
      });
  }, [tenantId, activeRole, activeAgent]);

  useEffect(() => {
    fetchLeads();
    setSelectedLogLead(null); // Close log drawer on role/agent switch
  }, [fetchLeads]);

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
      agent_name: activeRole === 'Sales Associate' ? activeAgent : 'Admin',
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
    setNewPayment({
      amount: '',
      payment_method: '',
      transaction_reference: '',
      payment_date: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setPaymentErrors({});
    setIsFinalizeModalOpen(true);
    fetchPayments(lead.id);
  };

  const fetchPayments = (leadId) => {
    setLoadingPayments(true);
    fetch(`${apiBaseUrl}/payments?lead_id=${leadId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setPayments(data.data);
        }
      })
      .catch((err) => {
        console.warn('Error fetching payments:', err);
      })
      .finally(() => {
        setLoadingPayments(false);
      });
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const errors = {};
    const amountVal = parseFloat(newPayment.amount);
    const dealValue = parseFloat(finalizeLead.value || 0);
    const currentPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const outstanding = dealValue - currentPaid;

    if (isNaN(amountVal) || amountVal <= 0) {
      errors.amount = 'Amount must be a positive number';
    } else if (amountVal > outstanding + 0.01) {
      errors.amount = `Amount cannot exceed outstanding balance of ${currencySymbol}${outstanding.toFixed(2)}`;
    }

    if (!newPayment.payment_method) {
      errors.payment_method = 'Payment method is required';
    }
    if (!newPayment.transaction_reference || !newPayment.transaction_reference.trim()) {
      errors.transaction_reference = 'Transaction reference is required';
    }
    if (!newPayment.payment_date) {
      errors.payment_date = 'Payment date is required';
    }

    if (Object.keys(errors).length > 0) {
      setPaymentErrors(errors);
      return;
    }

    // Capture Confirmation Step
    const confirmMessage = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>Please review and confirm the payment details to be captured:</p>
        <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', marginTop: '4px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span> <strong style={{ color: 'var(--accent-green)' }}>{currencySymbol}{amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Method:</span> <strong style={{ color: 'var(--text-white)' }}>{newPayment.payment_method}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Reference/UTR:</span> <strong style={{ color: 'var(--text-white)' }}>{newPayment.transaction_reference}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> <strong style={{ color: 'var(--text-white)' }}>{newPayment.payment_date}</strong></div>
          {newPayment.remarks && <div><span style={{ color: 'var(--text-muted)' }}>Remarks:</span> <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{newPayment.remarks}"</span></div>}
        </div>
      </div>
    );

    const isConfirmed = await confirm(confirmMessage, 'Capture Payment Installment');
    if (!isConfirmed) {
      return;
    }

    setSavingFinalize(true);

    const apiData = {
      lead_id: finalizeLead.id,
      amount: amountVal,
      payment_method: newPayment.payment_method,
      transaction_reference: newPayment.transaction_reference,
      payment_date: newPayment.payment_date,
      remarks: newPayment.remarks,
      agent_name: activeRole === 'Sales Associate' ? activeAgent : 'Admin',
      currency_symbol: currencySymbol
    };

    fetch(`${apiBaseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Payment recorded successfully.');
          
          setNewPayment({
            amount: '',
            payment_method: '',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            remarks: ''
          });
          setPaymentErrors({});

          fetchLeads();
          fetchPayments(finalizeLead.id);

          setFinalizeLead(prev => ({
            ...prev,
            received_payment: data.total_paid,
            payment_status: data.payment_status
          }));
        } else {
          toast.error(data.error || 'Failed to save payment.');
        }
      })
      .catch(err => {
        console.error('Error saving payment:', err);
        toast.error('Network error saving payment.');
      })
      .finally(() => {
        setSavingFinalize(false);
      });
  };

  const handleDeletePayment = (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will adjust the outstanding balance and payment status.')) {
      return;
    }

    setSavingFinalize(true);
    fetch(`${apiBaseUrl}/payments?id=${paymentId}&agent_name=${activeRole === 'Sales Associate' ? activeAgent : 'Admin'}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Payment deleted successfully.');
          fetchLeads();
          fetchPayments(finalizeLead.id);
          setFinalizeLead(prev => ({
            ...prev,
            received_payment: data.total_paid,
            payment_status: data.payment_status
          }));
        } else {
          toast.error(data.error || 'Failed to delete payment.');
        }
      })
      .catch(err => {
        console.error('Error deleting payment:', err);
        toast.error('Network error deleting payment.');
      })
      .finally(() => {
        setSavingFinalize(false);
      });
  };

  const handleFinalizeSubmit = async (e) => {
    e.preventDefault();

    // Capture Confirmation Step
    const confirmMessage = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ margin: 0, fontWeight: 500 }}>Please review and confirm the deal execution details to be captured:</p>
        <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', marginTop: '4px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Sales Status:</span> <strong style={{ color: 'var(--text-white)' }}>{finalizeForm.sales_status}</strong></div>
          {finalizeForm.finalization_remarks && <div><span style={{ color: 'var(--text-muted)' }}>Remarks & Delivery Notes:</span> <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{finalizeForm.finalization_remarks}"</span></div>}
        </div>
      </div>
    );

    const isConfirmed = await confirm(confirmMessage, 'Capture Sales Status & Remarks');
    if (!isConfirmed) {
      return;
    }

    setSavingFinalize(true);
    
    const apiData = {
      id: finalizeLead.id,
      sales_status: finalizeForm.sales_status,
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
        toast.success('Sales status and remarks updated successfully.');
        setIsFinalizeModalOpen(false);
        fetchLeads();
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
                            onClick={() => openLogModal(lead)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-orange)' }}
                          >
                            <PlusCircle size={13} /> Log Action
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
      {selectedLogLead && createPortal(
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedLogLead(null)}
          style={{
            justifyContent: 'flex-end',
            alignItems: 'stretch',
            padding: 0,
            zIndex: 1001
          }}
        >
          <div 
            className="chart-card sales-drawer" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '560px', 
              height: '100vh',
              boxSizing: 'border-box',
              background: 'var(--bg-card)',
              display: 'flex', 
              flexDirection: 'column', 
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              borderLeft: '1px solid var(--border-light)',
              borderRadius: 0,
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
              padding: '24px',
              maxHeight: '100vh',
              overflow: 'hidden',
              position: 'relative'
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
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
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
        </div>,
        document.body
      )}

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


      {isFinalizeModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsFinalizeModalOpen(false)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()} style={{ width: '90%' }}>
            <div className="modal-header">
              <h3>Finalize Sale & Payments: {finalizeLead?.name}</h3>
              <button className="modal-close-btn" onClick={() => setIsFinalizeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(90vh - 120px)' }}>
              
              {/* TOP SUMMARY CARD */}
              {finalizeLead && (() => {
                const dealValue = parseFloat(finalizeLead.value || 0);
                const collected = parseFloat(finalizeLead.received_payment || 0);
                const outstanding = dealValue - collected;
                const percentPaid = dealValue > 0 ? Math.min(100, Math.max(0, (collected / dealValue) * 100)) : 0;
                
                return (
                  <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Deal Value</span>
                        <strong style={{ fontSize: '16px', color: 'var(--text-white)' }}>{currencySymbol}{dealValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid So Far</span>
                        <strong style={{ fontSize: '16px', color: 'var(--accent-green)' }}>{currencySymbol}{collected.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding Balance</span>
                        <strong style={{ fontSize: '16px', color: outstanding > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                          {currencySymbol}{Math.max(0, outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Payment Status</span>
                        <span className={`status-badge ${
                          finalizeLead.payment_status === 'Fully Paid' 
                            ? 'status-won' 
                            : finalizeLead.payment_status === 'Partially Paid' 
                            ? 'status-contacted'
                            : 'status-lost'
                        }`} style={{ display: 'inline-block', marginTop: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {finalizeLead.payment_status || 'Unpaid'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>Collection Progress</span>
                        <span>{percentPaid.toFixed(1)}% Collected</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentPaid}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TWO-COLUMN GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', flex: 1, minHeight: 0 }}>
                
                {/* LEFT COLUMN: Status and General Remarks */}
                <form onSubmit={handleFinalizeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      Deal Execution & Status
                    </h4>
                    
                    <div className="form-group">
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Sales Status <span style={{ color: 'red' }}>*</span>
                      </label>
                      <select
                        className="form-control"
                        value={finalizeForm.sales_status}
                        onChange={(e) => setFinalizeForm(prev => ({ ...prev, sales_status: e.target.value }))}
                        style={{ width: '100%', height: '38px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '0 8px' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Sales Done">Sales Done</option>
                        <option value="Not Done">Not Done</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Remarks & Delivery Notes
                      </label>
                      <textarea
                        placeholder="Enter delivery notes, SLA parameters, or closing remarks..."
                        className="form-control"
                        value={finalizeForm.finalization_remarks}
                        onChange={(e) => setFinalizeForm(prev => ({ ...prev, finalization_remarks: e.target.value }))}
                        style={{ width: '100%', flex: 1, minHeight: '120px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '8px 10px', resize: 'vertical' }}
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="modal-btn primary" 
                      disabled={savingFinalize}
                      style={{ justifyContent: 'center', width: '100%' }}
                    >
                      {savingFinalize ? 'Saving Details...' : 'Save Sales Status & Remarks'}
                    </button>
                  </div>
                </form>

                {/* RIGHT COLUMN: Payments History and New Installment Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                  
                  {/* Payment History Feed */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      Installments / Payments Log
                    </h4>
                    
                    {loadingPayments ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>Loading payments...</div>
                    ) : payments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {payments.map((p) => (
                          <div 
                            key={p.id} 
                            style={{ 
                              padding: '10px', 
                              background: 'var(--bg-hover)', 
                              borderRadius: 'var(--radius-md)', 
                              border: '1px solid var(--border)', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: 'var(--accent-green)', fontSize: '13px' }}>
                                  {currencySymbol}{parseFloat(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </strong>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                                  {p.payment_method}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                Ref: {p.transaction_reference} | Date: {p.payment_date}
                              </div>
                              {p.remarks && (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontStyle: 'italic', marginTop: '2px' }}>
                                  "{p.remarks}"
                                </div>
                              )}
                            </div>
                            
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--accent-red)', 
                                cursor: 'pointer', 
                                padding: '4px', 
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                              title="Delete payment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                        No payments recorded yet.
                      </div>
                    )}
                  </div>

                  {/* Add Installment Form */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Record Installment / Payment</span>
                      {finalizeLead && (() => {
                        const dealValue = parseFloat(finalizeLead.value || 0);
                        const collected = parseFloat(finalizeLead.received_payment || 0);
                        const outstanding = dealValue - collected;
                        if (outstanding > 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => setNewPayment(prev => ({ ...prev, amount: outstanding.toFixed(2) }))}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--accent-cyan)', 
                                fontSize: '11px', 
                                cursor: 'pointer', 
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}
                            >
                              Pay Outstanding Balance ({currencySymbol}{outstanding.toFixed(0)})
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </h4>

                    {finalizeLead && (parseFloat(finalizeLead.value || 0) - parseFloat(finalizeLead.received_payment || 0)) <= 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', padding: '16px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', fontSize: '13px', justifyContent: 'center' }}>
                        <CheckCircle2 size={18} />
                        <span>Deal is fully paid. No outstanding balance.</span>
                      </div>
                    ) : (
                      <form onSubmit={handleAddPayment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Amount ({currencySymbol}) <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="e.g. 5000"
                              className="form-control"
                              value={newPayment.amount}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                              style={{ height: '34px', fontSize: '12.5px', padding: '0 8px' }}
                            />
                            {paymentErrors.amount && (
                              <span style={{ color: 'var(--accent-orange)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                                {paymentErrors.amount}
                              </span>
                            )}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Payment Method <span style={{ color: 'red' }}>*</span>
                            </label>
                            <select
                              className="form-control"
                              value={newPayment.payment_method}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, payment_method: e.target.value }))}
                              style={{ height: '34px', fontSize: '12.5px', padding: '0 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', width: '100%' }}
                            >
                              <option value="">Select Method</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="UPI / QR Code">UPI / QR Code</option>
                              <option value="Credit/Debit Card">Credit/Debit Card</option>
                              <option value="Cash">Cash</option>
                              <option value="Cheque">Cheque</option>
                              <option value="Other">Other</option>
                            </select>
                            {paymentErrors.payment_method && (
                              <span style={{ color: 'var(--accent-orange)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                                {paymentErrors.payment_method}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Payment Date <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                              type="date"
                              className="form-control"
                              value={newPayment.payment_date}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, payment_date: e.target.value }))}
                              style={{ height: '34px', fontSize: '12.5px', padding: '0 8px' }}
                            />
                            {paymentErrors.payment_date && (
                              <span style={{ color: 'var(--accent-orange)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                                {paymentErrors.payment_date}
                              </span>
                            )}
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Reference / UTR ID <span style={{ color: 'red' }}>*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. UTR123456"
                              className="form-control"
                              value={newPayment.transaction_reference}
                              onChange={(e) => setNewPayment(prev => ({ ...prev, transaction_reference: e.target.value }))}
                              style={{ height: '34px', fontSize: '12.5px', padding: '0 8px' }}
                            />
                            {paymentErrors.transaction_reference && (
                              <span style={{ color: 'var(--accent-orange)', fontSize: '10px', marginTop: '2px', display: 'block' }}>
                                {paymentErrors.transaction_reference}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            Remarks
                          </label>
                          <input
                            type="text"
                            placeholder="Installment notes e.g. 1st installment"
                            className="form-control"
                            value={newPayment.remarks}
                            onChange={(e) => setNewPayment(prev => ({ ...prev, remarks: e.target.value }))}
                            style={{ height: '34px', fontSize: '12.5px', padding: '0 8px' }}
                          />
                        </div>

                        <button 
                          type="submit" 
                          className="modal-btn primary" 
                          disabled={savingFinalize}
                          style={{ justifyContent: 'center', height: '34px', fontSize: '12px', marginTop: '6px' }}
                        >
                          <PlusCircle size={14} /> Record Installment Payment
                        </button>
                      </form>
                    )}
                  </div>
                </div>

              </div>

            </div>
            
            <div className="modal-footer">
              <button type="button" className="modal-btn secondary" onClick={() => setIsFinalizeModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Sales;
