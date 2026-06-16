import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Package, DollarSign, AlertTriangle, Truck, Warehouse, 
  ArrowRight, Activity, Plus, ShieldAlert
} from 'lucide-react';

const InventoryDashboard = () => {
  const { tenantId, currencySymbol, activeRole, suppliers, toast, refreshSharedData } = useInventory();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    total_products: 0,
    stock_valuation: 0,
    low_stock_count: 0,
    active_shipments: 0,
    distribution: [],
    recent_logs: [],
    low_stock_details: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});

  const fetchDashboardData = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/dashboard?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setMetrics(data.data);
        }
      })
      .catch(err => console.error("Error fetching dashboard details:", err))
      .finally(() => setLoading(false));
  };

  const handleOneClickPO = (prod) => {
    const defaultSupplier = suppliers.length > 0 ? suppliers[0].id : '';
    const supplierId = selectedSuppliers[prod.id] || defaultSupplier;
    if (!supplierId) {
      toast.error("No supplier selected or available. Please register a supplier first.");
      return;
    }
    
    const qty = Number(prod.reorder_level) * 2 - Number(prod.total_stock);
    const recommendedQty = qty <= 0 ? 10 : qty;
    
    const poPayload = {
      supplier_id: Number(supplierId),
      order_date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      items: [
        {
          product_id: prod.id,
          quantity: recommendedQty,
          unit_cost: Number(prod.cost_price) || 0.00
        }
      ]
    };

    fetch(`${apiBaseUrl}/inventory/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...poPayload,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Purchase Order #PO-00${data.id} created successfully as Draft!`);
          fetchDashboardData();
          if (refreshSharedData) refreshSharedData();
        } else {
          toast.error(data.error || "Failed to create Purchase Order.");
        }
      })
      .catch(err => {
        console.error("Error creating PO:", err);
        toast.error("Network error when creating Purchase Order.");
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading inventory metrics...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top metrics dashboard cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Valuation */}
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
            <DollarSign size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {currencySymbol}{Number(metrics.stock_valuation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Stock Valuation</div>
          </div>
        </div>

        {/* Card 2: Catalog Products */}
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
            <Package size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.total_products}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Catalog Products</div>
          </div>
        </div>

        {/* Card 3: Low Stock Warnings */}
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '24px', 
          borderRadius: 'var(--radius-lg)', 
          border: metrics.low_stock_count > 0 ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: 'var(--radius-md)', 
            background: metrics.low_stock_count > 0 
              ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.05) 100%)' 
              : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', 
            color: metrics.low_stock_count > 0 ? 'var(--accent-orange)' : 'var(--text-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: metrics.low_stock_count > 0 ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid var(--border)'
          }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.low_stock_count > 0 ? 'var(--accent-orange)' : 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.low_stock_count}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Low Stock Alert</div>
          </div>
        </div>

        {/* Card 4: Active Courier Shipments */}
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
            <Truck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.active_shipments}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Active Shipments</div>
          </div>
        </div>

      </div>

      {/* Critical Stock Alert Banner */}
      {metrics.low_stock_count > 0 && activeRole !== 'Sales Associate' && (
        <div style={{
          background: 'rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ color: 'var(--accent-orange)' }}><ShieldAlert size={28} /></div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-white)', fontWeight: 700 }}>Critical Stock Level Detected</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                There are {metrics.low_stock_count} products running below their set reorder limits. Place purchase orders with suppliers now.
              </p>
            </div>
          </div>
          <button 
            className="add-lead-btn" 
            onClick={() => navigate('/feature/inventory/orders')}
            style={{ background: 'var(--accent-orange)', color: '#000', gap: '6px', fontWeight: 700 }}
          >
            Review Reorder Recommendations
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Middle Grid: Stock by Warehouse & Low Stock Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Warehouse Distributions */}
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
            <Warehouse size={18} style={{ color: 'var(--accent-cyan)' }} />
            Stock by Warehouse
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metrics.distribution.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                No warehouse stock mapped.
              </div>
            ) : metrics.distribution.map((w, idx) => {
              const maxVal = Math.max(...metrics.distribution.map(d => Number(d.stock_value) || 1));
              const percentage = maxVal > 0 ? (Number(w.stock_value) / maxVal) * 100 : 0;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.warehouse_name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <strong>{w.total_quantity} items</strong> ({currencySymbol}{Number(w.stock_value).toLocaleString()})
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.max(5, percentage)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))', 
                      borderRadius: '4px' 
                    }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Alerts */}
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
            <AlertTriangle size={18} style={{ color: 'var(--accent-orange)' }} />
            Low Stock Alerts Details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metrics.low_stock_details.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                ✅ All stock levels are currently healthy!
              </div>
            ) : metrics.low_stock_details.map((prod, idx) => {
              const stock = Number(prod.total_stock);
              const limit = Number(prod.reorder_level) || 1;
              const ratio = Math.min(100, (stock / limit) * 100);
              const progressColor = stock === 0 
                ? 'var(--accent-red)' 
                : (stock <= limit * 0.5 ? 'var(--accent-orange)' : 'var(--accent-yellow)');
              
              const defaultSupplier = suppliers.length > 0 ? suppliers[0].id : '';
              const chosenSupplier = selectedSuppliers[prod.id] || defaultSupplier;

              return (
                <div key={idx} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px', 
                  padding: '14px', 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', fontSize: '13.5px' }}>{prod.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {prod.sku}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: progressColor, fontWeight: 700, fontSize: '13px' }}>
                        {stock} / {limit} left
                      </span>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Reorder Qty: <strong>{limit * 2 - stock}</strong>
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${ratio}%`, 
                      height: '100%', 
                      background: progressColor, 
                      borderRadius: '3px' 
                    }}></div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <select 
                        value={chosenSupplier}
                        onChange={(e) => setSelectedSuppliers(prev => ({ ...prev, [prod.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                      >
                        {suppliers.length === 0 ? (
                          <option value="">No suppliers available</option>
                        ) : suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={() => handleOneClickPO(prod)}
                      className="add-lead-btn"
                      disabled={suppliers.length === 0}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        height: 'auto',
                        minHeight: 0,
                        fontWeight: 700,
                        background: 'var(--accent-orange)',
                        color: '#000',
                        gap: '4px',
                        cursor: suppliers.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: suppliers.length === 0 ? 0.5 : 1
                      }}
                    >
                      <Plus size={12} /> Raise PO
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Activities Stock Logs */}
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
            Recent Stock Transactions
          </h3>
          <button 
            className="modal-btn secondary" 
            onClick={() => navigate('/feature/inventory/logs')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            View All Logs
          </button>
        </div>

        <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Activity Type</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {metrics.recent_logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No stock transaction logs cataloged yet.
                  </td>
                </tr>
              ) : metrics.recent_logs.map((log) => {
                let badgeColor = 'var(--text-muted)';
                let badgeBg = 'rgba(255,255,255,0.05)';
                if (log.type === 'IN') { badgeColor = 'var(--accent-green)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
                if (log.type === 'OUT') { badgeColor = 'var(--accent-red)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }
                if (log.type === 'TRANSFER') { badgeColor = 'var(--accent-blue)'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
                if (log.type === 'ADJUSTMENT') { badgeColor = 'var(--accent-yellow)'; badgeBg = 'rgba(245, 158, 11, 0.1)'; }

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: '12.5px' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ fontSize: '12.5px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{log.product_name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.product_sku}</span>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>{log.warehouse_name || 'N/A'}</td>
                    <td style={{ fontSize: '12.5px', fontWeight: 700, color: log.quantity_changed > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
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
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.remarks || '—'}</td>
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

export default InventoryDashboard;
