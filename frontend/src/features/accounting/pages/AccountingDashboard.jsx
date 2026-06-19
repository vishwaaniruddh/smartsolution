import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccounting } from '../context/AccountingContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  DollarSign, ArrowUpRight, ArrowDownLeft, Receipt, 
  FileSpreadsheet, ClipboardList, Wallet, Plus, ArrowRight, Activity
} from 'lucide-react';

const AccountingDashboard = () => {
  const { tenantId, currencySymbol, activeRole, toast } = useAccounting();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    cash_balance: 0.00,
    receivables: 0.00,
    payables: 0.00,
    net_profit: 0.00,
    total_revenue: 0.00,
    total_expense: 0.00,
    recent_transactions: [],
    recent_invoices: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      // Fetch Invoices
      fetch(`${apiBaseUrl}/accounting/invoices?tenant_id=${tenantId}`).then(r => r.json()),
      // Fetch Bills
      fetch(`${apiBaseUrl}/accounting/bills?tenant_id=${tenantId}`).then(r => r.json()),
      // Fetch Reports - P&L
      fetch(`${apiBaseUrl}/accounting/reports?type=profit-loss&tenant_id=${tenantId}`).then(r => r.json()),
      // Fetch Reports - Trial Balance
      fetch(`${apiBaseUrl}/accounting/reports?type=trial&tenant_id=${tenantId}`).then(r => r.json()),
      // Fetch Transactions
      fetch(`${apiBaseUrl}/accounting/transactions?tenant_id=${tenantId}`).then(r => r.json())
    ]).then(([invRes, billRes, plRes, trialRes, txRes]) => {
      let cashBal = 0.00;
      let receivablesBal = 0.00;
      let payablesBal = 0.00;
      let profit = 0.00;
      let rev = 0.00;
      let exp = 0.00;

      // 1. Calculate Cash & Bank from Trial Balance (Code 1020 or Cash accounts)
      if (trialRes.success && trialRes.data && trialRes.data.lines) {
        trialRes.data.lines.forEach(line => {
          if (line.account_code === '1020' || line.account_code === '1010') {
            // Asset accounts: debit - credit
            cashBal += (line.debit - line.credit);
          }
        });
      }

      // 2. Receivables from unpaid Invoices
      if (invRes.success && invRes.data) {
        invRes.data.forEach(i => {
          if (i.status !== 'Void') {
            receivablesBal += parseFloat(i.amount_due || 0);
          }
        });
      }

      // 3. Payables from unpaid Bills
      if (billRes.success && billRes.data) {
        billRes.data.forEach(b => {
          if (b.status !== 'Void') {
            payablesBal += parseFloat(b.amount_due || 0);
          }
        });
      }

      // 4. Revenues, Expenses, Profits
      if (plRes.success && plRes.data) {
        profit = parseFloat(plRes.data.net_profit || 0);
        rev = parseFloat(plRes.data.total_revenue || 0);
        exp = parseFloat(plRes.data.total_expense || 0);
      }

      setMetrics({
        cash_balance: cashBal,
        receivables: receivablesBal,
        payables: payablesBal,
        net_profit: profit,
        total_revenue: rev,
        total_expense: exp,
        recent_transactions: txRes.success ? (txRes.data || []).slice(0, 5) : [],
        recent_invoices: invRes.success ? (invRes.data || []).slice(0, 5) : []
      });
    }).catch(err => {
      console.error("Error loading dashboard metrics:", err);
      toast.showError("Failed to fetch accounting metrics.");
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading financial overview...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Cash & Bank Balance */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)', 
            color: 'var(--accent-cyan)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(34, 211, 238, 0.2)'
          }}>
            <Wallet size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {currencySymbol}{metrics.cash_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Cash & Bank Balance</div>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)', 
            color: 'var(--accent-green)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <ArrowUpRight size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {currencySymbol}{metrics.receivables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Accounts Receivable (AR)</div>
          </div>
        </div>

        {/* Accounts Payable */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)', 
            color: 'var(--accent-red)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <ArrowDownLeft size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {currencySymbol}{metrics.payables.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Accounts Payable (AP)</div>
          </div>
        </div>

        {/* Net Income / Profit */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)', 
            color: 'var(--accent-blue)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <DollarSign size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.net_profit >= 0 ? 'var(--text-primary)' : 'var(--accent-red)', lineHeight: 1.1 }}>
              {currencySymbol}{metrics.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Net Profit (This Period)</div>
          </div>
        </div>

      </div>

      {/* Quick Action Hub */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-white)', fontWeight: 700 }}>Quick Entry Panel</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button 
            className="add-lead-btn" 
            onClick={() => navigate('/feature/accounting/journals')}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'center' }}
          >
            <Plus size={16} style={{ color: 'var(--accent-cyan)' }} />
            Post Journal Entry
          </button>
          <button 
            className="add-lead-btn" 
            onClick={() => navigate('/feature/accounting/invoices')}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'center' }}
          >
            <Receipt size={16} style={{ color: 'var(--accent-green)' }} />
            Create Customer Invoice
          </button>
          <button 
            className="add-lead-btn" 
            onClick={() => navigate('/feature/accounting/bills')}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'center' }}
          >
            <ClipboardList size={16} style={{ color: 'var(--accent-orange)' }} />
            Record Vendor Bill
          </button>
          <button 
            className="add-lead-btn" 
            onClick={() => navigate('/feature/accounting/transactions')}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'center' }}
          >
            <Wallet size={16} style={{ color: 'var(--accent-blue)' }} />
            Log Bank Transaction
          </button>
        </div>
      </div>

      {/* Grid: Financial Health breakdown & Recent Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Financial Health Structure */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--accent-cyan)' }} />
            Operating Profit Margin
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '10px' }}>
            {/* Revenue vs Expenses */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Revenue Breakdown</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong>{currencySymbol}{metrics.total_revenue.toLocaleString()}</strong> Inflow
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${metrics.total_revenue > 0 ? 100 : 0}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--accent-green), #10b981)', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Operating Expenses</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong>{currencySymbol}{metrics.total_expense.toLocaleString()}</strong> Outflow
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--border)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${metrics.total_revenue > 0 ? Math.min(100, (metrics.total_expense / metrics.total_revenue) * 100) : 0}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-red))', 
                  borderRadius: '5px' 
                }}></div>
              </div>
            </div>

            {/* Quick Summary ratios */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Expense/Revenue Ratio</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'block' }}>
                  {metrics.total_revenue > 0 ? ((metrics.total_expense / metrics.total_revenue) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Profit Margin</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px', display: 'block' }}>
                  {metrics.total_revenue > 0 ? ((metrics.net_profit / metrics.total_revenue) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Bank Transactions */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
              Cashbook Activity
            </h3>
            <button 
              className="modal-btn secondary" 
              onClick={() => navigate('/feature/accounting/transactions')}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              View Cashbook
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {metrics.recent_transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent bank or cash transactions found.
              </div>
            ) : metrics.recent_transactions.map((tx) => {
              const isReceipt = tx.type === 'Receipt';
              return (
                <div key={tx.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isReceipt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isReceipt ? 'var(--accent-green)' : 'var(--accent-red)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isReceipt ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        {tx.reference || (isReceipt ? 'Customer Receipt' : 'Vendor Payment')}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {tx.payment_date} • {tx.payment_method}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: isReceipt ? 'var(--accent-green)' : 'var(--accent-red)' 
                    }}>
                      {isReceipt ? '+' : '-'}{currencySymbol}{parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    {tx.invoice_number && (
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Inv: {tx.invoice_number}
                      </span>
                    )}
                    {tx.bill_number && (
                      <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Bill: {tx.bill_number}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Invoices list */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} style={{ color: 'var(--accent-cyan)' }} />
            Receivable Billings Status
          </h3>
          <button 
            className="modal-btn secondary" 
            onClick={() => navigate('/feature/accounting/invoices')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Manage Invoices
          </button>
        </div>

        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer Name</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Amount Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No recent invoices created.
                  </td>
                </tr>
              ) : metrics.recent_invoices.map((inv) => {
                let statusColor = 'var(--text-muted)';
                let statusBg = 'rgba(255,255,255,0.05)';
                if (inv.status === 'Draft') { statusColor = 'var(--accent-yellow)'; statusBg = 'rgba(245, 158, 11, 0.1)'; }
                if (inv.status === 'Open') { statusColor = 'var(--accent-cyan)'; statusBg = 'rgba(34, 211, 238, 0.1)'; }
                if (inv.status === 'Paid') { statusColor = 'var(--accent-green)'; statusBg = 'rgba(16, 185, 129, 0.1)'; }
                if (inv.status === 'Overdue') { statusColor = 'var(--accent-red)'; statusBg = 'rgba(239, 68, 68, 0.1)'; }

                return (
                  <tr key={inv.id}>
                    <td style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>{inv.invoice_number}</td>
                    <td style={{ fontSize: '13px' }}>{inv.customer_name}</td>
                    <td style={{ fontSize: '12.5px' }}>{inv.issue_date}</td>
                    <td style={{ fontSize: '12.5px' }}>{inv.due_date}</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{currencySymbol}{parseFloat(inv.total_amount).toLocaleString()}</td>
                    <td style={{ fontSize: '13px', fontWeight: 700, color: parseFloat(inv.amount_due) > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                      {currencySymbol}{parseFloat(inv.amount_due).toLocaleString()}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AccountingDashboard;
