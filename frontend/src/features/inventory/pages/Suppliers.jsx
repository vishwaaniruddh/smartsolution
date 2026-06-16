import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Plus, Edit3, Trash2, X, Search, Users, Mail, Phone, MapPin
} from 'lucide-react';

const Suppliers = () => {
  const { tenantId, toast, refreshSharedData } = useInventory();

  const [suppliersList, setSuppliersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: ''
  });

  const fetchSuppliers = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/suppliers?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuppliersList(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching suppliers:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, [tenantId]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', contact_name: '', email: '', phone: '', address: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingItem(supplier);
    setForm({
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name) return;

    const url = `${apiBaseUrl}/inventory/suppliers`;
    const payload = { ...form, tenant_id: tenantId };
    if (editingItem) payload.id = editingItem.id;

    fetch(url, {
      method: editingItem ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setShowModal(false);
          fetchSuppliers();
          refreshSharedData();
        } else {
          toast.error(data.error || "Failed to save supplier.");
        }
      })
      .catch(err => console.error("Error saving supplier:", err));
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this supplier?")) return;

    fetch(`${apiBaseUrl}/inventory/suppliers?id=${id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchSuppliers();
          refreshSharedData();
        } else {
          toast.error(data.error || "Delete failed.");
        }
      })
      .catch(err => console.error("Error deleting supplier:", err));
  };

  const filteredSuppliers = suppliersList.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term))
    );
  });

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="leads-page-header" style={{ marginBottom: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div className="leads-toolbar" style={{ margin: 0 }}>
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search suppliers by name, contact, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button className="add-lead-btn" onClick={handleOpenAdd} style={{ gap: '6px' }}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading suppliers directory...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No suppliers found. Create a supplier to map purchase orders.
          </div>
        ) : filteredSuppliers.map(s => (
          <div 
            key={s.id}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '16px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.08)', color: 'var(--accent-blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15.5px', color: 'var(--text-white)', fontWeight: 700 }}>{s.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supplier ID: #{s.id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleOpenEdit(s)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}><Edit3 size={13} /></button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                {s.contact_name && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Contact: <strong style={{ color: 'var(--text-primary)' }}>{s.contact_name}</strong>
                  </div>
                )}
                {s.email && (
                  <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Mail size={13} style={{ color: 'var(--text-muted)' }} /> {s.email}
                  </div>
                )}
                {s.phone && (
                  <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Phone size={13} style={{ color: 'var(--text-muted)' }} /> {s.phone}
                  </div>
                )}
                {s.address && (
                  <div style={{ fontSize: '12.5px', display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <MapPin size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} /> 
                    <span style={{ lineHeight: '1.4' }}>{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Form Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Supplier Company Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Prime Global Inc" />
                </div>
                <div>
                  <label style={labelStyle}>Contact Person Name</label>
                  <input style={inputStyle} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="e.g. John Doe" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="vendor@supplier.com" />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +1-555-019-2834" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Address / Office Location</label>
                  <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Enter physical street address..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingItem ? 'Update' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Suppliers;
