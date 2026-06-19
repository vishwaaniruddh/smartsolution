import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../context/AccountingContext';
import { useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Trash2, Eye, ClipboardList, Landmark, Check, AlertTriangle, X, Paperclip } from 'lucide-react';

const Bills = () => {
  const { tenantId, currencySymbol, toast } = useAccounting();
  const confirm = useConfirm();

  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState('');
  const [loading, setLoading] = useState(true);

  // View Modal / Panel
  const [viewBill, setViewBill] = useState(null);
  const [showPreviewDrawer, setShowPreviewDrawer] = useState(false);

  // Add Bill Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [billNumber, setBillNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [billItems, setBillItems] = useState([
    { description: '', quantity: 1, unit_cost: '', product_id: '' }
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [billAttachment, setBillAttachment] = useState(null);

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
  const [paymentAttachment, setPaymentAttachment] = useState(null);

  const fetchBills = (pageNum = page, search = searchQuery, status = statusFilter) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/accounting/bills?tenant_id=${tenantId}&page=${pageNum}&limit=10&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setBills(res.data || []);
          if (res.pagination) {
            setPage(res.pagination.page || 1);
            setTotalPages(res.pagination.total_pages || 1);
          }
        } else {
          toast.showError(res.error || "Failed to load vendor bills.");
        }
      })
      .catch(err => console.error("Error loading bills:", err))
      .finally(() => setLoading(false));
  };

  const fetchSuppliersAndProducts = () => {
    // Prefetch inventory suppliers
    fetch(`${apiBaseUrl}/inventory/suppliers?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setSuppliers(res.data || []);
      })
      .catch(err => console.warn("Could not prefetch suppliers:", err));

    // Prefetch inventory products
    fetch(`${apiBaseUrl}/inventory/products?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setProducts(res.data || []);
      })
      .catch(err => console.warn("Could not prefetch products:", err));

    // Prefetch purchase orders
    fetch(`${apiBaseUrl}/inventory/orders?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setPurchaseOrders(res.data || []);
      })
      .catch(err => console.warn("Could not prefetch purchase orders:", err));
  };

  const handleSelectPurchaseOrder = (poId) => {
    setSelectedPurchaseOrderId(poId);
    if (!poId) return;

    fetch(`${apiBaseUrl}/inventory/orders?id=${poId}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const po = res.data;
          setVendorName(po.supplier_name);
          if (po.items && po.items.length > 0) {
            setBillItems(po.items.map(it => ({
              description: it.product_name || it.description || 'Purchase Order Item',
              quantity: parseInt(it.quantity) || 1,
              unit_cost: parseFloat(it.unit_cost) || 0.00,
              product_id: it.product_id ? it.product_id.toString() : ''
            })));
          }
          toast.showSuccess(`Loaded details and ${po.items?.length || 0} line items from Purchase Order!`);
        } else {
          toast.showError("Failed to load Purchase Order items.");
        }
      })
      .catch(err => {
        console.error("Error loading purchase order details:", err);
        toast.showError("Network error while importing Purchase Order.");
      });
  };

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setStatusFilter('');
    fetchBills(1, '', '');
    fetchSuppliersAndProducts();
    setSelectedPurchaseOrderId('');
    setBillNumber(`BILL-${Date.now().toString().slice(-6)}`);
    setBillAttachment(null);
  }, [tenantId]);

  const handleOpenPreview = (bill) => {
    fetch(`${apiBaseUrl}/accounting/bills?id=${bill.id}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setViewBill(res.data);
          setShowPreviewDrawer(true);
        } else {
          toast.showError(res.error || "Failed to load bill items.");
        }
      })
      .catch(err => console.error("Error loading preview:", err));
  };

  const handleUpdateStatus = async (bill, newStatus) => {
    if (newStatus === 'Open') {
      const ok = await confirm(
        `Are you sure you want to approve Bill ${bill.bill_number}? This will generate automated double-entry journal postings and cannot be reverted to Draft.`,
        'Approve Supplier Bill'
      );
      if (!ok) return;
    }
    if (newStatus === 'Void') {
      const ok = await confirm(
        `Are you sure you want to void Bill ${bill.bill_number}? This will cancel the bill and mark it inactive.`,
        'Void Supplier Bill'
      );
      if (!ok) return;
    }

    fetch(`${apiBaseUrl}/accounting/bills?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bill.id, status: newStatus })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Bill status updated to ${newStatus}.`);
          fetchBills();
        } else {
          toast.showError(res.error || "Failed to update bill status.");
        }
      })
      .catch(err => console.error("Error updating bill status:", err));
  };

  const handleDeleteBill = async (bill) => {
    const ok = await confirm(
      `Are you sure you want to delete vendor bill ${bill.bill_number}? Only Draft bills can be permanently deleted.`,
      'Delete Draft Bill'
    );
    if (!ok) return;

    fetch(`${apiBaseUrl}/accounting/bills?id=${bill.id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Vendor bill deleted.");
          fetchBills();
        } else {
          toast.showError(res.error || "Failed to delete bill.");
        }
      })
      .catch(err => console.error("Error deleting bill:", err));
  };

  // Add Item split row
  const handleAddItemRow = () => {
    setBillItems(prev => [...prev, { description: '', quantity: 1, unit_cost: '', product_id: '' }]);
  };

  const handleRemoveItemRow = (index) => {
    if (billItems.length <= 1) return;
    setBillItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemRowChange = (index, field, value) => {
    setBillItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;

      if (field === 'product_id' && value !== '') {
        const prod = products.find(p => p.id === parseInt(value));
        if (prod) {
          updated[index]['description'] = `Purchase of ${prod.name}`;
          updated[index]['unit_cost'] = prod.cost_price || '0.00';
        }
      }
      return updated;
    });
  };

  const billTotal = billItems.reduce((sum, item) => sum + ((parseInt(item.quantity) || 1) * (parseFloat(item.unit_cost) || 0)), 0);

  const handleCreateBill = (e) => {
    e.preventDefault();
    if (!billNumber || !vendorName || billItems.length === 0) {
      toast.showError("Bill number, Vendor Name, and line items are required.");
      return;
    }

    const subtotal = billItems.reduce((sum, item) => sum + ((parseInt(item.quantity) || 1) * (parseFloat(item.unit_cost) || 0)), 0);
    const taxRateVal = parseFloat(taxRate) || 0;
    const taxAmount = Math.round(subtotal * (taxRateVal / 100) * 100) / 100;

    const formData = new FormData();
    formData.append('bill_number', billNumber);
    formData.append('vendor_name', vendorName);
    formData.append('issue_date', issueDate);
    formData.append('due_date', dueDate);
    formData.append('tax_rate', taxRateVal);
    formData.append('tax_amount', taxAmount);
    if (selectedPurchaseOrderId) {
      formData.append('purchase_order_id', selectedPurchaseOrderId);
    }
    formData.append('items', JSON.stringify(billItems.map(it => ({
      description: it.description || 'Inventory supplies',
      quantity: parseInt(it.quantity) || 1,
      unit_cost: parseFloat(it.unit_cost) || 0.00,
      product_id: it.product_id ? parseInt(it.product_id) : null
    }))));

    if (billAttachment) {
      formData.append('attachment', billAttachment);
    }

    fetch(`${apiBaseUrl}/accounting/bills?tenant_id=${tenantId}`, {
      method: 'POST',
      body: formData
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Supplier bill registered successfully as Draft!");
          setShowAddModal(false);
          setBillNumber(`BILL-${Date.now().toString().slice(-6)}`);
          setVendorName('');
          setSelectedPurchaseOrderId('');
          setBillItems([{ description: '', quantity: 1, unit_cost: '', product_id: '' }]);
          setTaxRate(0);
          setBillAttachment(null);
          fetchBills();
        } else {
          toast.showError(res.error || "Failed to save vendor bill.");
        }
      })
      .catch(err => {
        console.error("Error saving bill:", err);
        toast.showError("Network error while registering vendor bill.");
      });
  };

  // Record Payout Disbursement
  const handleOpenPaymentModal = (bill) => {
    setPaymentTarget(bill);
    setPaymentAmount(bill.amount_due);
    setPaymentRef(`DISB-${bill.bill_number}`);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.showError("Please enter a valid disbursement amount.");
      return;
    }

    const formData = new FormData();
    formData.append('payment_date', paymentDate);
    formData.append('payment_method', paymentMethod);
    formData.append('type', 'Payment');
    formData.append('amount', parseFloat(paymentAmount));
    formData.append('reference', paymentRef);
    formData.append('bill_id', paymentTarget.id);
    if (paymentAttachment) {
      formData.append('attachment', paymentAttachment);
    }

    fetch(`${apiBaseUrl}/accounting/transactions?tenant_id=${tenantId}`, {
      method: 'POST',
      body: formData
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Payout of ${currencySymbol}${paymentAmount} logged and matched to Bill ${paymentTarget.bill_number}!`);
          setShowPaymentModal(false);
          setPaymentTarget(null);
          setPaymentAmount('');
          setPaymentRef('');
          setPaymentAttachment(null);
          fetchBills();
        } else {
          toast.showError(res.error || "Failed to log vendor payment.");
        }
      })
      .catch(err => {
        console.error("Error logging payment:", err);
        toast.showError("Network error while recording vendor payment.");
      });
  };

  if (loading && bills.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading Vendor Bills...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track vendor statements, match with POs and log payout disbursements.
          </p>
        </div>
        
        <button 
          className="add-lead-btn"
          onClick={() => {
            setBillNumber(`BILL-${Date.now().toString().slice(-6)}`);
            setTaxRate(0);
            setShowAddModal(true);
          }}
          style={{ gap: '8px' }}
        >
          <ClipboardList size={16} />
          Record Supplier Bill
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by vendor or bill #..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchBills(1, searchQuery, statusFilter);
              }
            }}
            style={{ fontSize: '13px', height: '36px' }}
          />
          <button 
            className="modal-btn primary" 
            onClick={() => {
              setPage(1);
              fetchBills(1, searchQuery, statusFilter);
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
              fetchBills(1, searchQuery, val);
            }}
            style={{ fontSize: '13px', height: '36px', padding: '0 12px', width: '130px' }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="Paid">Paid</option>
            <option value="Void">Void</option>
          </select>

          {(searchQuery || statusFilter) && (
            <button
              className="modal-btn secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setPage(1);
                fetchBills(1, '', '');
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
              <th>Bill Number</th>
              <th>Vendor / Supplier</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'right' }}>Amount Due</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No supplier bills tracked. Click 'Record Vendor Bill' to register a purchase statement.
                </td>
              </tr>
            ) : bills.map((b) => {
              let statusColor = 'var(--text-muted)';
              let statusBg = 'rgba(255,255,255,0.05)';
              if (b.status === 'Draft') { statusColor = 'var(--accent-yellow)'; statusBg = 'rgba(245, 158, 11, 0.1)'; }
              if (b.status === 'Open') { statusColor = 'var(--accent-orange)'; statusBg = 'rgba(249, 115, 22, 0.1)'; }
              if (b.status === 'Paid') { statusColor = 'var(--accent-green)'; statusBg = 'rgba(16, 185, 129, 0.1)'; }
              if (b.status === 'Void') { statusColor = 'var(--text-muted)'; statusBg = 'rgba(255,255,255,0.02)'; }

              return (
                <tr key={b.id}>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                    {b.bill_number}
                    {b.attachment_path && (
                      <a 
                        href={`${apiBaseUrl.replace('/api', '')}/${b.attachment_path}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ marginLeft: '6px', color: 'var(--accent-cyan)', fontSize: '12px', textDecoration: 'none' }}
                        title="View Attached Screenshot/Document"
                      >
                        📎
                      </a>
                    )}
                  </td>
                  <td style={{ fontSize: '13.5px' }}>{b.vendor_name}</td>
                  <td style={{ fontSize: '12.5px' }}>{b.issue_date}</td>
                  <td style={{ fontSize: '12.5px' }}>{b.due_date}</td>
                  <td style={{ fontSize: '13.5px', fontWeight: 600, textAlign: 'right' }}>
                    {currencySymbol}{parseFloat(b.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, textAlign: 'right', color: parseFloat(b.amount_due) > 0 ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>
                    {currencySymbol}{parseFloat(b.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                      {b.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleOpenPreview(b)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        title="Audit Bill Items"
                      >
                        <Eye size={15} />
                      </button>

                      {b.status === 'Draft' && (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(b, 'Open')}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Approve Bill"
                          >
                            <Check size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBill(b)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Delete Draft"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}

                      {b.status === 'Open' && (
                        <>
                          <button 
                            onClick={() => handleOpenPaymentModal(b)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Landmark size={14} /> Pay Out
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(b, 'Void')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', borderRadius: 'var(--radius-sm)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            title="Void Statement"
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
                  fetchBills(newPage, searchQuery, statusFilter);
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
                  fetchBills(newPage, searchQuery, statusFilter);
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

      {/* Bill Preview Modal Drawer */}
      {showPreviewDrawer && viewBill && createPortal(
        <div className="modal-overlay" onClick={() => setShowPreviewDrawer(false)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Vendor Bill Audit: {viewBill.bill_number}</h3>
              <button className="modal-close-btn" onClick={() => setShowPreviewDrawer(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '13px' }}>
                <div>
                  <strong>Vendor Supplier:</strong> {viewBill.vendor_name}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Issue Date:</strong> {viewBill.issue_date}</div>
                  <div><strong>Due Date:</strong> {viewBill.due_date}</div>
                </div>
              </div>

              {viewBill.attachment_path && (
                <div style={{ marginBottom: '20px', padding: '14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '8px' }}>Attached Bill Document / Screenshot:</div>
                  <div>
                    {viewBill.attachment_path.toLowerCase().endsWith('.pdf') ? (
                      <a 
                        href={`${apiBaseUrl.replace('/api', '')}/${viewBill.attachment_path}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="modal-btn secondary"
                        style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', padding: '6px 12px', height: 'auto', minHeight: 0, textDecoration: 'none' }}
                      >
                        📄 Open PDF Invoice
                      </a>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <a 
                          href={`${apiBaseUrl.replace('/api', '')}/${viewBill.attachment_path}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ display: 'block', maxWidth: '100%', overflow: 'hidden', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                        >
                          <img 
                            src={`${apiBaseUrl.replace('/api', '')}/${viewBill.attachment_path}`} 
                            alt="Bill Screenshot" 
                            style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: '#0a0f1d' }} 
                          />
                        </a>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Click image to view in full size</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
  
              <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto', marginBottom: '20px' }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Item Description</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewBill.items && viewBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px' }}>{item.description}</td>
                        <td style={{ textAlign: 'center', fontSize: '13px' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontSize: '13px' }}>{currencySymbol}{parseFloat(item.unit_cost).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                          {currencySymbol}{parseFloat(item.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {parseFloat(viewBill.tax_amount) > 0 ? (
                      <>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 600 }}>
                          <td colSpan="3" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Subtotal</td>
                          <td style={{ fontSize: '13px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {currencySymbol}{(parseFloat(viewBill.total_amount) - parseFloat(viewBill.tax_amount)).toFixed(2)}
                          </td>
                        </tr>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 600 }}>
                          <td colSpan="3" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>GST ({parseFloat(viewBill.tax_rate)}%)</td>
                          <td style={{ fontSize: '13px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {currencySymbol}{parseFloat(viewBill.tax_amount).toFixed(2)}
                          </td>
                        </tr>
                      </>
                    ) : null}
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 700 }}>
                      <td colSpan="3" style={{ fontSize: '13.5px', color: 'var(--text-white)' }}>Bill Total Amount</td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--text-white)' }}>
                        {currencySymbol}{parseFloat(viewBill.total_amount).toFixed(2)}
                      </td>
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 700 }}>
                      <td colSpan="3" style={{ fontSize: '13.5px', color: 'var(--text-white)' }}>Remaining Amount Due</td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--accent-orange)' }}>
                        {currencySymbol}{parseFloat(viewBill.amount_due).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
  
            <div className="modal-footer">
              <button className="modal-btn primary" onClick={() => setShowPreviewDrawer(false)}>Close Summary</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Record Vendor Payout Modal */}
      {showPaymentModal && paymentTarget && createPortal(
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-container" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Vendor Payout: Bill {paymentTarget.bill_number}</h3>
              <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Vendor / Supplier: <strong>{paymentTarget.vendor_name}</strong>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Remaining Balance Due: <strong style={{ color: 'var(--accent-orange)' }}>{currencySymbol}{parseFloat(paymentTarget.amount_due).toLocaleString()}</strong>
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
                      <option value="Debit Card">Debit Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="Mobile Wallet">Mobile Wallet</option>
                      <option value="Petty Cash">Petty Cash</option>
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
                  <label className="form-label">Transaction Ref ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. UTR-910283, CHQ-482" 
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                  />
                </div>

                {/* Payment Receipt / Screenshot Upload */}
                <div className="form-group" style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={14} /> Attach Payment Receipt / Screenshot (Optional)
                  </label>
                  <input 
                    type="file" 
                    className="form-control" 
                    onChange={e => setPaymentAttachment(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    accept="image/*,application/pdf"
                    style={{ fontSize: '13px', paddingTop: '6px', height: 'auto' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Upload a screenshot or PDF of the payment confirmation, bank receipt, or UTR slip.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => { setShowPaymentModal(false); setPaymentAttachment(null); }}>Cancel</button>
                <button type="submit" className="modal-btn primary">Record Payment</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Bill Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Supplier Bill</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateBill}>
              <div className="modal-body">
                {purchaseOrders.length > 0 && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>Copy details from a Purchase Order (Optional)</label>
                    <select
                      className="form-control"
                      value={selectedPurchaseOrderId}
                      onChange={e => handleSelectPurchaseOrder(e.target.value)}
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">-- No linked Purchase Order --</option>
                      {purchaseOrders.map(po => (
                        <option key={po.id} value={po.id}>PO #{po.id} - {po.supplier_name} ({currencySymbol}{parseFloat(po.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bill Number *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Supplier (Who you bought from) *</label>
                    {suppliers.length > 0 ? (
                      <select
                        className="form-control"
                        value={vendorName}
                        onChange={e => setVendorName(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Supplier --</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Enter supplier company name" 
                        value={vendorName}
                        onChange={e => setVendorName(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bill Issue Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bill Due Date *</label>
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
                      onClick={handleAddItemRow}
                      style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 0 }}
                    >
                      + Add Item Row
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {billItems.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        
                        {products.length > 0 && (
                          <div style={{ width: '150px' }}>
                            <select
                              className="form-control"
                              value={item.product_id}
                              onChange={e => handleItemRowChange(idx, 'product_id', e.target.value)}
                              style={{ fontSize: '12px' }}
                            >
                              <option value="">-- Custom item --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ flex: 3 }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Description of supply item"
                            value={item.description}
                            onChange={e => handleItemRowChange(idx, 'description', e.target.value)}
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
                            onChange={e => handleItemRowChange(idx, 'quantity', e.target.value)}
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
                            placeholder="Cost Unit"
                            value={item.unit_cost}
                            onChange={e => handleItemRowChange(idx, 'unit_cost', e.target.value)}
                            required
                            style={{ fontSize: '12.5px', textAlign: 'right' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '18px', padding: '6px' }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Attachment Upload */}
                <div className="form-group" style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '13px' }}>Attach Bill Document or Screenshot (Optional)</label>
                  <input 
                    type="file" 
                    className="form-control" 
                    onChange={e => setBillAttachment(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    accept="image/*,application/pdf"
                    style={{ fontSize: '13px', paddingTop: '6px', height: 'auto' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Supported formats: PNG, JPG, JPEG, PDF. Max size 5MB.
                  </span>
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
                          Subtotal: <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{billTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          GST ({taxRate}%): <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{(billTotal * taxRate / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </span>
                      </>
                    )}
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Grand Total: <strong style={{ color: 'var(--text-white)', fontSize: '16px' }}>{currencySymbol}{(billTotal + (billTotal * taxRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Save Draft Bill</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Bills;
