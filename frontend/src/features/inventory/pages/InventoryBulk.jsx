import { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { apiBaseUrl } from '../../../utils/env.js';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, 
  XCircle, ChevronRight, RefreshCw, Info, ArrowLeft, Package, 
  Warehouse, ArrowDownToLine, Lock
} from 'lucide-react';

const InventoryBulk = () => {
  const { tenantId, products, warehouses, toast, refreshSharedData } = useInventory();

  // View state: 'menu', 'product-upload', or 'stocktake-upload'
  const [activeView, setActiveView] = useState('menu');

  // Common upload states
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Stocktake state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [warehouseStock, setWarehouseStock] = useState([]);

  // Fetch current stock for selected warehouse
  useEffect(() => {
    if (activeView === 'stocktake-upload' && selectedWarehouseId) {
      setLoading(true);
      fetch(`${apiBaseUrl}/inventory/stock?warehouse_id=${selectedWarehouseId}&tenant_id=${tenantId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setWarehouseStock(data.data || []);
          }
        })
        .catch(err => console.error("Error fetching warehouse stock:", err))
        .finally(() => setLoading(false));
    }
  }, [activeView, selectedWarehouseId, tenantId]);

  // Product template downloader
  const downloadProductTemplate = () => {
    const headers = [
      'name', 'sku', 'category', 'description', 'cost_price', 'sale_price', 'reorder_level'
    ];
    const sampleRow = [
      'Wireless Mouse', 'MS-WRLS-04', 'Electronics', 'High-precision wireless optical mouse', '12.50', '29.99', '15'
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), sampleRow.join(',')].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV product template downloaded!");
  };

  // Stocktake template downloader
  const downloadStocktakeTemplate = () => {
    if (!selectedWarehouseId) {
      toast.error("Please select a warehouse first.");
      return;
    }

    const headers = ['product_id', 'product_name', 'product_sku', 'current_system_quantity', 'actual_counted_quantity'];
    const rows = [headers.join(',')];

    if (warehouseStock.length === 0) {
      // Suggest template with sample products
      rows.push(['1', 'Sample Laptop', 'LP-SMP-01', '10', '10'].join(','));
    } else {
      warehouseStock.forEach(ws => {
        rows.push([
          ws.product_id,
          `"${ws.product_name.replace(/"/g, '""')}"`,
          ws.product_sku,
          ws.quantity || 0,
          ws.quantity || 0 // Default actual counted to current system qty
        ].join(','));
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const wName = warehouses.find(w => w.id === parseInt(selectedWarehouseId))?.name || 'warehouse';
    link.setAttribute("download", `stocktake_${wName.toLowerCase().replace(/\s+/g, '_')}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Stocktake audit CSV template downloaded!");
  };

  const normalizeKey = (key) => {
    return key.toLowerCase().replace(/[\s_\-]/g, '');
  };

  const processFile = (fileObject) => {
    setLoading(true);
    setFile(fileObject);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (rawRows.length === 0) {
          toast.error("The uploaded file contains no data rows.");
          setLoading(false);
          return;
        }

        let formatted = [];
        if (activeView === 'product-upload') {
          // Parse Products
          formatted = rawRows.map((row, idx) => {
            const mapped = {};
            Object.keys(row).forEach(k => {
              const norm = normalizeKey(k);
              mapped[norm] = String(row[k]).trim();
            });

            const rowErrors = [];
            if (!mapped.name) rowErrors.push("Product name is required.");
            if (!mapped.sku) rowErrors.push("Product SKU is required.");

            return {
              data: {
                name: mapped.name || '',
                sku: mapped.sku || '',
                category: mapped.category || 'General',
                description: mapped.description || '',
                cost_price: parseFloat(mapped.costprice) || 0.00,
                sale_price: parseFloat(mapped.saleprice) || 0.00,
                reorder_level: parseInt(mapped.reorderlevel) || 10
              },
              errors: rowErrors,
              isValid: rowErrors.length === 0,
              rowNum: idx + 2
            };
          });
        } else {
          // Parse Stocktake Audit
          formatted = rawRows.map((row, idx) => {
            const mapped = {};
            Object.keys(row).forEach(k => {
              const norm = normalizeKey(k);
              mapped[norm] = String(row[k]).trim();
            });

            const rowErrors = [];
            const product_id = parseInt(mapped.productid || mapped.id);
            const counted_qty = parseInt(mapped.actualcountedquantity || mapped.quantity);

            if (isNaN(product_id)) rowErrors.push("Product ID is required.");
            if (isNaN(counted_qty) || counted_qty < 0) rowErrors.push("Actual counted quantity must be a non-negative number.");

            return {
              data: {
                warehouse_id: parseInt(selectedWarehouseId),
                product_id: product_id,
                quantity: counted_qty
              },
              meta: {
                product_name: mapped.productname || 'ID #' + product_id,
                product_sku: mapped.productsku || '',
                system_qty: parseInt(mapped.currentsystemquantity) || 0
              },
              errors: rowErrors,
              isValid: rowErrors.length === 0,
              rowNum: idx + 2
            };
          });
        }

        setParsedRecords(formatted);
        toast.success(`Parsed ${formatted.length} records successfully.`);
      } catch (err) {
        console.error("File parsing error:", err);
        toast.error("Failed to parse spreadsheet. Please verify format.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(fileObject);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragging(true);
    } else if (e.type === "dragleave") {
      setDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(ext)) {
        processFile(droppedFile);
      } else {
        toast.error("Unsupported file format. Please upload CSV or Excel spreadsheet.");
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    const validRecords = parsedRecords.filter(r => r.isValid).map(r => r.data);
    
    if (validRecords.length === 0) {
      toast.error("No valid records to submit.");
      return;
    }

    setImporting(true);

    const endpoint = activeView === 'product-upload' ? 'products' : 'stock';
    const payloadKey = activeView === 'product-upload' ? 'products' : 'stock';

    fetch(`${apiBaseUrl}/inventory/bulk?type=${endpoint}&tenant_id=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [payloadKey]: validRecords })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message);
          setImportSummary({
            success: true,
            importedCount: data.imported || data.reconciled,
            errorsCount: data.errors?.length || 0,
            errorDetails: data.errors || []
          });
          setFile(null);
          setParsedRecords([]);
          refreshSharedData();
        } else {
          toast.error(data.error || "Bulk action failed.");
          setImportSummary({
            success: false,
            error: data.error
          });
        }
      })
      .catch(err => {
        console.error("Bulk upload error:", err);
        toast.error("Network error during bulk execution.");
      })
      .finally(() => {
        setImporting(false);
      });
  };

  const handleClear = () => {
    setFile(null);
    setParsedRecords([]);
    setImportSummary(null);
  };

  const validCount = parsedRecords.filter(r => r.isValid).length;
  const invalidCount = parsedRecords.length - validCount;

  // 1. Render main selection hub
  if (activeView === 'menu') {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Hub Banner */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
              color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(34, 211, 238, 0.2)'
            }}>
              <Info size={20} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
                Inventory Bulk Operations Directory
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Bulk import product catalogs or run warehouse stock audits via Excel/CSV spreadsheets.
              </p>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Card 1: Product Upload */}
          <div 
            onClick={() => { setActiveView('product-upload'); handleClear(); }}
            className="bulk-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <Package size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                Bulk Product Import
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Upload your product lists. Automatically register SKUs, cost prices, selling margins, and reorder levels.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)', marginTop: 'auto' }}>
              Launch Product Uploader
              <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 2: Stocktake Audit */}
          <div 
            onClick={() => { setActiveView('stocktake-upload'); handleClear(); setSelectedWarehouseId(''); }}
            className="bulk-card"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <Warehouse size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                Bulk Stocktake Audit
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Reconcile warehouse stock count audits. The system will auto-calculate discrepancies and record adjustments.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: 'auto' }}>
              Launch Stock Auditor
              <ChevronRight size={14} />
            </div>
          </div>

        </div>
        <style dangerouslySetInnerHTML={{__html: `
          .bulk-card:hover {
            border-color: var(--accent-cyan) !important;
            box-shadow: 0 4px 20px rgba(34, 211, 238, 0.08) !important;
            transform: translateY(-2px);
          }
        `}} />
      </div>
    );
  }

  // 2. Render Importer screens
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Back button */}
      <div>
        <button 
          onClick={() => { setActiveView('menu'); handleClear(); }}
          className="modal-btn secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} />
          Back to Directory
        </button>
      </div>

      {/* Screen Intro */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {activeView === 'product-upload' ? (
            <Package size={24} style={{ color: 'var(--accent-blue)' }} />
          ) : (
            <Warehouse size={24} style={{ color: 'var(--accent-emerald)' }} />
          )}
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
              {activeView === 'product-upload' ? 'Bulk Product Catalog Import' : 'Bulk Stocktake Reconciliation'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              {activeView === 'product-upload' 
                ? 'Onboard products to your catalog. Register SKU codes, pricing values, and threshold levels.'
                : 'Match physical counts to system stock levels. Select a warehouse and upload counted sheet.'}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        {/* Template Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-cyan)' }} />
            {activeView === 'product-upload' ? 'Download Import Template' : 'Configure & Download Current Stock Sheet'}
          </h4>

          {activeView === 'product-upload' ? (
            <button 
              className="modal-btn secondary" 
              onClick={downloadProductTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
            >
              <Download size={13} /> Download Product Template (CSV)
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select 
                style={{
                  padding: '6px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', outline: 'none'
                }}
                value={selectedWarehouseId}
                onChange={e => { setSelectedWarehouseId(e.target.value); handleClear(); }}
              >
                <option value="">Select Warehouse</option>
                {warehouses.filter(w => w.status === 'Active').map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <button 
                className="modal-btn secondary" 
                onClick={downloadStocktakeTemplate}
                disabled={!selectedWarehouseId}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
              >
                <Download size={13} /> Download Stocktake Sheet
              </button>
            </div>
          )}
        </div>

        {/* Drag Dropzone */}
        {(activeView === 'product-upload' || selectedWarehouseId) && (
          <>
            {!file ? (
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: dragging ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border)',
                  background: dragging ? 'rgba(34, 211, 238, 0.03)' : 'rgba(255,255,255,0.01)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onClick={() => document.getElementById('inventory-bulk-input').click()}
              >
                <input 
                  id="inventory-bulk-input"
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  style={{ display: 'none' }} 
                  onChange={handleFileInput}
                />
                <Upload size={36} style={{ color: dragging ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Drag and drop your spreadsheet here, or <span style={{ color: 'var(--accent-cyan)' }}>browse</span>
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Supports CSV, XLSX, XLS formats up to 10MB
                  </p>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileSpreadsheet size={24} style={{ color: 'var(--accent-cyan)' }} />
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px', display: 'block' }}>{file.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button 
                  className="modal-btn secondary" 
                  onClick={handleClear}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  disabled={loading || importing}
                >
                  Clear File
                </button>
              </div>
            )}
          </>
        )}

        {/* Import Summary */}
        {importSummary && (
          <div style={{
            background: importSummary.success ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: importSummary.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {importSummary.success ? (
                <CheckCircle size={20} style={{ color: 'var(--accent-green)' }} />
              ) : (
                <XCircle size={20} style={{ color: 'var(--accent-red)' }} />
              )}
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                {importSummary.success ? 'Bulk Execution Successful' : 'Execution Failed'}
              </h4>
            </div>
            {importSummary.success ? (
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {activeView === 'product-upload' 
                    ? `Successfully imported ${importSummary.importedCount} products into the catalog.`
                    : `Successfully adjusted stock for ${importSummary.importedCount} products with discrepancies.`}
                </p>
                {importSummary.errorsCount > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-orange)', display: 'block', marginBottom: '6px' }}>
                      ⚠️ Skipped rows ({importSummary.errorsCount}):
                    </span>
                    <div style={{ 
                      maxHeight: '120px', overflow: 'auto', fontSize: '11.5px', color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: 'var(--radius-sm)',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                      {importSummary.errorDetails.map((err, idx) => <div key={idx}>• {err}</div>)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Error Details: {importSummary.error}</p>
            )}
          </div>
        )}

        {/* Validation Stats */}
        {parsedRecords.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ flex: 1, minWidth: '140px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Rows Processed</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginTop: '4px', display: 'block' }}>{parsedRecords.length}</span>
            </div>
            <div style={{ flex: 1, minWidth: '140px', background: 'rgba(16, 185, 129, 0.02)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Valid Rows</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-green)', marginTop: '4px', display: 'block' }}>{validCount}</span>
            </div>
            <div style={{ flex: 1, minWidth: '140px', background: invalidCount > 0 ? 'rgba(239, 68, 68, 0.02)' : 'rgba(255,255,255,0.01)', border: invalidCount > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <span style={{ fontSize: '11px', color: invalidCount > 0 ? 'var(--accent-red)' : 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Invalid Rows</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: invalidCount > 0 ? 'var(--accent-red)' : '#fff', marginTop: '4px', display: 'block' }}>{invalidCount}</span>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        {parsedRecords.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="modal-btn secondary" onClick={handleClear} disabled={importing}>Cancel</button>
            <button 
              className="add-lead-btn" 
              onClick={handleConfirmImport}
              disabled={validCount === 0 || importing}
              style={{ background: 'var(--accent-cyan)', color: '#000', gap: '6px', fontWeight: 700 }}
            >
              {importing ? (
                <><RefreshCw size={14} className="spin" /> Committing changes...</>
              ) : (
                <><CheckCircle size={14} /> Submit ({validCount} Valid Rows)</>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Validation Preview Grid */}
      {parsedRecords.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ChevronRight size={16} style={{ color: 'var(--accent-cyan)' }} /> Previewing Parsed File Rows
          </h4>

          <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                {activeView === 'product-upload' ? (
                  <tr>
                    <th style={{ width: '60px' }}>Row</th>
                    <th>Status</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Pricing (Cost / Sale)</th>
                    <th>Alert Messages</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: '60px' }}>Row</th>
                    <th>Status</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th style={{ textAlign: 'center' }}>System Stock</th>
                    <th style={{ textAlign: 'center' }}>Physical Count</th>
                    <th style={{ textAlign: 'center' }}>Discrepancy</th>
                    <th>Alert Messages</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {parsedRecords.map((record, index) => {
                  const discrepancy = activeView === 'stocktake-upload' 
                    ? record.data.quantity - record.meta.system_qty 
                    : 0;

                  return (
                    <tr 
                      key={index} 
                      style={{ 
                        background: record.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.03)',
                        borderLeft: record.isValid ? '3px solid transparent' : '3px solid var(--accent-red)'
                      }}
                    >
                      <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>#{record.rowNum}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                          background: record.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: record.isValid ? 'var(--accent-green)' : 'var(--accent-red)',
                          border: `1px solid ${record.isValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        }}>
                          {record.isValid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>

                      {activeView === 'product-upload' ? (
                        <>
                          <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-white)' }}>{record.data.name || '—'}</td>
                          <td style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--accent-cyan)' }}>{record.data.sku || '—'}</td>
                          <td style={{ fontSize: '12.5px' }}>{record.data.category}</td>
                          <td style={{ fontSize: '12.5px' }}>
                            Cost: {record.data.cost_price.toFixed(2)} | Sale: {record.data.sale_price.toFixed(2)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-white)' }}>{record.meta.product_name}</td>
                          <td style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--accent-cyan)' }}>{record.meta.product_sku || '—'}</td>
                          <td style={{ fontSize: '12.5px', textAlign: 'center' }}>{record.meta.system_qty}</td>
                          <td style={{ fontSize: '12.5px', textAlign: 'center', fontWeight: 600 }}>{record.data.quantity}</td>
                          <td style={{ 
                            fontSize: '12.5px', textAlign: 'center', fontWeight: 700,
                            color: discrepancy > 0 ? 'var(--accent-green)' : (discrepancy < 0 ? 'var(--accent-red)' : 'var(--text-muted)') 
                          }}>
                            {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                          </td>
                        </>
                      )}

                      <td style={{ fontSize: '12px' }}>
                        {record.isValid ? (
                          <span style={{ color: 'var(--text-muted)' }}>Verification passed</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {record.errors.map((err, errIdx) => (
                              <span key={errIdx} style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <AlertTriangle size={11} /> {err}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryBulk;
