import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../context/AccountingContext';
import { useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Trash2, Eye, Receipt, Printer, Landmark, Check, AlertTriangle, X } from 'lucide-react';

const Invoices = () => {
  const { tenantId, currencySymbol, toast } = useAccounting();
  const confirm = useConfirm();

  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // View / Print Modal
  const [viewInvoice, setViewInvoice] = useState(null);
  const [showPrintDrawer, setShowPrintDrawer] = useState(false);

  // Add Invoice Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState([
    { description: '', quantity: 1, unit_price: '', product_id: '' }
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const fetchInvoices = (pageNum = page, search = searchQuery, status = statusFilter) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/accounting/invoices?tenant_id=${tenantId}&page=${pageNum}&limit=10&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setInvoices(res.data || []);
          if (res.pagination) {
            setPage(res.pagination.page || 1);
            setTotalPages(res.pagination.total_pages || 1);
          }
        } else {
          toast.showError(res.error || "Failed to load invoices.");
        }
      })
      .catch(err => console.error("Error loading invoices:", err))
      .finally(() => setLoading(false));
  };

  const fetchProducts = () => {
    fetch(`${apiBaseUrl}/inventory/products?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setProducts(res.data || []);
        }
      })
      .catch(err => console.warn("Failed to prefetch inventory products for catalog mapping:", err));
  };

  const fetchCustomersAndSalesOrders = () => {
    fetch(`${apiBaseUrl}/leads/leads?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setCustomers(res.data || []);
      })
      .catch(err => console.warn("Failed to fetch leads for customer mapping:", err));

    fetch(`${apiBaseUrl}/inventory/sales-orders?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setSalesOrders(res.data || []);
      })
      .catch(err => console.warn("Failed to fetch sales orders:", err));
  };

  const handleSelectSalesOrder = (soId) => {
    setSelectedSalesOrderId(soId);
    if (!soId) return;

    fetch(`${apiBaseUrl}/inventory/sales-orders?id=${soId}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const so = res.data;
          setCustomerName(so.customer_name);
          if (so.items && so.items.length > 0) {
            setInvoiceItems(so.items.map(it => ({
              description: it.product_name || it.description || 'Sales Order Item',
              quantity: parseInt(it.quantity) || 1,
              unit_price: parseFloat(it.unit_price) || 0.00,
              product_id: it.product_id ? it.product_id.toString() : ''
            })));
          }
          toast.showSuccess(`Loaded details and ${so.items?.length || 0} line items from Sales Order!`);
        } else {
          toast.showError("Failed to load Sales Order items.");
        }
      })
      .catch(err => {
        console.error("Error loading sales order details:", err);
        toast.showError("Network error while importing Sales Order.");
      });
  };

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setStatusFilter('');
    fetchInvoices(1, '', '');
    fetchProducts();
    fetchCustomersAndSalesOrders();
    setSelectedSalesOrderId('');
    // Auto-generate invoice number based on date/random to make it easy
    setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
  }, [tenantId]);

  // Load invoice details for print/preview
  const handleOpenPreview = (inv) => {
    fetch(`${apiBaseUrl}/accounting/invoices?id=${inv.id}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setViewInvoice(res.data);
          setShowPrintDrawer(true);
        } else {
          toast.showError(res.error || "Failed to load invoice items.");
        }
      })
      .catch(err => console.error("Error loading preview:", err));
  };

  const handleUpdateStatus = async (inv, newStatus) => {
    if (newStatus === 'Open') {
      const ok = await confirm(`Are you sure you want to approve Invoice ${inv.invoice_number}? This will generate automated double-entry journal postings.`, "Approve Invoice");
      if (!ok) return;
    }

    fetch(`${apiBaseUrl}/accounting/invoices?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: inv.id, status: newStatus })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Invoice status updated to ${newStatus}.`);
          fetchInvoices();
        } else {
          toast.showError(res.error || "Failed to update invoice status.");
        }
      })
      .catch(err => console.error("Error updating status:", err));
  };

  const handleDeleteInvoice = async (inv) => {
    const ok = await confirm(`Are you sure you want to delete invoice ${inv.invoice_number}? Only Draft invoices can be permanently deleted.`, "Delete Draft Invoice");
    if (!ok) return;

    fetch(`${apiBaseUrl}/accounting/invoices?id=${inv.id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Invoice deleted.");
          fetchInvoices();
        } else {
          toast.showError(res.error || "Failed to delete invoice.");
        }
      })
      .catch(err => console.error("Error deleting invoice:", err));
  };

  // Add Row in Creator
  const handleAddLineItem = () => {
    setInvoiceItems(prev => [...prev, { description: '', quantity: 1, unit_price: '', product_id: '' }]);
  };

  const handleRemoveLineItem = (index) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLineItemChange = (index, field, value) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;

      // If product selection changes, automatically fill description and unit_price
      if (field === 'product_id' && value !== '') {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod) {
          updated[index]['description'] = prod.name;
          updated[index]['unit_price'] = prod.selling_price || prod.price || '0.00';
        }
      }
      return updated;
    });
  };

  // Calculate invoice creator totals
  const invoiceTotal = invoiceItems.reduce((sum, item) => sum + ((parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)), 0);

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    if (!invoiceNumber || !customerName || invoiceItems.length === 0) {
      toast.showError("Invoice number, Customer name and line items are required.");
      return;
    }

    const subtotal = invoiceItems.reduce((sum, item) => sum + ((parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0)), 0);
    const taxRateVal = parseFloat(taxRate) || 0;
    const taxAmount = Math.round(subtotal * (taxRateVal / 100) * 100) / 100;

    const payload = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      issue_date: issueDate,
      due_date: dueDate,
      tax_rate: taxRateVal,
      tax_amount: taxAmount,
      sales_order_id: selectedSalesOrderId ? parseInt(selectedSalesOrderId) : null,
      items: invoiceItems.map(it => ({
        description: it.description || 'Consulting Services',
        quantity: parseInt(it.quantity) || 1,
        unit_price: parseFloat(it.unit_price) || 0.00,
        product_id: it.product_id ? parseInt(it.product_id) : null
      }))
    };

    fetch(`${apiBaseUrl}/accounting/invoices?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Invoice created successfully as Draft!");
          setShowAddModal(false);
          setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
          setCustomerName('');
          setSelectedSalesOrderId('');
          setInvoiceItems([{ description: '', quantity: 1, unit_price: '', product_id: '' }]);
          setTaxRate(0);
          fetchInvoices();
        } else {
          toast.showError(res.error || "Failed to create invoice.");
        }
      })
      .catch(err => {
        console.error("Error creating invoice:", err);
        toast.showError("Network error while creating invoice.");
      });
  };

  // Payment Recording
  const handleOpenPaymentModal = (inv) => {
    setPaymentTarget(inv);
    setPaymentAmount(inv.amount_due);
    setPaymentRef(`REC-${inv.invoice_number}`);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.showError("Please enter a valid payment amount.");
      return;
    }

    const payload = {
      payment_date: paymentDate,
      payment_method: paymentMethod,
      type: 'Receipt', // Inward payment for customer invoice
      amount: parseFloat(paymentAmount),
      reference: paymentRef,
      invoice_id: paymentTarget.id
    };

    fetch(`${apiBaseUrl}/accounting/transactions?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Payment of ${currencySymbol}${paymentAmount} recorded and matched to Invoice ${paymentTarget.invoice_number}!`);
          setShowPaymentModal(false);
          setPaymentTarget(null);
          setPaymentAmount('');
          setPaymentRef('');
          fetchInvoices();
        } else {
          toast.showError(res.error || "Failed to record payment.");
        }
      })
      .catch(err => {
        console.error("Error recording payment:", err);
        toast.showError("Network error while logging invoice payment.");
      });
  };

  if (loading && invoices.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading Customer Invoices...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Issue invoices to customers, record receipt offsets and audit ledger balances.
          </p>
        </div>
        
        <button 
          className="add-lead-btn"
          onClick={() => {
            setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
            setTaxRate(0);
            setShowAddModal(true);
          }}
          style={{ gap: '8px' }}
        >
          <Receipt size={16} />
          Create Invoice
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by customer or invoice #..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchInvoices(1, searchQuery, statusFilter);
              }
            }}
            style={{ fontSize: '13px', height: '36px' }}
          />
          <button 
            className="modal-btn primary" 
            onClick={() => {
              setPage(1);
              fetchInvoices(1, searchQuery, statusFilter);
            }}
            style={{ height: '36px', padding: '0 16px', minHeight: 0 }}
          >
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Status:</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={e => {
              const val = e.target.value;
              setStatusFilter(val);
              setPage(1);
              fetchInvoices(1, searchQuery, val);
            }}
            style={{ fontSize: '13px', height: '36px', padding: '0 12px', width: '130px' }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Void">Void</option>
          </select>

          {(searchQuery || statusFilter) && (
            <button
              className="modal-btn secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPage(1);
                fetchInvoices(1, '', '');
              }}
              style={{ height: '36px', padding: '0 12px', minHeight: 0 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer Name</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'right' }}>Amount Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No customer invoices recorded. Click 'Generate Invoice' to register a bill.
                </td>
              </tr>
            ) : invoices.map((inv) => {
              let statusColor = 'var(--text-muted)';
              let statusBg = 'rgba(255,255,255,0.05)';
              if (inv.status === 'Draft') { statusColor = 'var(--accent-yellow)'; statusBg = 'rgba(245, 158, 11, 0.1)'; }
              if (inv.status === 'Open') { statusColor = 'var(--accent-cyan)'; statusBg = 'rgba(34, 211, 238, 0.1)'; }
              if (inv.status === 'Paid') { statusColor = 'var(--accent-green)'; statusBg = 'rgba(16, 185, 129, 0.1)'; }
              if (inv.status === 'Overdue') { statusColor = 'var(--accent-red)'; statusBg = 'rgba(239, 68, 68, 0.1)'; }
              if (inv.status === 'Void') { statusColor = 'var(--text-muted)'; statusBg = 'rgba(255,255,255,0.02)'; }

              return (
                <tr key={inv.id}>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-white)' }}>{inv.invoice_number}</td>
                  <td style={{ fontSize: '13.5px' }}>{inv.customer_name}</td>
                  <td style={{ fontSize: '12.5px' }}>{inv.issue_date}</td>
                  <td style={{ fontSize: '12.5px' }}>{inv.due_date}</td>
                  <td style={{ fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>
                    {currencySymbol}{parseFloat(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, textAlign: 'right', color: parseFloat(inv.amount_due) > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                    {currencySymbol}{parseFloat(inv.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusColor}33`
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleOpenPreview(inv)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        title="Preview & Print"
                      >
                        <Eye size={15} />
                      </button>

                      {inv.status === 'Draft' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(inv, 'Open')}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Approve / Open Invoice"
                          >
                            <Check size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteInvoice(inv)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Delete Draft"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}

                      {inv.status === 'Open' && (
                        <>
                          <button 
                            onClick={() => handleOpenPaymentModal(inv)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Landmark size={14} /> Pay
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(inv, 'Void')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Void Invoice"
                          >
                            <AlertTriangle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing Page <strong style={{ color: 'var(--text-white)' }}>{page}</strong> of <strong style={{ color: 'var(--text-white)' }}>{totalPages}</strong>
          </span>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="modal-btn secondary"
              onClick={() => {
                if (page > 1) {
                  const newPage = page - 1;
                  setPage(newPage);
                  fetchInvoices(newPage, searchQuery, statusFilter);
                }
              }}
              disabled={page <= 1}
              style={{ height: '32px', padding: '0 12px', minHeight: 0, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              &larr; Previous
            </button>
            <button
              className="modal-btn secondary"
              onClick={() => {
                if (page < totalPages) {
                  const newPage = page + 1;
                  setPage(newPage);
                  fetchInvoices(newPage, searchQuery, statusFilter);
                }
              }}
              disabled={page >= totalPages}
              style={{ height: '32px', padding: '0 12px', minHeight: 0, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Invoice Detailed Preview Drawer */}
      {showPrintDrawer && viewInvoice && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowPrintDrawer(false)}>
          <div className="modal-container" style={{ maxWidth: '750px', background: '#ffffff', color: '#1e293b', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>INVOICE</h2>
                <span style={{ fontSize: '13px', color: '#64748b' }}>#{viewInvoice.invoice_number}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>SAR Workforce</h4>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Enterprise Solutions Suite</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700, display: 'block' }}>Billed To:</span>
                <strong style={{ fontSize: '15px', color: '#1e293b', display: 'block', marginTop: '4px' }}>{viewInvoice.customer_name}</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '4px' }}>
                  <strong>Issue Date:</strong> {viewInvoice.issue_date}
                </div>
                <div style={{ fontSize: '12.5px', color: '#475569' }}>
                  <strong>Due Date:</strong> {viewInvoice.due_date}
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  <th style={{ padding: '10px 0' }}>Description</th>
                  <th style={{ width: '80px', textAlign: 'center', padding: '10px 0' }}>Qty</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '10px 0' }}>Unit Price</th>
                  <th style={{ width: '120px', textAlign: 'right', padding: '10px 0' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewInvoice.items && viewInvoice.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '13.5px', color: '#334155' }}>
                    <td style={{ padding: '12px 0' }}>{item.description}</td>
                    <td style={{ textAlign: 'center', padding: '12px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0' }}>{currencySymbol}{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: 600 }}>{currencySymbol}{parseFloat(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {parseFloat(viewInvoice.tax_amount) > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                      <span>Subtotal:</span>
                      <span>{currencySymbol}{(parseFloat(viewInvoice.total_amount) - parseFloat(viewInvoice.tax_amount)).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569' }}>
                      <span>GST ({parseFloat(viewInvoice.tax_rate)}%):</span>
                      <span>{currencySymbol}{parseFloat(viewInvoice.tax_amount).toFixed(2)}</span>
                    </div>
                  </>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  <span>Total Gross:</span>
                  <span>{currencySymbol}{parseFloat(viewInvoice.total_amount).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#0f172a', borderTop: '1px solid #cbd5e1', paddingTop: '10px' }}>
                  <span>Amount Due:</span>
                  <span style={{ color: parseFloat(viewInvoice.amount_due) > 0 ? '#0284c7' : '#16a34a' }}>
                    {currencySymbol}{parseFloat(viewInvoice.amount_due).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid #cbd5e1', marginTop: '40px', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Generated via SAR Workforce Ledger Engine. Internal Record.</span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  <Printer size={14} /> Print Invoice
                </button>
                <button 
                  onClick={() => setShowPrintDrawer(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentTarget && createPortal(
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-container" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment: Invoice {paymentTarget.invoice_number}</h3>
              <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Customer Name: <strong>{paymentTarget.customer_name}</strong>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Remaining Balance Due: <strong style={{ color: 'var(--accent-cyan)' }}>{currencySymbol}{parseFloat(paymentTarget.amount_due).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Date *</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select 
                      className="form-control" 
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      required
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Amount ({currencySymbol}) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      step="0.01"
                      min="0.01"
                      max={paymentTarget.amount_due}
                      placeholder="Enter amount paid"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Receipt ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. TXN-982301" 
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Invoice Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Invoice</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body">
                {salesOrders.length > 0 && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Copy details from a Sales Order (Optional)</label>
                    <select
                      className="form-control"
                      value={selectedSalesOrderId}
                      onChange={e => handleSelectSalesOrder(e.target.value)}
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">-- No linked Sales Order --</option>
                      {salesOrders.map(so => (
                        <option key={so.id} value={so.id}>Order #{so.id} - {so.customer_name} ({currencySymbol}{parseFloat(so.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Invoice Number *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer / Client Name *</label>
                    {customers.length > 0 ? (
                      <select
                        className="form-control"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      >
                        <option value="">-- Select Customer / Client --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.name}>{c.name} ({c.email || 'No email'})</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter customer or client name" 
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Issue Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Dynamic Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-white)' }}>Line Items</label>
                    <button 
                      type="button" 
                      className="modal-btn secondary" 
                      onClick={handleAddLineItem}
                      style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 0 }}
                    >
                      + Add Item Row
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        
                        {products.length > 0 && (
                          <div style={{ width: '150px' }}>
                            <select
                              className="form-control"
                              value={item.product_id}
                              onChange={e => handleLineItemChange(idx, 'product_id', e.target.value)}
                              style={{ fontSize: '12px' }}
                            >
                              <option value="">-- Custom item --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ flex: 3 }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Description of item"
                            value={item.description}
                            onChange={e => handleLineItemChange(idx, 'description', e.target.value)}
                            required
                            style={{ fontSize: '12.5px' }}
                          />
                        </div>

                        <div style={{ width: '70px' }}>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => handleLineItemChange(idx, 'quantity', e.target.value)}
                            required
                            style={{ fontSize: '12.5px', textAlign: 'center' }}
                          />
                        </div>

                        <div style={{ width: '120px' }}>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0.00"
                            placeholder="Price"
                            value={item.unit_price}
                            onChange={e => handleLineItemChange(idx, 'unit_price', e.target.value)}
                            required
                            style={{ fontSize: '12.5px', textAlign: 'right' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '18px', padding: '6px' }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GST Option Dropdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                  <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '12.5px' }}>GST Option:</label>
                    <select
                      className="form-control"
                      value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value))}
                      style={{ fontSize: '12.5px', padding: '4px 8px', height: 'auto', minHeight: 0, width: '150px' }}
                    >
                      <option value="0">Without GST (0%)</option>
                      <option value="5">GST @ 5%</option>
                      <option value="12">GST @ 12%</option>
                      <option value="18">GST @ 18%</option>
                      <option value="28">GST @ 28%</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {taxRate > 0 && (
                      <>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Subtotal: <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          GST ({taxRate}%): <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{(invoiceTotal * taxRate / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </span>
                      </>
                    )}
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Grand Total: <strong style={{ color: 'var(--text-white)', fontSize: '16px' }}>{currencySymbol}{(invoiceTotal + (invoiceTotal * taxRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Generate Draft</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Invoices;
