import { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { Search, Filter, RefreshCw, Calendar } from 'lucide-react';

const StockLogs = () => {
  const { tenantId, warehouses } = useInventory();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const fetchLogs = () => {
    setLoading(true);
    let url = `${apiBaseUrl}/inventory/stock?logs=true&tenant_id=${tenantId}`;
    if (warehouseFilter !== 'ALL') {
      url += `&warehouse_id=${warehouseFilter}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLogs(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching logs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [warehouseFilter, tenantId]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.remarks && log.remarks.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'ALL' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filters & Search Toolbar */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
          <div className="leads-search" style={{ margin: 0, minWidth: '240px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by product name, SKU, remarks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Type:</span>
            <select
              style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Transactions</option>
              <option value="IN">IN (Supply/Receipts)</option>
              <option value="OUT">OUT (Shipments/Sales)</option>
              <option value="TRANSFER">TRANSFER (Inter-warehouse)</option>
              <option value="ADJUSTMENT">ADJUSTMENT (Audits)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Warehouse:</span>
            <select
              style={{ padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              value={warehouseFilter}
              onChange={e => setWarehouseFilter(e.target.value)}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          className="modal-btn secondary" 
          onClick={fetchLogs}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
        >
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Logs Table */}
      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Product Details</th>
              <th>Warehouse</th>
              <th style={{ textAlign: 'center' }}>Quantity Change</th>
              <th>Transaction Type</th>
              <th>Remarks / Activity History</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading stock logs...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No stock movements found matching filter options.
                </td>
              </tr>
            ) : filteredLogs.map((log) => {
              let badgeColor = 'var(--text-muted)';
              let badgeBg = 'rgba(255,255,255,0.05)';
              if (log.type === 'IN') { badgeColor = 'var(--accent-green)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
              if (log.type === 'OUT') { badgeColor = 'var(--accent-red)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }
              if (log.type === 'TRANSFER') { badgeColor = 'var(--accent-blue)'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
              if (log.type === 'ADJUSTMENT') { badgeColor = 'var(--accent-yellow)'; badgeBg = 'rgba(245, 158, 11, 0.1)'; }

              return (
                <tr key={log.id}>
                  <td style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-white)' }}>{log.product_name}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>SKU: {log.product_sku}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{log.warehouse_name || 'N/A'}</td>
                  <td style={{ 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    fontWeight: 800, 
                    color: log.quantity_changed > 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}>
                    {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}33`
                    }}>
                      {log.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)', maxWidth: '280px', wordBreak: 'break-word' }}>
                    {log.remarks || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default StockLogs;
