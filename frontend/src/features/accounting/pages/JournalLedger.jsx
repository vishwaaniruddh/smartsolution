import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../context/AccountingContext';
import { useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Trash2, Eye, ShieldCheck, ShieldAlert, BookOpen, X } from 'lucide-react';

const JournalLedger = () => {
  const { tenantId, currencySymbol, accounts, toast } = useAccounting();
  const confirm = useConfirm();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewDetails, setViewDetails] = useState(false);

  // Add Journal Entry Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' }
  ]);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEntries = (pageNum = page, search = searchQuery) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/accounting/journal-entries?tenant_id=${tenantId}&page=${pageNum}&limit=10&search=${encodeURIComponent(search)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setEntries(res.data || []);
          if (res.pagination) {
            setPage(res.pagination.page || 1);
            setTotalPages(res.pagination.total_pages || 1);
          }
        } else {
          toast.showError(res.error || "Failed to load journal entries.");
        }
      })
      .catch(err => {
        console.error("Error loading journal entries:", err);
        toast.showError("Connection error while loading journal entries.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    setSearchQuery('');
    fetchEntries(1, '');
  }, [tenantId]);

  // Load detailed items of a journal entry
  const handleViewDetails = (entry) => {
    fetch(`${apiBaseUrl}/accounting/journal-entries?id=${entry.id}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setSelectedEntry(res.data);
          setViewDetails(true);
        } else {
          toast.showError(res.error || "Failed to load journal entry details.");
        }
      })
      .catch(err => console.error("Error loading details:", err));
  };

  const handleDeleteEntry = async (entry) => {
    const ok = await confirm(
      `Are you sure you want to void/delete Journal Entry ref '${entry.reference || entry.id}'? This will reverse the general ledger postings.`,
      "Void Journal Entry"
    );
    if (!ok) return;

    fetch(`${apiBaseUrl}/accounting/journal-entries?id=${entry.id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Journal Entry deleted/voided successfully.");
          fetchEntries();
        } else {
          toast.showError(res.error || "Failed to delete Journal Entry.");
        }
      })
      .catch(err => {
        console.error("Error deleting entry:", err);
        toast.showError("Network error while deleting entry.");
      });
  };

  // Add / Remove Row in Creator Form
  const handleAddRow = () => {
    setItems(prev => [...prev, { account_id: '', debit: '', credit: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (items.length <= 2) {
      toast.showError("A journal entry requires at least two account rows (Double-Entry).");
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      
      // If debit is typed, clear credit (or vice versa) for normal transactions, 
      // but let them override if needed. Standard bookkeeping does one debit or one credit per row.
      if (field === 'debit' && value !== '') {
        updated[index]['credit'] = '';
      }
      if (field === 'credit' && value !== '') {
        updated[index]['debit'] = '';
      }
      return updated;
    });
  };

  // Calculations for Creator Form Validation
  const sumDebits = items.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0);
  const sumCredits = items.reduce((sum, item) => sum + (parseFloat(item.credit) || 0), 0);
  const difference = Math.abs(sumDebits - sumCredits);
  const isBalanced = difference < 0.01 && sumDebits > 0;

  const handlePostJournal = (e) => {
    e.preventDefault();
    if (!isBalanced) {
      toast.showError("Ledger is unbalanced. Total Debits must equal Credits and be greater than 0.");
      return;
    }

    // Filter out rows without accounts or amounts
    const validItems = items.filter(it => it.account_id !== '' && ((parseFloat(it.debit) || 0) > 0 || (parseFloat(it.credit) || 0) > 0));
    if (validItems.length < 2) {
      toast.showError("A journal entry requires at least two valid ledger splits.");
      return;
    }

    const payload = {
      entry_date: entryDate,
      reference,
      description,
      items: validItems.map(it => ({
        account_id: parseInt(it.account_id),
        debit: parseFloat(it.debit) || 0.00,
        credit: parseFloat(it.credit) || 0.00
      }))
    };

    fetch(`${apiBaseUrl}/accounting/journal-entries?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Journal Entry posted successfully to general ledger!");
          setShowAddModal(false);
          setEntryDate(new Date().toISOString().split('T')[0]);
          setReference('');
          setDescription('');
          setItems([
            { account_id: '', debit: '', credit: '' },
            { account_id: '', debit: '', credit: '' }
          ]);
          fetchEntries();
        } else {
          toast.showError(res.error || "Failed to post Journal Entry.");
        }
      })
      .catch(err => {
        console.error("Error posting entry:", err);
        toast.showError("Network error while posting Journal Entry.");
      });
  };

  if (loading && entries.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading General Ledger Journal Entries...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Review general ledger records and make manual bookkeeping adjustments.
          </p>
        </div>
        
        <button 
          className="add-lead-btn"
          onClick={() => setShowAddModal(true)}
          style={{ gap: '8px' }}
        >
          <BookOpen size={16} />
          Record Manual Adjustment
        </button>
      </div>

      {/* Search Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by reference ID or description..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setPage(1);
                fetchEntries(1, searchQuery);
              }
            }}
            style={{ fontSize: '13px', height: '36px' }}
          />
          <button 
            className="modal-btn primary" 
            onClick={() => {
              setPage(1);
              fetchEntries(1, searchQuery);
            }}
            style={{ height: '36px', padding: '0 16px', minHeight: 0 }}
          >
            Search
          </button>
          {searchQuery && (
            <button
              className="modal-btn secondary"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
                fetchEntries(1, '');
              }}
              style={{ height: '36px', padding: '0 12px', minHeight: 0 }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Entries Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Entry Date</th>
              <th>Reference ID</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Total Debits</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No journal ledger transactions found. Click 'Create Journal Entry' to post a ledger item.
                </td>
              </tr>
            ) : entries.map((ent) => (
              <tr key={ent.id}>
                <td style={{ fontSize: '13.5px' }}>{ent.entry_date}</td>
                <td style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{ent.reference || `JE-${ent.id}`}</td>
                <td style={{ fontSize: '13.5px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ent.description}
                </td>
                <td style={{ fontSize: '13.5px', fontWeight: 700, textAlign: 'right', color: 'var(--text-white)' }}>
                  {currencySymbol}{parseFloat(ent.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => handleViewDetails(ent)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      title="Audit Ledger splits"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEntry(ent)}
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
                      title="Void Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
                  fetchEntries(newPage, searchQuery);
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
                  fetchEntries(newPage, searchQuery);
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

      {/* Journal Entry Detailed Audit Modal */}
      {viewDetails && selectedEntry && createPortal(
        <div className="modal-overlay" onClick={() => setViewDetails(false)}>
          <div className="modal-container" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Journal Entry Audit: {selectedEntry.reference || `JE-${selectedEntry.id}`}</h3>
              <button className="modal-close-btn" onClick={() => setViewDetails(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>Post Date:</strong> {selectedEntry.entry_date}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong>Description:</strong> {selectedEntry.description}
                </div>
              </div>
  
              <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Ledger Account</th>
                      <th style={{ textAlign: 'right' }}>Debit</th>
                      <th style={{ textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedEntry.items && selectedEntry.items.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{line.account_code}</span> - {line.account_name}
                        </td>
                        <td style={{ fontSize: '13px', textAlign: 'right', fontWeight: parseFloat(line.debit) > 0 ? 700 : 400, color: parseFloat(line.debit) > 0 ? 'var(--text-white)' : 'var(--text-muted)' }}>
                          {parseFloat(line.debit) > 0 ? `${currencySymbol}${parseFloat(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td style={{ fontSize: '13px', textAlign: 'right', fontWeight: parseFloat(line.credit) > 0 ? 700 : 400, color: parseFloat(line.credit) > 0 ? 'var(--text-white)' : 'var(--text-muted)' }}>
                          {parseFloat(line.credit) > 0 ? `${currencySymbol}${parseFloat(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 700 }}>
                      <td style={{ fontSize: '13.5px', color: 'var(--text-white)' }}>Total Ledger Split</td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--text-white)' }}>
                        {currencySymbol}{selectedEntry.items ? selectedEntry.items.reduce((s, l) => s + parseFloat(l.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--text-white)' }}>
                        {currencySymbol}{selectedEntry.items ? selectedEntry.items.reduce((s, l) => s + parseFloat(l.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
  
            <div className="modal-footer">
              <button className="modal-btn primary" onClick={() => setViewDetails(false)}>Close Audit Log</button>
            </div>
          </div>
        </div>,
        document.body
      )}
  
      {/* Add Journal Entry Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Manual Adjustment</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePostJournal}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Entry Date *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={entryDate}
                      onChange={e => setEntryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference ID (Optional)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. INV-2026-001" 
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                    />
                  </div>
                </div>
  
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Summarize the bookkeeping item details" 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>
  
                {/* Dynamic Double Entry Items Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-white)' }}>Transaction Lines (Must balance)</label>
                    <button 
                      type="button" 
                      className="modal-btn secondary" 
                      onClick={handleAddRow}
                      style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 0 }}
                    >
                      + Add Line
                    </button>
                  </div>
  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        
                        <div style={{ flex: 2 }}>
                          <select
                            className="form-control"
                            value={item.account_id}
                            onChange={e => handleItemChange(idx, 'account_id', e.target.value)}
                            required
                            style={{ fontSize: '12.5px' }}
                          >
                            <option value="">-- Select Ledger Account --</option>
                            {accounts.filter(a => a.is_active === 1).map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.code} - {acc.name} ({acc.type})</option>
                            ))}
                          </select>
                        </div>
  
                        <div style={{ flex: 1 }}>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0.01"
                            placeholder="Increase (+ Debit)"
                            value={item.debit}
                            onChange={e => handleItemChange(idx, 'debit', e.target.value)}
                            disabled={item.credit !== ''}
                            style={{ fontSize: '12.5px', textAlign: 'right' }}
                          />
                        </div>
  
                        <div style={{ flex: 1 }}>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            min="0.01"
                            placeholder="Decrease (- Credit)"
                            value={item.credit}
                            onChange={e => handleItemChange(idx, 'credit', e.target.value)}
                            disabled={item.debit !== ''}
                            style={{ fontSize: '12.5px', textAlign: 'right' }}
                          />
                        </div>
  
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-red)',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '6px'
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
  
                {/* Balance Validation Panel */}
                <div style={{
                  background: isBalanced ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: isBalanced ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isBalanced ? (
                      <ShieldCheck size={18} style={{ color: 'var(--accent-green)' }} />
                    ) : (
                      <ShieldAlert size={18} style={{ color: 'var(--accent-red)' }} />
                    )}
                    <span style={{ fontSize: '12.5px', color: isBalanced ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                      {isBalanced ? 'Lines Balanced' : `Lines Unbalanced: Off by ${currencySymbol}${difference.toFixed(2)}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Total Increases: <strong>{currencySymbol}{sumDebits.toFixed(2)}</strong> | Decreases: <strong>{currencySymbol}{sumCredits.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
  
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="modal-btn primary"
                  disabled={!isBalanced}
                  style={{ opacity: isBalanced ? 1 : 0.6, cursor: isBalanced ? 'pointer' : 'not-allowed' }}
                >
                  Post Entry
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

export default JournalLedger;
