import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../context/AccountingContext';
import { useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, Landmark, Wallet, HelpCircle, X } from 'lucide-react';

const Transactions = () => {
  const { tenantId, currencySymbol, toast } = useAccounting();
  const confirm = useConfirm();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [type, setType] = useState('Payment'); // Receipt or Payment
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchTransactions = (pageNum = page, search = searchQuery, typeVal = typeFilter) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/accounting/transactions?tenant_id=${tenantId}&page=${pageNum}&limit=10&search=${encodeURIComponent(search)}&type=${encodeURIComponent(typeVal)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setTransactions(res.data || []);
          if (res.pagination) {
            setPage(res.pagination.page || 1);
            setTotalPages(res.pagination.total_pages || 1);
          }
        } else {
          toast.showError(res.error || "Failed to load bank transactions.");
        }
      })
      .catch(err => console.error("Error loading transactions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    setTypeFilter('');
    fetchTransactions(1, '', '');
  }, [tenantId]);

  const handleCreateTransaction = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !type) {
      toast.showError("Please enter a valid amount and transaction type.");
      return;
    }

    const payload = {
      payment_date: paymentDate,
      payment_method: paymentMethod,
      type,
      amount: parseFloat(amount),
      reference
    };

    fetch(`${apiBaseUrl}/accounting/transactions?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Transaction recorded and auto-journalized in ledger.");
          setShowAddModal(false);
          setPaymentDate(new Date().toISOString().split('T')[0]);
          setAmount('');
          setReference('');
          fetchTransactions();
        } else {
          toast.showError(res.error || "Failed to record transaction.");
        }
      })
      .catch(err => {
        console.error("Error creating transaction:", err);
        toast.showError("Network error while recording transaction.");
      });
  };

  const handleDeleteTransaction = async (tx) => {
    const ok = await confirm(
      "Are you sure you want to void this bank transaction? This will remove the cash ledger log but will NOT automatically reverse matched invoice/bill balances (adjust them manually).",
      "Void Bank Transaction"
    );
    if (!ok) return;

    fetch(`${apiBaseUrl}/accounting/transactions?id=${tx.id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Transaction entry deleted.");
          fetchTransactions();
        } else {
          toast.showError(res.error || "Failed to delete transaction.");
        }
      })
      .catch(err => console.error("Error deleting transaction:", err));
  };

  const totalInflow = transactions
    .filter(t => t.type === 'Receipt')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const totalOutflow = transactions
    .filter(t => t.type === 'Payment')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const netCashflow = totalInflow - totalOutflow;

  if (loading && transactions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading Cashbook transactions...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Track deposits, disbursements and match cash transactions.
          </p>
        </div>
        
        <button 
          className="add-lead-btn"
          onClick={() => setShowAddModal(true)}
          style={{ gap: '8px' }}
        >
          <Landmark size={16} />
          Log Cash Transaction
        </button>
      </div>

      {/* Cashflow Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        
        {/* Total Inflow */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.1)',
            color: 'var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currencySymbol}{totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Cash Inflows</span>
          </div>
        </div>

        {/* Total Outflow */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--accent-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currencySymbol}{totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Cash Outflows</span>
          </div>
        </div>

        {/* Net Cash Movement */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            color: netCashflow >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wallet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: netCashflow >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
              {currencySymbol}{netCashflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Net Cashbook Flow</span>
          </div>
        </div>

      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search ref, method, or doc..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchTransactions(1, searchQuery, typeFilter);
              }
            }}
            style={{ fontSize: '13px', height: '36px' }}
          />
          <button 
            className="modal-btn primary" 
            onClick={() => {
              setPage(1);
              fetchTransactions(1, searchQuery, typeFilter);
            }}
            style={{ height: '36px', padding: '0 16px', minHeight: 0 }}
          >
            Search
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Type:</label>
          <select
            className="form-control"
            value={typeFilter}
            onChange={e => {
              const val = e.target.value;
              setTypeFilter(val);
              setPage(1);
              fetchTransactions(1, searchQuery, val);
            }}
            style={{ fontSize: '13px', height: '36px', padding: '0 12px', width: '130px' }}
          >
            <option value="">All Types</option>
            <option value="Receipt">Receipt</option>
            <option value="Payment">Payment</option>
          </select>

          {(searchQuery || typeFilter) && (
            <button
              className="modal-btn secondary"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('');
                setPage(1);
                fetchTransactions(1, '', '');
              }}
              style={{ height: '36px', padding: '0 12px', minHeight: 0 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Cashbook Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transaction ID / Reference</th>
              <th>Type</th>
              <th>Payment Method</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Ledger Matching Link</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No cashbook transactions found.
                </td>
              </tr>
            ) : transactions.map((tx) => {
              const isReceipt = tx.type === 'Receipt';
              return (
                <tr key={tx.id}>
                  <td style={{ fontSize: '13px' }}>{tx.payment_date}</td>
                  <td style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>
                    {tx.reference || `TXN-${tx.id}`}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: isReceipt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isReceipt ? 'var(--accent-green)' : 'var(--accent-red)',
                      border: `1px solid ${isReceipt ? 'var(--accent-green)' : 'var(--accent-red)'}33`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isReceipt ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                      {tx.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{tx.payment_method}</td>
                  <td style={{ 
                    fontSize: '13.5px', 
                    fontWeight: 700, 
                    textAlign: 'right', 
                    color: isReceipt ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}>
                    {isReceipt ? '+' : '-'}{currencySymbol}{parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {tx.invoice_number && (
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Invoice: {tx.invoice_number}</span>
                    )}
                    {tx.bill_number && (
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>Bill: {tx.bill_number}</span>
                    )}
                    {!tx.invoice_number && !tx.bill_number && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                        <HelpCircle size={12} /> Custom Ledger adjustment
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDeleteTransaction(tx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-red)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      title="Void Cash Transaction"
                    >
                      <Trash2 size={16} />
                    </button>
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
                  fetchTransactions(newPage, searchQuery, typeFilter);
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
                  fetchTransactions(newPage, searchQuery, typeFilter);
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

      {/* Log Transaction Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Cash Transaction</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Transaction Type *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setType('Receipt')}
                      style={{
                        padding: '10px',
                        background: type === 'Receipt' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
                        border: type === 'Receipt' ? '1px solid var(--accent-green)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: type === 'Receipt' ? 'var(--accent-green)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      Receipt (Inward Deposit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('Payment')}
                      style={{
                        padding: '10px',
                        background: type === 'Payment' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
                        border: type === 'Payment' ? '1px solid var(--accent-red)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: type === 'Payment' ? 'var(--accent-red)' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      Payment (Disbursement)
                    </button>
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
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount ({currencySymbol}) *</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / Memo</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Office supplies payout, or Director capital injection" 
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Log Transaction</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Transactions;
