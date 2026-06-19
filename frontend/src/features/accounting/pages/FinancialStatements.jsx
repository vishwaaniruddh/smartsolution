import { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { FileText, Printer, BarChart3, TrendingUp, Landmark, ShieldCheck } from 'lucide-react';

const FinancialStatements = () => {
  const { tenantId, currencySymbol, toast } = useAccounting();

  const [activeTab, setActiveTab] = useState('profit-loss'); // profit-loss, balance-sheet, trial
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = (type) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/accounting/reports?type=${type}&tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setReportData(res.data);
        } else {
          toast.showError(res.error || `Failed to calculate ${type} report.`);
        }
      })
      .catch(err => {
        console.error("Error generating report:", err);
        toast.showError("Connection error while generating financial statement.");
      })
      .finally(() => setLoading(false));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    setReportData(null);
  };

  useEffect(() => {
    setLoading(true);
    setReportData(null);
    fetchReport(activeTab);
  }, [tenantId, activeTab]);

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Generate and export real-time Trial Balances, Income Statements, and Balance Sheet statements.
          </p>
        </div>
        
        <button 
          className="modal-btn secondary"
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <Printer size={16} />
          Print Statement
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
        <button
          onClick={() => handleTabChange('profit-loss')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profit-loss' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'profit-loss' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => handleTabChange('balance-sheet')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'balance-sheet' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'balance-sheet' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => handleTabChange('trial')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'trial' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'trial' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s'
          }}
        >
          Trial Balance
        </button>
      </div>

      {/* Report Panel */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
          Computing balances...
        </div>
      ) : !reportData ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No ledger data available to compile reports.
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px',
          boxShadow: 'var(--shadow-md)',
          maxWidth: '800px',
          margin: '0 auto',
          width: '100%'
        }}>
          {/* Statement Header */}
          <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: '20px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-white)' }}>
              {activeTab === 'profit-loss' ? 'PROFIT & LOSS STATEMENT' : (activeTab === 'balance-sheet' ? 'BALANCE SHEET' : 'TRIAL BALANCE')}
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Multi-Tenant Accounting Suite • Fiscal Period: Real-time
            </span>
          </div>

          {/* 1. PROFIT & LOSS VIEW */}
          {activeTab === 'profit-loss' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Revenues section */}
              <div>
                <h4 style={{ color: 'var(--accent-green)', textTransform: 'uppercase', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Operating Revenues
                </h4>
                {!reportData.revenues || reportData.revenues.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px' }}>No revenue accounts recorded.</div>
                ) : reportData.revenues.map((rev, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{rev.code} - {rev.name}</span>
                    <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(rev.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 700, fontSize: '14px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-white)' }}>Total Gross Revenues</span>
                  <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(reportData.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Expenses section */}
              <div>
                <h4 style={{ color: 'var(--accent-orange)', textTransform: 'uppercase', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Operating Expenses
                </h4>
                {!reportData.expenses || reportData.expenses.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px' }}>No expense accounts recorded.</div>
                ) : reportData.expenses.map((exp, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{exp.code} - {exp.name}</span>
                    <span style={{ color: 'var(--text-white)' }}>({currencySymbol}{parseFloat(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 700, fontSize: '14px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-white)' }}>Total Operating Expenses</span>
                  <span style={{ color: 'var(--text-white)' }}>({currencySymbol}{parseFloat(reportData.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                </div>
              </div>

              {/* Net Profit */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '2px solid var(--border)',
                borderBottom: '2px double var(--text-white)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                fontWeight: 800,
                fontSize: '15px'
              }}>
                <span style={{ color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
                  NET OPERATING INCOME / PROFIT
                </span>
                <span style={{ color: (reportData.net_profit || 0) >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)' }}>
                  {currencySymbol}{parseFloat(reportData.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* 2. BALANCE SHEET VIEW */}
          {activeTab === 'balance-sheet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Assets Section */}
              <div>
                <h4 style={{ color: 'var(--accent-cyan)', textTransform: 'uppercase', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Assets (Debit Balances)
                </h4>
                {!reportData.assets || reportData.assets.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px' }}>No asset accounts mapped.</div>
                ) : reportData.assets.map((asset, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{asset.code} - {asset.name}</span>
                    <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(asset.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 800, fontSize: '14px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-white)' }}>TOTAL ASSETS</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{currencySymbol}{parseFloat(reportData.total_assets || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Liabilities Section */}
              <div>
                <h4 style={{ color: 'var(--accent-red)', textTransform: 'uppercase', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Liabilities (Credit Balances)
                </h4>
                {!reportData.liabilities || reportData.liabilities.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px' }}>No liability accounts mapped.</div>
                ) : reportData.liabilities.map((liab, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{liab.code} - {liab.name}</span>
                    <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(liab.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 700, fontSize: '13.5px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Liabilities</span>
                  <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(reportData.total_liabilities || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Equity Section */}
              <div>
                <h4 style={{ color: 'var(--accent-blue)', textTransform: 'uppercase', fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                  Equity
                </h4>
                {!reportData.equity || reportData.equity.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '16px' }}>No equity accounts mapped.</div>
                ) : reportData.equity.map((eq, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', fontSize: '13.5px' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{eq.code} - {eq.name}</span>
                    <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(eq.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', fontWeight: 700, fontSize: '13.5px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Equity</span>
                  <span style={{ color: 'var(--text-white)' }}>{currencySymbol}{parseFloat(reportData.total_equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Liabilities & Equity Grand Total */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '2px solid var(--border)',
                borderBottom: '2px double var(--text-white)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
                fontWeight: 800,
                fontSize: '15px'
              }}>
                <span style={{ color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Landmark size={18} style={{ color: 'var(--accent-blue)' }} />
                  TOTAL LIABILITIES & EQUITY
                </span>
                <span style={{ color: 'var(--accent-blue)' }}>
                  {currencySymbol}{parseFloat(reportData.total_liabilities_and_equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Equation Validator Box */}
              <div style={{
                background: Math.abs((reportData.total_assets || 0) - (reportData.total_liabilities_and_equity || 0)) < 0.02 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: Math.abs((reportData.total_assets || 0) - (reportData.total_liabilities_and_equity || 0)) < 0.02 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <ShieldCheck size={18} style={{ color: Math.abs((reportData.total_assets || 0) - (reportData.total_liabilities_and_equity || 0)) < 0.02 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                <span style={{ fontSize: '12.5px', color: Math.abs((reportData.total_assets || 0) - (reportData.total_liabilities_and_equity || 0)) < 0.02 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {Math.abs((reportData.total_assets || 0) - (reportData.total_liabilities_and_equity || 0)) < 0.02 
                    ? 'Balance Sheet Equation Satisfied: Assets = Liabilities + Equity.' 
                    : 'Discrepancy Detected: Balance Sheet is unbalanced. Ensure all transactions are fully double-entered.'}
                </span>
              </div>
            </div>
          )}

          {/* 3. TRIAL BALANCE VIEW */}
          {activeTab === 'trial' && (
            <div>
              <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table className="leads-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>Debit Amount</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!reportData.lines || reportData.lines.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No accounts have ledger activity this period.
                        </td>
                      </tr>
                    ) : reportData.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)' }}>{line.account_code}</td>
                        <td style={{ fontSize: '13px' }}>{line.account_name}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{line.account_type}</td>
                        <td style={{ fontSize: '13px', textAlign: 'right', color: parseFloat(line.debit || 0) > 0 ? 'var(--text-white)' : 'var(--text-muted)' }}>
                          {parseFloat(line.debit || 0) > 0 ? `${currencySymbol}${parseFloat(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td style={{ fontSize: '13px', textAlign: 'right', color: parseFloat(line.credit || 0) > 0 ? 'var(--text-white)' : 'var(--text-muted)' }}>
                          {parseFloat(line.credit || 0) > 0 ? `${currencySymbol}${parseFloat(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', fontWeight: 800 }}>
                      <td colSpan="3" style={{ fontSize: '13.5px', color: 'var(--text-white)' }}>Grand Balanced Total</td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--accent-cyan)' }}>
                        {currencySymbol}{parseFloat(reportData.total_debit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontSize: '13.5px', textAlign: 'right', color: 'var(--accent-cyan)' }}>
                        {currencySymbol}{parseFloat(reportData.total_credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Equation check */}
              <div style={{
                background: Math.abs((reportData.total_debit || 0) - (reportData.total_credit || 0)) < 0.02 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: Math.abs((reportData.total_debit || 0) - (reportData.total_credit || 0)) < 0.02 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '20px'
              }}>
                <ShieldCheck size={18} style={{ color: Math.abs((reportData.total_debit || 0) - (reportData.total_credit || 0)) < 0.02 ? 'var(--accent-green)' : 'var(--accent-red)' }} />
                <span style={{ fontSize: '12.5px', color: Math.abs((reportData.total_debit || 0) - (reportData.total_credit || 0)) < 0.02 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {Math.abs((reportData.total_debit || 0) - (reportData.total_credit || 0)) < 0.02 
                    ? 'Trial Balance Equations Satisfied: Debits equal Credits.' 
                    : 'Discrepancy: Sum of Debits does not equal Sum of Credits. Please verify ledger postings.'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default FinancialStatements;
