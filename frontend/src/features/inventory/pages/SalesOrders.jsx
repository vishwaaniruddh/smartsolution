import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Plus, X, ClipboardList, Trash2, Calendar, FileText, CheckCircle2, 
  Send, AlertCircle, ShoppingBag, ArrowUpFromLine, Eye
} from 'lucide-react';

const SalesOrders = () => {
  const { tenantId, products, warehouses, toast, currencySymbol, refreshSharedData } = useInventory();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dispatchWarehouseId, setDispatchWarehouseId] = useState('');

  // Sales Order creation form state
  const [soForm, setSoForm] = useState({
    customer_name: '',
    order_date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    items: [] // { product_id, quantity, unit_price }
  });

  const fetchOrders = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/sales-orders?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching Sales Orders:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [tenantId]);

  const handleAddItemToForm = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setSoForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { 
          product_id: defaultProduct.id, 
          quantity: 5, 
          unit_price: Number(defaultProduct.sale_price) || 0.00 
        }
      ]
    }));
  };

  const handleRemoveItemFromForm = (idx) => {
    setSoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemFieldChange = (idx, field, value) => {
    setSoForm(prev => {
      const updatedItems = [...prev.items];
      updatedItems[idx][field] = value;
      
      // If product changes, auto update default unit price
      if (field === 'product_id') {
        const prod = products.find(p => p.id === parseInt(value, 10));
        if (prod) {
          updatedItems[idx]['unit_price'] = Number(prod.sale_price) || 0.00;
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const calculateFormTotal = () => {
    return soForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleCreateSoSubmit = (e) => {
    e.preventDefault();
    if (!soForm.customer_name) {
      toast.error("Please enter a customer name.");
      return;
    }
    if (soForm.items.length === 0) {
      toast.error("Please add at least one item to the order.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/sales-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...soForm,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowCreateModal(false);
          fetchOrders();
        } else {
          toast.error(data.error || "Failed to create Sales Order.");
        }
      })
      .catch(err => console.error("Error creating Sales Order:", err));
  };

  const handleOpenDispatch = (order) => {
    setSelectedOrder(order);
    setDispatchWarehouseId(warehouses.length > 0 ? warehouses[0].id : '');
    setShowDispatchModal(true);
  };

  const handleDispatchSubmit = (e) => {
    e.preventDefault();
    if (!dispatchWarehouseId) {
      toast.error("Please select a source warehouse.");
      return;
    }

    fetch(`${apiBaseUrl}/inventory/sales-orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedOrder.id,
        status: 'Shipped',
        warehouse_id: dispatchWarehouseId,
        tenant_id: tenantId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowDispatchModal(false);
          fetchOrders();
          refreshSharedData();
        } else {
          toast.error(data.error || "Dispatch failed.");
        }
      })
      .catch(err => console.error("Error dispatching Sales Order:", err));
  };

  const handleOpenView = (order) => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/sales-orders?id=${order.id}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSelectedOrder(data.data);
          setShowViewModal(true);
        }
      })
      .catch(err => console.error("Error fetching Sales Order details:", err))
      .finally(() => setLoading(false));
  };

  const updateSOStatusDirectly = (soId, newStatus) => {
    fetch(`${apiBaseUrl}/inventory/sales-orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: soId,
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

  const handleDeleteSo = (soId) => {
    if (!window.confirm("Are you sure you want to delete this Sales Order?")) return;
    fetch(`${apiBaseUrl}/inventory/sales-orders?id=${soId}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchOrders();
        } else {
          toast.error(data.error || "Delete failed.");
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
      
      {/* Page Header */}
      <div className="leads-page-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} style={{ color: 'var(--accent-cyan)' }} />
          Customer Sales Orders (Stock OUT)
        </h3>
        <button 
          className="add-lead-btn" 
          onClick={() => {
            setSoForm({
              customer_name: '',
              order_date: new Date().toISOString().split('T')[0],
              status: 'Draft',
              items: []
            });
            setShowCreateModal(true);
          }}
          style={{ gap: '6px' }}
        >
          <Plus size={16} /> Create Sales Order
        </button>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Order Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Delivery Courier</th>
              <th style={{ textAlign: 'center' }}>Action triggers</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading sales orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No Sales Orders recorded. Click Create Sales Order above.</td></tr>
            ) : orders.map((so) => {
              let badgeColor = 'var(--text-muted)';
              let badgeBg = 'rgba(255,255,255,0.05)';
              if (so.status === 'Approved') { badgeColor = 'var(--accent-blue)'; badgeBg = 'rgba(59, 130, 246, 0.1)'; }
              if (so.status === 'Shipped') { badgeColor = 'var(--accent-green)'; badgeBg = 'rgba(16, 185, 129, 0.1)'; }
              if (so.status === 'Cancelled') { badgeColor = 'var(--accent-red)'; badgeBg = 'rgba(239, 68, 68, 0.1)'; }

              return (
                <tr key={so.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>#SO-00{so.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{so.customer_name}</td>
                  <td style={{ fontSize: '13px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} style={{ color: 'var(--text-muted)' }} /> {so.order_date}</span>
                  </td>
                  <td style={{ fontSize: '13.5px', fontWeight: 600 }}>{currencySymbol}{Number(so.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}33`
                    }}>{so.status}</span>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {so.status === 'Shipped' ? (
                      <span style={{ color: 'var(--accent-cyan)' }}>🚚 Dispatched</span>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleOpenView(so)} 
                        className="modal-btn secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={12} /> View Items
                      </button>

                      {so.status === 'Draft' && (
                        <>
                          <button 
                            onClick={() => updateSOStatusDirectly(so.id, 'Approved')}
                            className="modal-btn secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', borderColor: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button 
                            onClick={() => handleDeleteSo(so.id)}
                            className="modal-btn secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}

                      {so.status === 'Approved' && (
                        <button 
                          onClick={() => handleOpenDispatch(so)}
                          className="add-lead-btn"
                          style={{ padding: '6px 10px', height: 'auto', minHeight: 0, fontSize: '11px', background: 'var(--accent-green)', color: '#000', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                        >
                          <ArrowUpFromLine size={12} /> Ship Stock OUT
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

      {/* CREATE SALES ORDER MODAL */}
      {showCreateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container large" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create Sales Order</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSoSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Customer Name *</label>
                    <input 
                      type="text" 
                      style={inputStyle} 
                      value={soForm.customer_name} 
                      onChange={e => setSoForm({ ...soForm, customer_name: e.target.value })}
                      placeholder="e.g. Acme Corp" 
                      required 
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Order Date *</label>
                    <input type="date" style={inputStyle} value={soForm.order_date} onChange={e => setSoForm({ ...soForm, order_date: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Initial Order Status</label>
                    <select style={inputStyle} value={soForm.status} onChange={e => setSoForm({ ...soForm, status: e.target.value })}>
                      <option value="Draft">Draft (Awaiting approval)</option>
                      <option value="Approved">Approved (Ready for shipping)</option>
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
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>Order Items</span>
                  
                  {soForm.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No items added yet. Click Add Product Item.
                    </div>
                  ) : soForm.items.map((item, idx) => (
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
                          value={item.unit_price}
                          onChange={e => handleItemFieldChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
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
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Order Value:</span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {currencySymbol}{calculateFormTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">Generate Sales Order</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* DISPATCH STOCK WAREHOUSE SELECTION MODAL */}
      {showDispatchModal && selectedOrder && createPortal(
        <div className="modal-overlay" onClick={() => setShowDispatchModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Dispatch Sales Order</h2>
              <button className="modal-close" onClick={() => setShowDispatchModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleDispatchSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Order ID: <strong style={{ color: 'var(--text-primary)' }}>#SO-00{selectedOrder.id}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Customer: <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.customer_name}</strong></div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Value: <strong style={{ color: 'var(--text-primary)' }}>{currencySymbol}{Number(selectedOrder.total_amount).toLocaleString()}</strong></div>
                </div>

                <div>
                  <label style={labelStyle}>Source Warehouse to Ship From *</label>
                  <select 
                    style={inputStyle} 
                    value={dispatchWarehouseId} 
                    onChange={e => setDispatchWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.filter(w => w.status === 'Active').map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                    Note: Shipping this order will instantly decrease product stock balances in the selected warehouse and auto-create courier dispatch records.
                  </span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary" style={{ background: 'var(--accent-green)', color: '#000', fontWeight: 700 }}>Commit Stock Out</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW ORDER ITEMS DETAILS MODAL */}
      {showViewModal && selectedOrder && createPortal(
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-container" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Sales Order Details - #SO-00{selectedOrder.id}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Customer / Buyer:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.customer_name}</strong>
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
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
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
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{currencySymbol}{Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{currencySymbol}{(item.quantity * item.unit_price).toFixed(2)}</td>
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
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, display: 'block' }}>🚚 Courier Shipping Delivery details</span>
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div>Tracking Reference: <strong>{selectedOrder.courier.tracking_number}</strong> ({selectedOrder.courier.courier_name})</div>
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

export default SalesOrders;
