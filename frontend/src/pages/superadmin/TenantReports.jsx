import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Building, Users, TrendingUp, IndianRupee, Activity, UserCheck, Calendar, ArrowUpDown, Settings, Save, Send, X } from 'lucide-react';
import { basePath } from '../../utils/env.js';
import { useToast } from '../../components/NotificationContext';

const currenciesList = [
  { name: 'Indian Rupee', symbol: '₹' },
  { name: 'US Dollar', symbol: '$' },
  { name: 'Euro', symbol: '€' },
  { name: 'British Pound', symbol: '£' },
  { name: 'Australian Dollar', symbol: 'A$' },
  { name: 'Canadian Dollar', symbol: 'C$' },
  { name: 'Japanese Yen', symbol: '¥' },
  { name: 'Singapore Dollar', symbol: 'S$' }
];


const TenantReports = () => {
  const [analytics, setAnalytics] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'id', 'users', 'leads', 'revenue'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  const toast = useToast();
  // Config modal state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [configTab, setConfigTab] = useState('Organization'); // 'Organization' or 'SMTP'
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    currency_name: 'Indian Rupee',
    currency_symbol: '₹'
  });
  const [tenantSmtp, setTenantSmtp] = useState({
    host: '',
    port: 465,
    encryption: 'ssl',
    username: '',
    password: '',
    from_name: '',
    from_email: ''
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSendingTest, setSmtpSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  const fetchAnalytics = () => {
    setLoading(true);
    fetch('http://localhost/lead/api/superadmin_analytics.php')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setAnalytics(data.data);
        }
      })
      .catch(err => {
        console.warn('API error fetching tenant analytics:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleImpersonate = (tenant) => {
    if (!tenant.admin) return;

    // Save current Superadmin details
    const currentSuperadmin = localStorage.getItem('crm_user');
    if (!currentSuperadmin) return;

    localStorage.setItem('crm_superadmin_user', currentSuperadmin);

    // Create impersonated user session
    const impersonatedUser = {
      ...tenant.admin,
      role: tenant.admin.role || 'Admin',
      tenant_name: tenant.name // Add the tenant's name
    };

    // Overwrite session keys
    localStorage.setItem('crm_user', JSON.stringify(impersonatedUser));
    localStorage.setItem('crm_tenant_id', tenant.id.toString());
    localStorage.setItem('crm_active_role', tenant.admin.role || 'Admin');

    // Redirect to dashboard (root path) and reload
    const targetUrl = window.location.origin + basePath + '/';
    window.location.href = targetUrl;
  };

  const handleOpenConfig = (tenant) => {
    setSelectedTenant(tenant);
    setTenantForm({
      name: tenant.name || '',
      currency_name: tenant.currency_name || 'Indian Rupee',
      currency_symbol: tenant.currency_symbol || '₹'
    });
    setTenantSmtp({
      host: '',
      port: 465,
      encryption: 'ssl',
      username: '',
      password: '',
      from_name: '',
      from_email: ''
    });
    setIsConfigModalOpen(true);
    setConfigTab('Organization');

    fetch(`http://localhost/lead/api/smtp_config.php?tenant_id=${tenant.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setTenantSmtp(data.data);
        }
      })
      .catch(err => console.warn('Error fetching SMTP settings:', err));
  };

  const handleCurrencyChange = (e) => {
    const selectedName = e.target.value;
    const found = currenciesList.find(c => c.name === selectedName);
    setTenantForm(prev => ({
      ...prev,
      currency_name: selectedName,
      currency_symbol: found ? found.symbol : '₹'
    }));
  };

  const handleSaveOrganization = (e) => {
    e.preventDefault();
    if (!tenantForm.name.trim()) {
      toast.warning('Organization name is required.');
      return;
    }

    fetch('http://localhost/lead/api/tenants.php', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': selectedTenant.id.toString()
      },
      body: JSON.stringify({
        name: tenantForm.name.trim(),
        currency_name: tenantForm.currency_name,
        currency_symbol: tenantForm.currency_symbol
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Organization settings updated successfully.');
          fetchAnalytics();
          setIsConfigModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to update organization settings.');
        }
      })
      .catch(() => toast.error('Network error.'));
  };

  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setTenantSmtp(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSmtp = (e) => {
    e.preventDefault();
    if (!tenantSmtp.host || !tenantSmtp.username || !tenantSmtp.password || !tenantSmtp.from_name || !tenantSmtp.from_email) {
      toast.warning('Please fill in all SMTP fields.');
      return;
    }

    setSmtpSaving(true);
    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': selectedTenant.id.toString()
      },
      body: JSON.stringify({
        action: 'save',
        ...tenantSmtp
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('SMTP configurations saved successfully.');
          setIsConfigModalOpen(false);
        } else {
          toast.error(data.error || 'Failed to save SMTP settings.');
        }
      })
      .catch(() => toast.error('Network error.'))
      .finally(() => setSmtpSaving(false));
  };

  const handleTestConnection = () => {
    if (!tenantSmtp.host || !tenantSmtp.username || !tenantSmtp.password) {
      toast.warning('Please fill host, username, and password first.');
      return;
    }
    setSmtpTesting(true);
    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': selectedTenant.id.toString()
      },
      body: JSON.stringify({
        action: 'test_connection',
        ...tenantSmtp
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message || 'SMTP Connection successful!');
        } else {
          toast.error(data.error || 'SMTP Connection failed.');
        }
      })
      .catch(() => toast.error('Network error.'))
      .finally(() => setSmtpTesting(false));
  };

  const handleSendTestEmail = (e) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      toast.warning('Recipient email is required.');
      return;
    }
    setSmtpSendingTest(true);
    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': selectedTenant.id.toString()
      },
      body: JSON.stringify({
        action: 'send_test',
        to_email: testEmail.trim()
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(data.message || 'Test email sent successfully!');
          setShowTestModal(false);
          setTestEmail('');
        } else {
          toast.error(data.error || 'Failed to send test email.');
        }
      })
      .catch(() => toast.error('Network error.'))
      .finally(() => setSmtpSendingTest(false));
  };

  // Handle Sort changes
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortBy === key && sortOrder === 'asc') {
      direction = 'desc';
    }
    setSortBy(key);
    setSortOrder(direction);
  };

  // Global aggregates calculation
  const totalTenants = analytics.length;
  const totalUsers = analytics.reduce((sum, t) => sum + t.users.total, 0);
  const totalLeads = analytics.reduce((sum, t) => sum + t.leads.total, 0);
  const totalRevenue = analytics.reduce((sum, t) => sum + t.leads.revenue, 0);

  // Search & Sort implementation
  const filteredAndSorted = analytics
    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'id':
          valA = a.id;
          valB = b.id;
          break;
        case 'users':
          valA = a.users.total;
          valB = b.users.total;
          break;
        case 'leads':
          valA = a.leads.total;
          valB = b.leads.total;
          break;
        case 'revenue':
          valA = a.leads.revenue;
          valB = b.leads.revenue;
          break;
        case 'name':
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading tenant analytical reports...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Analytics Aggregate Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalTenants}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Organizations</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalUsers}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Registered Users</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLeads}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>CRM Leads Generated</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₹{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Closed Sales</div>
          </div>
        </div>

      </div>

      {/* Toolbar */}
      <div className="leads-page-header" style={{ marginBottom: 0 }}>
        <div className="leads-toolbar">
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search tenant organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Reports Table Grid */}
      <div className="leads-table-card">
        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', padding: '16px 24px' }}>
          <span>Tenant Analytical Ledger</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            Showing {filteredAndSorted.length} of {totalTenants} organizations
          </span>
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  ID <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                </th>
                <th onClick={() => requestSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Tenant Organization <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                </th>
                <th>Primary Admin</th>
                <th onClick={() => requestSort('users')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  User Base <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                </th>
                <th onClick={() => requestSort('leads')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Leads Summary <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                </th>
                <th onClick={() => requestSort('revenue')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Sales Revenue <ArrowUpDown size={12} style={{ marginLeft: 4, display: 'inline' }} />
                </th>
                <th>Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.length > 0 ? (
                filteredAndSorted.map((tenant) => (
                  <tr key={tenant.id}>
                    {/* ID */}
                    <td style={{ fontWeight: 600 }}>#{tenant.id}</td>
                    
                    {/* Tenant Name */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tenant.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Calendar size={11} /> Registered: {new Date(tenant.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Primary Admin */}
                    <td>
                      {tenant.admin ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {tenant.admin.first_name} {tenant.admin.last_name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {tenant.admin.email}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 500 }}>
                          No Administrator
                        </span>
                      )}
                    </td>

                    {/* User Base */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {tenant.users.total} Users
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tenant.users.Admin > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(34, 211, 238, 0.15)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.users.Admin} Admin
                            </span>
                          )}
                          {tenant.users.Manager > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.users.Manager} Mgr
                            </span>
                          )}
                          {tenant.users['Sales Associate'] > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.users['Sales Associate']} Agent
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Leads Summary */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {tenant.leads.total} Leads
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tenant.leads.pending > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(249, 115, 22, 0.15)', color: 'var(--accent-orange)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.leads.pending} Open
                            </span>
                          )}
                          {tenant.leads.won > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.leads.won} Won
                            </span>
                          )}
                          {tenant.leads.lost > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {tenant.leads.lost} Lost
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Sales Revenue */}
                    <td>
                      <span style={{ color: tenant.leads.revenue > 0 ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 700 }}>
                        {tenant.currency_symbol || '₹'}{tenant.leads.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </td>

                    {/* Activity */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={13} style={{ color: 'var(--accent-cyan)' }} />
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {tenant.activities_count}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleOpenConfig(tenant)}
                          className="modal-btn secondary"
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            height: 'auto',
                            minHeight: '0',
                            gap: '4px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Settings size={12} /> Config
                        </button>
                        {tenant.admin ? (
                          <button 
                            onClick={() => handleImpersonate(tenant)}
                            className="add-lead-btn"
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              height: 'auto',
                              minHeight: '0',
                              gap: '4px'
                            }}
                          >
                            <UserCheck size={12} /> Impersonate
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No tenant organizations match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIG TENANT MODAL */}
      {isConfigModalOpen && selectedTenant && createPortal(
        <div className="modal-overlay" onClick={() => setIsConfigModalOpen(false)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configure {selectedTenant.name}</h3>
              <button className="modal-close-btn" onClick={() => setIsConfigModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
              <button 
                onClick={() => setConfigTab('Organization')}
                style={{
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: configTab === 'Organization' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderBottom: configTab === 'Organization' ? '2px solid var(--accent-cyan)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Organization Settings
              </button>
              <button 
                onClick={() => setConfigTab('SMTP')}
                style={{
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: configTab === 'SMTP' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderBottom: configTab === 'SMTP' ? '2px solid var(--accent-cyan)' : 'none',
                  cursor: 'pointer'
                }}
              >
                SMTP Settings
              </button>
            </div>

            <div className="modal-body">
              {configTab === 'Organization' ? (
                <form onSubmit={handleSaveOrganization}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Organization Name *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={tenantForm.name}
                        onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Currency Name</label>
                        <select 
                          className="form-control"
                          value={tenantForm.currency_name}
                          onChange={handleCurrencyChange}
                        >
                          {currenciesList.map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Currency Symbol</label>
                        <input
                          type="text"
                          className="form-control"
                          readOnly
                          style={{ background: 'var(--bg-card-hover)' }}
                          value={tenantForm.currency_symbol}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      <button type="button" className="modal-btn secondary" onClick={() => setIsConfigModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="modal-btn primary">
                        <Save size={14} style={{ marginRight: 6 }} /> Save Organization
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSaveSmtp}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">SMTP Host *</label>
                        <input
                          type="text"
                          required
                          name="host"
                          placeholder="smtp.hostinger.com"
                          className="form-control"
                          value={tenantSmtp.host}
                          onChange={handleSmtpChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SMTP Port *</label>
                        <input
                          type="number"
                          required
                          name="port"
                          placeholder="465"
                          className="form-control"
                          value={tenantSmtp.port}
                          onChange={handleSmtpChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Encryption Protocol</label>
                        <select
                          name="encryption"
                          className="form-control"
                          value={tenantSmtp.encryption}
                          onChange={handleSmtpChange}
                        >
                          <option value="ssl">SSL (Recommended)</option>
                          <option value="tls">STARTTLS</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Sender Email *</label>
                        <input
                          type="email"
                          required
                          name="from_email"
                          placeholder="noreply@example.com"
                          className="form-control"
                          value={tenantSmtp.from_email}
                          onChange={handleSmtpChange}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Sender Name *</label>
                        <input
                          type="text"
                          required
                          name="from_name"
                          placeholder="SAR Workforce Admin"
                          className="form-control"
                          value={tenantSmtp.from_name}
                          onChange={handleSmtpChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SMTP Username *</label>
                        <input
                          type="text"
                          required
                          name="username"
                          placeholder="SMTP login email"
                          className="form-control"
                          value={tenantSmtp.username}
                          onChange={handleSmtpChange}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">SMTP Password *</label>
                      <input
                        type="password"
                        required
                        name="password"
                        placeholder="SMTP login password"
                        className="form-control"
                        value={tenantSmtp.password}
                        onChange={handleSmtpChange}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="modal-btn secondary"
                          disabled={smtpTesting}
                          onClick={handleTestConnection}
                        >
                          {smtpTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button
                          type="button"
                          className="modal-btn secondary"
                          onClick={() => setShowTestModal(true)}
                        >
                          Send Test Email
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="modal-btn secondary" onClick={() => setIsConfigModalOpen(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="modal-btn primary" disabled={smtpSaving}>
                          {smtpSaving ? 'Saving...' : <><Save size={14} style={{ marginRight: 6 }} /> Save SMTP</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      , document.body)}

      {/* TEST EMAIL MODAL */}
      {showTestModal && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowTestModal(false)}>
          <div className="modal-container" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Send SMTP Test Email</h3>
              <button className="modal-close-btn" onClick={() => setShowTestModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSendTestEmail}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Recipient Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter email to receive test"
                    className="form-control"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setShowTestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={smtpSendingTest}>
                  {smtpSendingTest ? 'Sending...' : <><Send size={14} style={{ marginRight: 6 }} /> Send Test</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

    </div>
  );
};

export default TenantReports;
