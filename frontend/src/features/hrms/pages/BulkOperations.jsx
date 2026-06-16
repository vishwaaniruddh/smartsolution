import { useState } from 'react';
import { useHRMS } from '../context/HRMSContext';
import { apiBaseUrl } from '../../../utils/env.js';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, Download, CheckCircle, AlertTriangle, 
  XCircle, ChevronRight, RefreshCw, Info, ArrowLeft, Users, 
  Clock, Wallet, CalendarRange, Lock
} from 'lucide-react';

const BulkOperations = () => {
  const { toast, tenantId } = useHRMS();

  // View state: 'menu' (4-grid directory) or 'employee-upload'
  const [activeView, setActiveView] = useState('menu');

  // Employee upload states
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  const downloadCSVTemplate = () => {
    const headers = [
      'first_name', 'last_name', 'email', 'phone', 'gender', 'date_of_joining',
      'employment_type', 'department', 'designation', 'address', 'bank_name',
      'account_number', 'ifsc_code', 'pan_number'
    ];
    
    const sampleRow = [
      'John', 'Doe', 'john.doe@example.com', '+919876543210', 'Male', '2026-06-15',
      'Full-time', 'Engineering', 'Software Engineer', '123 Tech Park, Mumbai', 
      'HDFC Bank', '50100200300400', 'HDFC0000123', 'ABCDE1234F'
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), sampleRow.join(',')].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_employee_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV template downloaded!");
  };

  const normalizeKey = (key) => {
    const normalized = key.toLowerCase().replace(/[\s_\-]/g, '');
    if (normalized === 'firstname' || normalized === 'first') return 'first_name';
    if (normalized === 'lastname' || normalized === 'last') return 'last_name';
    if (normalized === 'emailid' || normalized === 'emailaddress') return 'email';
    if (normalized === 'phonenumber' || normalized === 'contact' || normalized === 'contactno') return 'phone';
    if (normalized === 'dateofjoining' || normalized === 'joiningdate') return 'date_of_joining';
    if (normalized === 'employmenttype' || normalized === 'type') return 'employment_type';
    if (normalized === 'bankname') return 'bank_name';
    if (normalized === 'accountnumber' || normalized === 'accountno') return 'account_number';
    if (normalized === 'ifsccode' || normalized === 'ifsc') return 'ifsc_code';
    if (normalized === 'pannumber' || normalized === 'pan') return 'pan_number';
    return normalized;
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
          toast.error("The selected file contains no records.");
          setLoading(false);
          return;
        }

        const formatted = rawRows.map((row, idx) => {
          const mapped = {};
          Object.keys(row).forEach(k => {
            mapped[normalizeKey(k)] = String(row[k]).trim();
          });

          const rowErrors = [];
          if (!mapped.first_name) rowErrors.push("First name is required.");
          if (!mapped.last_name) rowErrors.push("Last name is required.");
          if (!mapped.email) {
            rowErrors.push("Email is required.");
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
            rowErrors.push("Invalid email format.");
          }

          if (mapped.phone && !/^[+0-9\s\-()]{7,18}$/.test(mapped.phone)) {
            rowErrors.push("Invalid phone format.");
          }

          return {
            data: {
              first_name: mapped.first_name || '',
              last_name: mapped.last_name || '',
              email: mapped.email || '',
              phone: mapped.phone || '',
              gender: mapped.gender || 'Other',
              date_of_joining: mapped.date_of_joining || '',
              employment_type: mapped.employment_type || 'Full-time',
              department: mapped.department || '',
              designation: mapped.designation || '',
              address: mapped.address || '',
              bank_name: mapped.bank_name || '',
              account_number: mapped.account_number || '',
              ifsc_code: mapped.ifsc_code || '',
              pan_number: mapped.pan_number || ''
            },
            errors: rowErrors,
            isValid: rowErrors.length === 0,
            rowNum: idx + 2
          };
        });

        setParsedRecords(formatted);
        toast.success(`Successfully parsed ${formatted.length} records.`);
      } catch (err) {
        console.error("File processing error:", err);
        toast.error("Failed to parse file. Please verify format and contents.");
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
        toast.error("Unsupported file type. Please upload CSV or Excel.");
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
      toast.error("No valid records to import.");
      return;
    }

    setImporting(true);

    fetch(`${apiBaseUrl}/hrms/bulk?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employees: validRecords })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message || `Successfully imported ${data.imported} employees!`);
          setImportSummary({
            success: true,
            imported: data.imported,
            errorsCount: data.errors?.length || 0,
            errorDetails: data.errors || []
          });
          setFile(null);
          setParsedRecords([]);
        } else {
          toast.error(data.error || "Import failed.");
          setImportSummary({
            success: false,
            error: data.error
          });
        }
      })
      .catch(err => {
        console.error("Import error:", err);
        toast.error("Network or server error during import.");
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

  // Render Directory Menu View
  if (activeView === 'menu') {
    return (
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Intro */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ 
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
              color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(34, 211, 238, 0.2)', flexShrink: 0
            }}>
              <Info size={20} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-white)' }}>
                Bulk Operations Hub
              </h3>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Select a bulk task below to execute system-wide calculations, batch import raw data spreadsheets, or run high-volume modifications.
              </p>
            </div>
          </div>
        </div>

        {/* 4-Grid Operations */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginTop: '8px'
        }}>
          
          {/* Card 1: Bulk Employee Upload (Active) */}
          <div 
            onClick={() => setActiveView('employee-upload')}
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
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(34, 211, 238, 0.2)'
            }}>
              <Users size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-white)' }}>
                Bulk Employee Import
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Batch onboard your team. Upload CSV/Excel templates, validate rows, resolve designations, and seed leave structures.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: 'auto' }}>
              Launch Operation
              <ChevronRight size={14} />
            </div>
          </div>

          {/* Card 2: Bulk Attendance Logs (Locked) */}
          <div 
            className="bulk-card-disabled"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
              padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)'
            }}>
              <Lock size={10} />
              Planned
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)'
            }}>
              <Clock size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
                Bulk Attendance Imports
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Sync biometric punch files. Automate daily attendance statuses, late calculations, and overtime computations.
              </p>
            </div>
          </div>

          {/* Card 3: Bulk Payroll Runs (Locked) */}
          <div 
            className="bulk-card-disabled"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
              padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)'
            }}>
              <Lock size={10} />
              Planned
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)'
            }}>
              <Wallet size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
                Batch Payroll Calculations
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Process monthly pay slips. Batch audit deductions, allowances, and compile structural payroll registers.
              </p>
            </div>
          </div>

          {/* Card 4: Bulk Leave Allocations (Locked) */}
          <div 
            className="bulk-card-disabled"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: 'var(--shadow-sm)',
              opacity: 0.6,
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
              padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)'
            }}>
              <Lock size={10} />
              Planned
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)'
            }}>
              <CalendarRange size={22} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
                Leave Calendar Reset
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Adjust leave balances, run calendar renewals, and apply company holiday allocations for the entire workforce.
              </p>
            </div>
          </div>

        </div>

        {/* Hover CSS injector */}
        <style dangerouslySetInnerHTML={{__html: `
          .bulk-card:hover {
            border: 1px solid var(--accent-cyan) !important;
            box-shadow: 0 4px 20px rgba(34, 211, 238, 0.1) !important;
            transform: translateY(-3px);
          }
        `}} />
      </div>
    );
  }

  // Render Employee Upload Sub-View
  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => { setActiveView('menu'); handleClear(); }}
          className="modal-btn secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
        >
          <ArrowLeft size={14} />
          Back to Operations
        </button>
      </div>

      {/* Intro info box */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Users size={24} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
              Bulk Employee Import
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Fill out the required employee parameters in Excel/CSV layout and import them in one operation.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Upload Dropzone Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={16} style={{ color: 'var(--accent-cyan)' }} />
              Upload Source Spreadsheet File
            </h3>
            <button 
              className="modal-btn secondary" 
              onClick={downloadCSVTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
            >
              <Download size={13} />
              Download CSV Template
            </button>
          </div>

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
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
              onClick={() => document.getElementById('bulk-file-input').click()}
            >
              <input 
                id="bulk-file-input"
                type="file" 
                accept=".csv, .xlsx, .xls" 
                style={{ display: 'none' }} 
                onChange={handleFileInput}
              />
              <Upload size={36} style={{ color: dragging ? 'var(--accent-cyan)' : 'var(--text-muted)' }} />
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Drag and drop your file here, or <span style={{ color: 'var(--accent-cyan)' }}>browse</span>
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Supports CSV, XLSX, XLS up to 10MB
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
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#fff' }}>
                  {importSummary.success ? 'Import Completed Successfully' : 'Import Failed'}
                </h4>
              </div>
              {importSummary.success ? (
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Successfully imported <strong>{importSummary.imported}</strong> employees.
                  </p>
                  {importSummary.errorsCount > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-orange)', display: 'block', marginBottom: '6px' }}>
                        ⚠️ Warning: {importSummary.errorsCount} rows had errors and were skipped:
                      </span>
                      <div style={{ 
                        maxHeight: '120px', 
                        overflow: 'auto', 
                        fontSize: '11.5px', 
                        color: 'var(--text-muted)',
                        background: 'rgba(0,0,0,0.1)',
                        padding: '10px',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {importSummary.errorDetails.map((err, idx) => (
                          <div key={idx}>• {err}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Error: {importSummary.error}
                </p>
              )}
            </div>
          )}

          {parsedRecords.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border)',
              paddingTop: '20px'
            }}>
              <div style={{ flex: 1, minWidth: '140px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Total Rows</span>
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

          {parsedRecords.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                className="modal-btn secondary" 
                onClick={handleClear}
                disabled={importing}
              >
                Cancel
              </button>
              <button 
                className="add-lead-btn" 
                onClick={handleConfirmImport}
                disabled={validCount === 0 || importing}
                style={{ background: 'var(--accent-cyan)', color: '#000', gap: '6px', fontWeight: 700 }}
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    Importing Employees...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    Confirm Import ({validCount} Valid Rows)
                  </>
                )}
              </button>
            </div>
          )}

        </div>

      </div>

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
            <ChevronRight size={16} style={{ color: 'var(--accent-cyan)' }} />
            Import Preview & Validation Summary
          </h4>

          <div className="table-wrapper" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Row</th>
                  <th>Status</th>
                  <th>Employee Name</th>
                  <th>Email Address</th>
                  <th>Contact Info</th>
                  <th>Department / Designation</th>
                  <th>Validation Messages</th>
                </tr>
              </thead>
              <tbody>
                {parsedRecords.map((record, index) => {
                  return (
                    <tr 
                      key={index} 
                      style={{ 
                        background: record.isValid ? 'transparent' : 'rgba(239, 68, 68, 0.03)',
                        borderLeft: record.isValid ? '3px solid transparent' : '3px solid var(--accent-red)'
                      }}
                    >
                      <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{record.rowNum}
                      </td>
                      <td>
                        {record.isValid ? (
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}>
                            Valid
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            Invalid
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {record.data.first_name || '—'} {record.data.last_name || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12.5px', color: record.data.email ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                        {record.data.email || 'Missing email'}
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        <div>{record.data.phone || '—'}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Type: {record.data.employment_type}</div>
                      </td>
                      <td style={{ fontSize: '12.5px' }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{record.data.department || '—'}</span>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{record.data.designation || '—'}</div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        {record.isValid ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Ready to import</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {record.errors.map((err, errIdx) => (
                              <span key={errIdx} style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <AlertTriangle size={11} />
                                {err}
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

export default BulkOperations;
