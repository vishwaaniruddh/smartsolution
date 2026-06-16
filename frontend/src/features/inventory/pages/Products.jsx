import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Plus, Edit3, Trash2, X, Search, Scan, Tag, Barcode, 
  Sparkles, Package, HelpCircle
} from 'lucide-react';

const Products = () => {
  const { toast, tenantId, currencySymbol, refreshSharedData } = useInventory();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Scan simulator state
  const [scannerInput, setScannerInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanType, setScanType] = useState('barcode'); // 'barcode' or 'rfid'

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    rfid_tag: '',
    category: 'Electronics',
    description: '',
    cost_price: 0,
    sale_price: 0,
    reorder_level: 10
  });

  const fetchProducts = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/inventory/products?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProducts(data.data || []);
        }
      })
      .catch(err => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [tenantId]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({
      name: '',
      sku: '',
      barcode: '',
      rfid_tag: '',
      category: 'Electronics',
      description: '',
      cost_price: 0,
      sale_price: 0,
      reorder_level: 10
    });
    setShowModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingItem(product);
    setForm({
      name: product.name || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      rfid_tag: product.rfid_tag || '',
      category: product.category || 'Electronics',
      description: product.description || '',
      cost_price: Number(product.cost_price) || 0,
      sale_price: Number(product.sale_price) || 0,
      reorder_level: Number(product.reorder_level) || 10
    });
    setShowModal(true);
  };

  const generateCodes = () => {
    // Generate mock barcodes and RFID tag if empty
    const uniqueVal = Date.now().toString().slice(-6);
    const mockBarcode = form.barcode || `89010312${uniqueVal}`;
    const mockRfid = form.rfid_tag || `RFID-${form.sku.toUpperCase() || 'PROD'}-${uniqueVal}`;
    setForm(prev => ({
      ...prev,
      barcode: mockBarcode,
      rfid_tag: mockRfid
    }));
    toast.success("Generated mock Barcode and RFID Tag!");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.sku) {
      toast.error("Product Name and SKU are required.");
      return;
    }

    const url = `${apiBaseUrl}/inventory/products`;
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
          fetchProducts();
          refreshSharedData();
        } else {
          toast.error(data.error || "Failed to save product.");
        }
      })
      .catch(err => {
        console.error("Error saving product:", err);
        toast.error("Network error.");
      });
  };

  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    fetch(`${apiBaseUrl}/inventory/products?id=${id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          fetchProducts();
          refreshSharedData();
        } else {
          toast.error(data.error || "Delete failed.");
        }
      })
      .catch(err => {
        console.error("Error deleting product:", err);
        toast.error("Network error.");
      });
  };

  // Barcode / RFID scanner simulation lookup
  const handleSimulateScan = (e) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    const queryParam = scanType === 'barcode' ? `barcode=${scannerInput}` : `rfid=${scannerInput}`;
    fetch(`${apiBaseUrl}/inventory/products?${queryParam}&tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setScannedProduct(data.data);
          toast.success(`Success! Scanned product: ${data.data.name}`);
        } else {
          setScannedProduct(null);
          toast.error(data.error || `No product found matching this ${scanType}.`);
        }
      })
      .catch(err => {
        console.error("Error scanning item:", err);
        toast.error("Scanning failed.");
      });
  };

  const handlePreloadScan = (code, type) => {
    setScanType(type);
    setScannerInput(code);
    toast.info(`Preloaded ${type} code: ${code}. Click "Trigger Scan" below.`);
  };

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.includes(term)) ||
      (p.rfid_tag && p.rfid_tag.toLowerCase().includes(term)) ||
      p.category.toLowerCase().includes(term)
    );
  });

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontSize: '13px', outline: 'none'
  };
  const labelStyle = { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Simulation Tools Panel: Barcode/RFID mock scanners */}
      <div style={{
        background: 'rgba(34, 211, 238, 0.05)',
        border: '1px solid rgba(34, 211, 238, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scan size={18} style={{ color: 'var(--accent-cyan)' }} />
            Barcode & RFID Tag Simulator Scanner
          </h3>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            This simulator lets you check tag tracking. Click on any product's barcode or RFID tag to load it here, then click "Trigger Scan" to check detection.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {products.slice(0, 3).map((p, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                {p.barcode && (
                  <button 
                    onClick={() => handlePreloadScan(p.barcode, 'barcode')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '10.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Barcode size={10} /> Scan Barcode
                  </button>
                )}
                {p.rfid_tag && (
                  <button 
                    onClick={() => handlePreloadScan(p.rfid_tag, 'rfid')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '10.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Tag size={10} /> Scan RFID
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <form onSubmit={handleSimulateScan} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input type="radio" name="scanType" checked={scanType === 'barcode'} onChange={() => setScanType('barcode')} />
                Barcode Scanner
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input type="radio" name="scanType" checked={scanType === 'rfid'} onChange={() => setScanType('rfid')} />
                RFID Reader
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={scanType === 'barcode' ? "Enter Barcode (e.g. 8901031200112)" : "Enter RFID tag (e.g. RFID-KB-001)"}
                value={scannerInput}
                onChange={e => setScannerInput(e.target.value)}
                style={{ ...inputStyle, padding: '8px 12px' }}
              />
              <button 
                type="submit" 
                className="add-lead-btn" 
                style={{ background: 'var(--accent-cyan)', color: '#000', padding: '0 16px', height: '36px', minHeight: 0, fontWeight: 700 }}
              >
                Trigger Scan
              </button>
            </div>
          </form>

          {scannedProduct && (
            <div style={{
              marginTop: '12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>Detected Product</span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{scannedProduct.name}</h4>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>SKU: {scannedProduct.sku} | Cost: {currencySymbol}{scannedProduct.cost_price}</span>
              </div>
              <button 
                onClick={() => setScannedProduct(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main product listings and filters */}
      <div className="leads-page-header" style={{ marginBottom: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div className="leads-toolbar" style={{ margin: 0 }}>
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search products by SKU, name, tags..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button className="add-lead-btn" onClick={handleOpenAdd} style={{ gap: '6px' }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="table-wrapper" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className="leads-table">
          <thead>
            <tr>
              <th>SKU / Product</th>
              <th>Category</th>
              <th>Cost Price</th>
              <th>Sale Price</th>
              <th>Barcode</th>
              <th>RFID Tag</th>
              <th style={{ textAlign: 'center' }}>Reorder Level</th>
              <th style={{ textAlign: 'center' }}>Total Stock</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading product catalog...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No products registered in the database.</td></tr>
            ) : filteredProducts.map(p => {
              const stock = Number(p.total_stock) || 0;
              const limit = Number(p.reorder_level) || 0;
              const isLow = stock <= limit;

              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-white)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>SKU: {p.sku}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{p.category}</td>
                  <td style={{ fontSize: '13px' }}>{currencySymbol}{Number(p.cost_price).toFixed(2)}</td>
                  <td style={{ fontSize: '13px' }}>{currencySymbol}{Number(p.sale_price).toFixed(2)}</td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {p.barcode ? (
                      <span 
                        onClick={() => handlePreloadScan(p.barcode, 'barcode')}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                        title="Load into scanner simulator"
                      >
                        <Barcode size={12} style={{ color: 'var(--text-muted)' }} />
                        {p.barcode}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {p.rfid_tag ? (
                      <span 
                        onClick={() => handlePreloadScan(p.rfid_tag, 'rfid')}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                        title="Load into scanner simulator"
                      >
                        <Tag size={12} style={{ color: 'var(--text-muted)' }} />
                        {p.rfid_tag}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '13px' }}>{p.reorder_level}</td>
                  <td style={{ textAlign: 'center', fontSize: '13.5px', fontWeight: 700 }}>
                    <span style={{
                      color: isLow ? 'var(--accent-orange)' : 'var(--accent-green)',
                      background: isLow ? 'rgba(249, 115, 22, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: isLow ? '1px solid rgba(249, 115, 22, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                      {stock} items
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleOpenEdit(p)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal for adding/editing product */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Product SKU *</label>
                    <input style={inputStyle} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required placeholder="e.g. KB-WRLS-01" />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="Electronics">Electronics</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Hardware">Hardware</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Product Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Wireless Mechanical Keyboard" />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Enter brief product details..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Cost Price *</label>
                    <input type="number" step="0.01" style={inputStyle} value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Sale Price *</label>
                    <input type="number" step="0.01" style={inputStyle} value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Reorder Level *</label>
                    <input type="number" style={inputStyle} value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} required />
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed var(--border)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tag size={12} style={{ color: 'var(--accent-cyan)' }} /> Barcode & RFID Codes
                    </span>
                    <button 
                      type="button" 
                      onClick={generateCodes}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Sparkles size={11} /> Auto-Generate
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Barcode (EAN-13)</label>
                      <input style={inputStyle} value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} placeholder="8901031200..." />
                    </div>
                    <div>
                      <label style={labelStyle}>RFID Tag</label>
                      <input style={inputStyle} value={form.rfid_tag} onChange={e => setForm({ ...form, rfid_tag: e.target.value })} placeholder="RFID-KB-00..." />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-btn primary">{editingItem ? 'Update Product' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Products;
