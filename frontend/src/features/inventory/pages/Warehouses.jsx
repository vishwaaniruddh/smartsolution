import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Plus, Edit3, Trash2, X, Warehouse, MapPin, 
  ArrowLeftRight, Settings2, ShieldCheck, Activity
} from 'lucide-react';

const Warehouses = () => {
  const { tenantId, warehouses, products, refreshSharedData, toast, currencySymbol } = useInventory();

  const [activeWarehouse, setActiveWarehouse] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Modals state
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', location: '', status: 'Active' });

  const [selectedProductStock, setSelectedProductStock] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ quantity: 0, remarks: '' });
  const [transferForm, setTransferForm] = useState({ target_warehouse_id: '', quantity: 0, remarks: '' });

  const fetchStock = (wId) => {
    setLoadingStock(true);
    fetch(`${apiBaseUrl}/inventory/stock?warehouse_id=${wId}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setWarehouseStock(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching stocks:", err))
      .finally(() => setLoadingStock(false));
  };

  useEffect(() => {
    if (activeWarehouse) {
      fetchStock(activeWarehouse.id);
    } else if (warehouses.length > 0) {
      setActiveWarehouse(warehouses[0]);
      fetchStock(warehouses[0].id);
    }
  }, [activeWarehouse, warehouses, tenantId]);

  const handleWarehouseSubmit = (e) => {
    e.preventDefault();
    if (!warehouseForm.name) return;

    const url = `${apiBaseUrl}/inventory/warehouses`;
    const payload = { ...warehouseForm, tenant_id: tenantId };
    if (editingWarehouse) payload.id = editingWarehouse.id;

    fetch(url, {
      method: editingWarehouse ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowWarehouseModal(false);
          refreshSharedData();
        } else {
          toast.error(data.error || "Failed to save warehouse.");
        }
      })
      .catch(err => console.error("Error saving warehouse:", err));
  };

  const handleWarehouseDelete = (wId) => {
    if (!confirm("Are you sure you want to delete this warehouse? This is only possible if stock is empty.")) return;

    fetch(`${apiBaseUrl}/inventory/warehouses?id=${wId}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          refreshSharedData();
          if (activeWarehouse && activeWarehouse.id === wId) {
            setActiveWarehouse(null);
            setWarehouseStock([]);
          }
        } else {
          toast.error(data.error || "Delete failed.");
        }
      });
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    if (adjustForm.quantity === 0) {
      toast.error("Please enter a non-zero adjustment quantity.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ADJUSTMENT',
        product_id: selectedProductStock.product_id,
        warehouse_id: activeWarehouse.id,
        quantity_changed: adjustForm.quantity,
        remarks: adjustForm.remarks,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowAdjustModal(false);
          fetchStock(activeWarehouse.id);
          refreshSharedData();
        } else {
          toast.error(data.error || "Adjustment failed.");
        }
      })
      .catch(err => console.error("Error adjusting stock:", err));
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferForm.target_warehouse_id) {
      toast.error("Please select a destination warehouse.");
      return;
    }
    if (transferForm.quantity <= 0) {
      toast.error("Please enter a positive transfer quantity.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TRANSFER',
        product_id: selectedProductStock.product_id,
        from_warehouse_id: activeWarehouse.id,
        to_warehouse_id: transferForm.target_warehouse_id,
        quantity: transferForm.quantity,
        remarks: transferForm.remarks,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowTransferModal(false);
          fetchStock(activeWarehouse.id);
          refreshSharedData();
        } else {
          toast.error(data.error || "Transfer failed.");
        }
      })
      .catch(err => console.error("Error transferring stock:", err));
  };

  const openWarehouseAdd = () => {
    setEditingWarehouse(null);
    setWarehouseForm({ name: '', location: '', status: 'Active' });
    setShowWarehouseModal(true);
  };

  const openWarehouseEdit = (w) => {
    setEditingWarehouse(w);
    setWarehouseForm({ name: w.name, location: w.location, status: w.status });
    setShowWarehouseModal(true);
  };

  const openAdjustModal = (item) => {
    setSelectedProductStock(item);
    setAdjustForm({ quantity: 0, remarks: '' });
    setShowAdjustModal(true);
  };

  const openTransferModal = (item) => {
    setSelectedProductStock(item);
    setTransferForm({ target_warehouse_id: '', quantity: 0, remarks: '' });
    setShowTransferModal(true);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Warehouses Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)' }}>
          Warehouse Locations
        </h3>
        <button className="add-lead-btn" onClick={openWarehouseAdd} style={{ gap: '6px' }}>
          <Plus size={16} /> Add Warehouse
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {warehouses.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No warehouses registered yet. Add a warehouse to begin managing stocks.
          </div>
        ) : warehouses.map(w => {
          const isActive = activeWarehouse && activeWarehouse.id === w.id;
          return (
            <div 
              key={w.id}
              onClick={() => setActiveWarehouse(w)}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                padding: '20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: isActive ? '0 0 10px -2px rgba(34, 211, 238, 0.2)' : 'var(--shadow-sm)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                    background: isActive ? 'rgba(34, 211, 238, 0.1)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyCenter: 'center',
                    justifyContent: 'center', border: `1px solid ${isActive ? 'rgba(34, 211, 238, 0.2)' : 'var(--border)'}`
                  }}>
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--text-white)', fontWeight: 600 }}>{w.name}</h4>
                    {w.location && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <MapPin size={11} /> {w.location}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => openWarehouseEdit(w)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={13} /></button>
                  <button onClick={() => handleWarehouseDelete(w.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <span>Stock: <strong style={{ color: 'var(--text-primary)' }}>{w.total_items || 0} items</strong></span>
                <span>Types: <strong style={{ color: 'var(--text-primary)' }}>{w.unique_products || 0} items</strong></span>
                <span style={{
                  fontSize: '9.5px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  color: w.status === 'Active' ? 'var(--accent-green)' : 'var(--text-muted)',
                  background: w.status === 'Active' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${w.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`
                }}>{w.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Warehouse Stock Details */}
      {activeWarehouse && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
            Stock Levels in {activeWarehouse.name}
          </h3>

          <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Reorder Level</th>
                  <th style={{ textAlign: 'center' }}>Current Stock</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingStock ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading warehouse stock...</td></tr>
                ) : warehouseStock.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No inventory mapped in this warehouse. Use Adjust Stock to add items manually.
                    </td>
                  </tr>
                ) : warehouseStock.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const limit = Number(item.reorder_level) || 0;
                  const isLow = qty <= limit;
                  return (
                    <tr key={item.product_id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.product_name}</td>
                      <td>{item.product_sku}</td>
                      <td>{item.product_category}</td>
                      <td style={{ textAlign: 'center' }}>{item.reorder_level}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span style={{
                          color: isLow ? 'var(--accent-orange)' : 'var(--accent-green)',
                          background: isLow ? 'rgba(249, 115, 22, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: isLow ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          {qty} items
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button 
                            className="modal-btn secondary"
                            onClick={() => openAdjustModal(item)}
                            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}
                          >
                            Adjust Stock
                          </button>
                          <button 
                            className="modal-btn secondary"
                            onClick={() => openTransferModal(item)}
                            style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(34, 211, 238, 0.2)', color: 'var(--accent-cyan)' }}
                          >
                            <ArrowLeftRight size={11} /> Transfer Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Quick stock mapper helper */}
          {warehouseStock.length === 0 && !loadingStock && (
            <div style={{
              marginTop: '10px',
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Quickly map an existing catalog product to this warehouse:</span>
              <button 
                className="modal-btn primary"
                onClick={() => {
                  if (products.length === 0) {
                    toast.error("Please add products to the catalog first.");
                    return;
                  }
                  openAdjustModal({ product_id: products[0].id, product_name: products[0].name, product_sku: products[0].sku, quantity: 0 });
                }}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                Map Initial Stock
              </button>
            </div>
          )}
        </div>
      )}

      {/* Warehouse CREATE/EDIT Modal */}
      {showWarehouseModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowWarehouseModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button className="modal-close" onClick={() => setShowWarehouseModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleWarehouseSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Warehouse Name *</label>
                  <input style={inputStyle} value={warehouseForm.name} onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })} required placeholder="e.g. Central Warehouse" />
                </div>
                <div>
                  <label style={labelStyle}>Location / Address</label>
                  <input style={inputStyle} value={warehouseForm.location} onChange={e => setWarehouseForm({ ...warehouseForm, location: e.target.value })} placeholder="e.g. Dallas, TX" />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={warehouseForm.status} onChange={e => setWarehouseForm({ ...warehouseForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowWarehouseModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingWarehouse ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustModal && selectedProductStock && createPortal(
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-container" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Adjust Stock Level</h2>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdjustSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Warehouse: <strong style={{ color: 'var(--text-primary)' }}>{activeWarehouse.name}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Product: <strong style={{ color: 'var(--text-primary)' }}>{selectedProductStock.product_name} ({selectedProductStock.product_sku})</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Current Stock: <strong style={{ color: 'var(--text-primary)' }}>{selectedProductStock.quantity || 0} items</strong></div>
                </div>

                {/* If mapping new stock */}
                {selectedProductStock.quantity === undefined && (
                  <div>
                    <label style={labelStyle}>Select Catalog Product *</label>
                    <select 
                      style={inputStyle} 
                      value={selectedProductStock.product_id}
                      onChange={e => {
                        const found = products.find(p => p.id === intval(e.target.value));
                        setSelectedProductStock({ product_id: e.target.value, product_name: found?.name, product_sku: found?.sku });
                      }}
                    >
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Quantity Change *</label>
                  <input 
                    type="number" 
                    style={inputStyle} 
                    value={adjustForm.quantity} 
                    onChange={e => setAdjustForm({ ...adjustForm, quantity: intval(e.target.value) })}
                    placeholder="e.g. +20 to add, -10 to reduce"
                    required 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Enter positive numbers to stock-in. Enter negative numbers to stock-out.
                  </span>
                </div>

                <div>
                  <label style={labelStyle}>Remarks / Reason *</label>
                  <input 
                    style={inputStyle} 
                    value={adjustForm.remarks} 
                    onChange={e => setAdjustForm({ ...adjustForm, remarks: e.target.value })} 
                    placeholder="e.g. Monthly audit adjustment / Damaged goods"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* TRANSFER STOCK MODAL */}
      {showTransferModal && selectedProductStock && createPortal(
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-container" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Transfer Warehouse Stock</h2>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>From Warehouse: <strong style={{ color: 'var(--text-primary)' }}>{activeWarehouse.name}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Product: <strong style={{ color: 'var(--text-primary)' }}>{selectedProductStock.product_name}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Available Stock: <strong style={{ color: 'var(--text-primary)' }}>{selectedProductStock.quantity} items</strong></div>
                </div>

                <div>
                  <label style={labelStyle}>To Warehouse *</label>
                  <select 
                    style={inputStyle} 
                    value={transferForm.target_warehouse_id} 
                    onChange={e => setTransferForm({ ...transferForm, target_warehouse_id: e.target.value })}
                    required
                  >
                    <option value="">Select Destination Warehouse</option>
                    {warehouses.filter(w => w.id !== activeWarehouse.id && w.status === 'Active').map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Transfer Quantity *</label>
                  <input 
                    type="number" 
                    min="1"
                    max={selectedProductStock.quantity}
                    style={inputStyle} 
                    value={transferForm.quantity} 
                    onChange={e => setTransferForm({ ...transferForm, quantity: intval(e.target.value) })}
                    required 
                  />
                </div>

                <div>
                  <label style={labelStyle}>Remarks</label>
                  <input 
                    style={inputStyle} 
                    value={transferForm.remarks} 
                    onChange={e => setTransferForm({ ...transferForm, remarks: e.target.value })} 
                    placeholder="e.g. Stock replenishment"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Transfer Stock</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

// Simple integer conversion helper
function intval(v) {
  const p = parseInt(v, 10);
  return isNaN(p) ? 0 : p;
}

export default Warehouses;
