import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Plus, X, ClipboardList, Trash2, Calendar, FileText, CheckCircle2, 
  Send, AlertCircle, ShoppingCart, ArrowDownToLine, RefreshCw, Eye
} from 'lucide-react';

const PurchaseOrders = () => {
  const { tenantId, suppliers, products, warehouses, toast, currencySymbol, refreshSharedData } = useInventory();

  const [orders, setOrders] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState('');

  // PO creation form state
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    items: [] // { product_id, quantity, unit_cost }
  });

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/orders?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching POs:", err))
      .finally(() => setLoading(false));
  };

  const fetchSuggestions = () => {
    setLoadingSuggestions(true);
    fetch(`${apiBaseUrl}/inventory/orders?reorder_suggestions=true&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuggestions(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching suggestions:", err))
      .finally(() => setLoadingSuggestions(false));
  };

  useEffect(() => {
    fetchOrders();
    fetchSuggestions();
  }, [tenantId]);

  const handleAddItemToForm = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setPoForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { 
          product_id: defaultProduct.id, 
          quantity: 10, 
          unit_cost: Number(defaultProduct.cost_price) || 0.00 
        }
      ]
    }));
  };

  const handleRemoveItemFromForm = (idx) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemFieldChange = (idx, field, value) => {
    setPoForm(prev => {
      const updatedItems = [...prev.items];
      updatedItems[idx][field] = value;
      
      // If product changes, auto update default unit cost
      if (field === 'product_id') {
        const prod = products.find(p => p.id === parseInt(value, 10));
        if (prod) {
          updatedItems[idx]['unit_cost'] = Number(prod.cost_price) || 0.00;
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const calculateFormTotal = () => {
    return poForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const handleCreatePoSubmit = (e) => {
    e.preventDefault();
    if (!poForm.supplier_id) {
      toast.error("Please select a supplier.");
      return;
    }
    if (poForm.items.length === 0) {
      toast.error("Please add at least one item to the order.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...poForm,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowCreateModal(false);
          fetchOrders();
          fetchSuggestions();
        } else {
          toast.error(data.error || "Failed to create Purchase Order.");
        }
      })
      .catch(err => console.error("Error creating PO:", err));
  };

  // Open Create PO and pre-fill with low stock suggestion item
  const handleTriggerReorder = (sugg) => {
    setPoForm({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'Sent', // Directly trigger shipment
      items: [
        {
          product_id: sugg.product_id,
          quantity: sugg.recommended_quantity,
          unit_cost: Number(sugg.cost_price) || 0.00
        }
      ]
    });
    setShowCreateModal(true);
  };

  const handleOpenReceive = (order) => {
    setSelectedOrder(order);
    setReceiveWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
    setShowReceiveModal(true);
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    if (!receiveWarehouseId) {
      toast.error("Please select a target warehouse.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedOrder.id,
        status: 'Received',
        warehouse_id: receiveWarehouseId,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowReceiveModal(false);
          fetchOrders();
          fetchSuggestions();
          refreshSharedData();
        } else {
          toast.error(data.error || "Receipt failed.");
        }
      })
      .catch(err => console.error("Error receiving PO:", err));
  };

  const handleOpenView = (order) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/orders?id=${order.id}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSelectedOrder(data.data);
          setShowViewModal(true);
        }
      })
      .catch(err => console.error("Error fetching PO details:", err))
      .finally(() => setLoading(false));
  };

  const updatePOStatusDirectly = (poId, newStatus) => {
    fetch(`${apiBaseUrl}/inventory/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: poId,
        status: newStatus,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchOrders();
        } else {
          toast.error(data.error || "Status update failed.");
        }
      });
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Low Stock Auto Reorder Suggestions Panel */}
      <div style={{
        background: 'rgba(249, 115, 22, 0.05)',
        border: '1px solid rgba(249, 115, 22, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} style={{ color: 'var(--accent-orange)' }} />
            Automated Reordering Suggestions (Low Stock)
          </h3>
          <button 
            className="modal-btn secondary" 
            onClick={fetchSuggestions}
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {loadingSuggestions ? (
            <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '13px' }}>Checking stock thresholds...</div>
          ) : suggestions.length === 0 ? (
            <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ✅ All products are fully stocked. No reorder recommendations currently.
            </div>
          ) : suggestions.map((sugg) => (
            <div 
              key={sugg.product_id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-white)', fontWeight: 600 }}>{sugg.product_name}</h4>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Available Stock: <strong style={{ color: 'var(--accent-orange)' }}>{sugg.total_stock} items</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Threshold Limit: {sugg.reorder_level} | Suggested Reorder: <strong>{sugg.recommended_quantity}</strong>
                </div>
              </div>
              <button 
                onClick={() => handleTriggerReorder(sugg)}
                className="add-lead-btn"
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  height: 'auto',
                  minHeight: 0,
                  fontWeight: 700,
                  background: 'var(--accent-orange)',
                  color: '#000',
                  gap: '4px',
                  flexShrink: 0
                }}
              >
                <Plus size={12} /> Raise PO
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main PO List */}
      <div className="leads-page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={18} style={{ color: 'var(--accent-cyan)' }} />
          Purchase Order Records
        </h3>
        <button 
          className="add-lead-btn" 
          onClick={() => {
            setPoForm({
              supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
              order_date: new Date().toISOString().split('T')[0],
              status: 'Draft',
              items: []
            });
            setShowCreateModal(true);
          }}
          style={{ gap: '6px' }}
        >
          <Plus size={16} /> Create Purchase Order
        </button>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>PO ID</th>
              <th>Supplier Name</th>
              <th>Order Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Shipment Courier</th>
              <th style={{ textAlign: 'center' }}>Action triggers</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading purchase orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No Purchase Orders recorded. Click Create Purchase Order above.</td></tr>
            ) : orders.map((po) => {
              let badgeColor = 'var(--text-muted)';
              let badgeBg = 'rgba(255,255,255,0.05)';
              if (po.status === 'Sent') { badgeColor = 'var(--accent-blue)'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
              if (po.status === 'Received') { badgeColor = 'var(--accent-green)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
              if (po.status === 'Cancelled') { badgeColor = 'var(--accent-red)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }

              return (
                <tr key={po.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>#PO-00{po.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{po.supplier_name}</td>
                  <td style={{ fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} style={{ color: 'var(--text-muted)' }} /> {po.order_date}</span>
                  </td>
                  <td style={{ fontSize: '13.5px', fontWeight: 600 }}>{currencySymbol}{Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}33`
                    }}>{po.status}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {po.status === 'Sent' ? (
                      <span style={{ color: 'var(--accent-cyan)' }}>🚚 Tracking Generated</span>
                    ) : (po.status === 'Received' ? (
                      <span style={{ color: 'var(--accent-green)' }}>✅ Delivered</span>
                    ) : '—')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleOpenView(po)} 
                        className="modal-btn secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> View Items
                      </button>

                      {po.status === 'Draft' && (
                        <button 
                          onClick={() => updatePOStatusDirectly(po.id, 'Sent')}
                          className="modal-btn secondary"
                          style={{ padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Send size={12} /> Send Supplier
                        </button>
                      )}

                      {po.status === 'Sent' && (
                        <button 
                          onClick={() => handleOpenReceive(po)}
                          className="add-lead-btn"
                          style={{ padding: '6px 10px', height: 'auto', minHeight: 0, fontSize: '11px', background: 'var(--accent-green)', color: '#000', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                        >
                          <ArrowDownToLine size={12} /> Receive Stock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container large" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Purchase Order</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePoSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Supplier Vendor *</label>
                    <select 
                      style={inputStyle} 
                      value={poForm.supplier_id} 
                      onChange={e => setPoForm({ ...poForm, supplier_id: e.target.value })}
                      required
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Order Date *</label>
                    <input type="date" style={inputStyle} value={poForm.order_date} onChange={e => setPoForm({ ...poForm, order_date: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Initial PO Status</label>
                    <select style={inputStyle} value={poForm.status} onChange={e => setPoForm({ ...poForm, status: e.target.value })}>
                      <option value="Draft">Draft (Internal review)</option>
                      <option value="Sent">Sent (Dispatched to vendor)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={handleAddItemToForm}
                      className="modal-btn secondary"
                      style={{ width: '100%', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> Add Product Item
                    </button>
                  </div>
                </div>

                {/* Items Grid List */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>PO Line Items</span>
                  
                  {poForm.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No items added yet. Click Add Product Item.
                    </div>
                  ) : poForm.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 40px', gap: '8px', alignItems: 'center' }}>
                      <select 
                        style={{ ...inputStyle, padding: '6px' }}
                        value={item.product_id}
                        onChange={e => handleItemFieldChange(idx, 'product_id', e.target.value)}
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>

                      <input 
                        type="number"
                        min="1"
                        style={{ ...inputStyle, padding: '6px' }}
                        value={item.quantity}
                        onChange={e => handleItemFieldChange(idx, 'quantity', parseInt(e.target.value, 10) || 0)}
                        placeholder="Qty"
                        required
                      />

                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 6px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currencySymbol}</span>
                        <input 
                          type="number" 
                          step="0.01"
                          style={{ width: '100%', border: 'none', background: 'none', padding: '6px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                          value={item.unit_cost}
                          onChange={e => handleItemFieldChange(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                          placeholder="Cost"
                          required
                        />
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleRemoveItemFromForm(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* total valuation block */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estimated Total PO Value:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {currencySymbol}{calculateFormTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Generate PO</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* RECEIVE STOCK WAREHOUSE SELECTION MODAL */}
      {showReceiveModal && selectedOrder && createPortal(
        <div className="modal-overlay" onClick={() => setShowReceiveModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Receive PO Stock</h2>
              <button className="modal-close" onClick={() => setShowReceiveModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleReceiveSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>PO Reference: <strong style={{ color: 'var(--text-primary)' }}>#PO-00{selectedOrder.id}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Supplier: <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.supplier_name}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>PO Value: <strong style={{ color: 'var(--text-primary)' }}>{currencySymbol}{Number(selectedOrder.total_amount).toLocaleString()}</strong></div>
                </div>

                <div>
                  <label style={labelStyle}>Designate Stock-In Warehouse *</label>
                  <select 
                    style={inputStyle} 
                    value={receiveWarehouseId} 
                    onChange={e => setReceiveWarehouseId(e.target.value)}
                    required
                  >
                    {warehouses.filter(w => w.status === 'Active').map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Warning: Receiving this order will instantly increase inventory quantity for all PO line items in this warehouse and generate supply logs.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowReceiveModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary" style={{ background: 'var(--accent-green)', color: '#000', fontWeight: 700 }}>Commit Stock In</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW PO ITEMS DETAILS MODAL */}
      {showViewModal && selectedOrder && createPortal(
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">PO Details - #PO-00{selectedOrder.id}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Supplier Organization:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.supplier_name}</strong>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {selectedOrder.supplier_email} <br/> {selectedOrder.supplier_phone}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Order Date:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.order_date}</strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Status: <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.status}</strong>
                  </span>
                </div>
              </div>

              {/* Items detail list */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table className="leads-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Product</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.product_name}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>{item.product_sku}</span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{currencySymbol}{Number(item.unit_cost).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{currencySymbol}{(item.quantity * item.unit_cost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Courier Shipment detail link */}
              {selectedOrder.courier && (
                <div style={{
                  background: 'rgba(34, 211, 238, 0.05)',
                  border: '1px solid rgba(34, 211, 238, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '12.5px'
                }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, display: 'block' }}>🚚 Linked Shipment Courier Details</span>
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div>Tracking Number: <strong>{selectedOrder.courier.tracking_number}</strong> ({selectedOrder.courier.courier_name})</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Route: {selectedOrder.courier.origin} → {selectedOrder.courier.destination}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedOrder.courier.status}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Amount:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  {currencySymbol}{Number(selectedOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

            </div>
            <div className="modal-footer">
              <button className="modal-btn primary" onClick={() => setShowViewModal(false)}>Close Details</button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default PurchaseOrders;
