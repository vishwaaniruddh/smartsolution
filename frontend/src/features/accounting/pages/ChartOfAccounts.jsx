import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounting } from '../context/AccountingContext';
import { useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Plus, Trash2, ShieldAlert, FolderPlus, ToggleLeft, ToggleRight, X } from 'lucide-react';

const ChartOfAccounts = () => {
  const { tenantId, currencySymbol, accounts, loadingAccounts, refreshAccounts, toast } = useAccounting();
  const confirm = useConfirm();

  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'Asset',
    parent_id: ''
  });

  const fetchBalances = () => {
    setLoadingBalances(true);
    fetch(`${apiBaseUrl}/accounting/reports?type=trial&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data && res.data.lines) {
          const balMap = {};
          res.data.lines.forEach(line => {
            const db = parseFloat(line.debit || 0);
            const cr = parseFloat(line.credit || 0);
            let net = 0;
            
            // Asset/Expense: Normal Debit balance
            if (line.account_type === 'Asset' || line.account_type === 'Expense') {
              net = db - cr;
            } else {
              // Liability/Equity/Revenue: Normal Credit balance
              net = cr - db;
            }
            balMap[line.account_code] = net;
          });
          setBalances(balMap);
        }
      })
      .catch(err => console.error("Error loading account balances:", err))
      .finally(() => setLoadingBalances(false));
  };

  useEffect(() => {
    fetchBalances();
  }, [tenantId, accounts]);

  const handleCreateAccount = (e) => {
    e.preventDefault();
    if (!newAccount.code || !newAccount.name || !newAccount.type) {
      toast.showError("Please fill out all required fields.");
      return;
    }

    fetch(`${apiBaseUrl}/accounting/accounts?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAccount)
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Account '${newAccount.code} - ${newAccount.name}' created!`);
          setShowAddModal(false);
          setNewAccount({ code: '', name: '', type: 'Asset', parent_id: '' });
          refreshAccounts();
        } else {
          toast.showError(res.error || "Failed to create account.");
        }
      })
      .catch(err => {
        console.error("Error creating account:", err);
        toast.showError("Network error while creating account.");
      });
  };

  const handleDeleteAccount = async (acc) => {
    const ok = await confirm(`Are you sure you want to delete account ${acc.code} - ${acc.name}?`, "Delete Account");
    if (!ok) return;

    fetch(`${apiBaseUrl}/accounting/accounts?id=${acc.id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess("Account deleted successfully.");
          refreshAccounts();
        } else {
          toast.showError(res.error || "Failed to delete account. Accounts with ledger entries cannot be deleted.");
        }
      })
      .catch(err => {
        console.error("Error deleting account:", err);
        toast.showError("Network error while deleting account.");
      });
  };

  const handleToggleActive = (acc) => {
    const nextActive = acc.is_active === 1 ? 0 : 1;
    fetch(`${apiBaseUrl}/accounting/accounts?tenant_id=${tenantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: acc.id,
        name: acc.name,
        is_active: nextActive
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          toast.showSuccess(`Account active status updated.`);
          refreshAccounts();
        } else {
          toast.showError(res.error || "Failed to update account status.");
        }
      })
      .catch(err => console.error("Error updating account status:", err));
  };

  if (loadingAccounts && accounts.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading Chart of Accounts...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure and monitor your multi-tenant general ledger accounts ledger.
          </p>
        </div>
        
        <button 
          className="add-lead-btn"
          onClick={() => setShowAddModal(true)}
          style={{ gap: '8px' }}
        >
          <FolderPlus size={16} />
          Add Ledger Account
        </button>
      </div>

      {/* Chart of Accounts Categories Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => {
          const typeAccounts = accounts.filter(a => a.type === type);
          const typeSum = typeAccounts.reduce((sum, a) => sum + (balances[a.code] || 0), 0);
          
          let cardBg = 'rgba(255,255,255,0.01)';
          let borderClr = 'var(--border)';
          let textAccent = 'var(--text-primary)';
          
          if (type === 'Asset') { borderClr = 'rgba(34, 211, 238, 0.2)'; textAccent = 'var(--accent-cyan)'; }
          if (type === 'Liability') { borderClr = 'rgba(239, 68, 68, 0.2)'; textAccent = 'var(--accent-red)'; }
          if (type === 'Equity') { borderClr = 'rgba(59, 130, 246, 0.2)'; textAccent = 'var(--accent-blue)'; }
          if (type === 'Revenue') { borderClr = 'rgba(16, 185, 129, 0.2)'; textAccent = 'var(--accent-green)'; }
          if (type === 'Expense') { borderClr = 'rgba(245, 158, 11, 0.2)'; textAccent = 'var(--accent-orange)'; }

          return (
            <div key={type} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${borderClr}`,
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{type} Accounts</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: textAccent, marginTop: '6px' }}>
                {currencySymbol}{typeSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                {typeAccounts.length} accounts configured
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Ledger Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Current Balance</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No accounts mapped. Click 'Add Ledger Account' to seed details.
                </td>
              </tr>
            ) : accounts.map((acc) => {
              const bal = balances[acc.code] || 0.00;
              const isInactive = acc.is_active === 0 || acc.is_active === '0';
              
              let typeBadgeBg = 'rgba(255,255,255,0.05)';
              let typeBadgeColor = 'var(--text-secondary)';
              if (acc.type === 'Asset') { typeBadgeBg = 'rgba(34, 211, 238, 0.1)'; typeBadgeColor = 'var(--accent-cyan)'; }
              if (acc.type === 'Liability') { typeBadgeBg = 'rgba(239, 68, 68, 0.1)'; typeBadgeColor = 'var(--accent-red)'; }
              if (acc.type === 'Equity') { typeBadgeBg = 'rgba(59, 130, 246, 0.1)'; typeBadgeColor = 'var(--accent-blue)'; }
              if (acc.type === 'Revenue') { typeBadgeBg = 'rgba(16, 185, 129, 0.1)'; typeBadgeColor = 'var(--accent-green)'; }
              if (acc.type === 'Expense') { typeBadgeBg = 'rgba(245, 158, 11, 0.1)'; typeBadgeColor = 'var(--accent-orange)'; }

              return (
                <tr key={acc.id} style={{ opacity: isInactive ? 0.6 : 1 }}>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-white)' }}>{acc.code}</td>
                  <td style={{ fontSize: '13.5px' }}>{acc.name}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: typeBadgeBg,
                      color: typeBadgeColor
                    }}>
                      {acc.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '13.5px', fontWeight: 700, textAlign: 'right', color: bal > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {currencySymbol}{bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleToggleActive(acc)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none', padding: 0 }}
                    >
                      {!isInactive ? (
                        <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <ToggleRight size={22} /> Active
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <ToggleLeft size={22} /> Inactive
                        </span>
                      )}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => handleDeleteAccount(acc)}
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
                      title="Delete account"
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

      {/* Add Account Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Ledger Account</h3>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccount}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Account Code *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 1025" 
                    value={newAccount.code} 
                    onChange={e => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unique ledger index (e.g., 1000 Assets, 2000 Liabilities, 4000 Income)</span>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Account Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Petty Cash Account" 
                    value={newAccount.name} 
                    onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Category *</label>
                  <select 
                    className="form-control" 
                    value={newAccount.type}
                    onChange={e => setNewAccount(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Account (Optional)</label>
                  <select 
                    className="form-control" 
                    value={newAccount.parent_id}
                    onChange={e => setNewAccount(prev => ({ ...prev, parent_id: e.target.value }))}
                  >
                    <option value="">None (Root Account)</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.code} - {acc.name} ({acc.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Save Account</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ChartOfAccounts;
