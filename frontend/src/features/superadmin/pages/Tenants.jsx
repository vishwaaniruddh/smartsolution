import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Building, ShieldAlert, Mail, Phone, Calendar, User, UserCheck, Settings, Save, Send } from 'lucide-react';
import { basePath, apiBaseUrl } from '../../../utils/env.js';
import { useToast } from '../../../components/NotificationContext';

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



const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone) => {
  if (!phone) return true;
  const trimmed = phone.trim();
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
  if (phoneRegex.test(trimmed)) {
    const digitCount = trimmed.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15;
  }
  return false;
};

const Tenants = () => {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Config modal state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [configTab, setConfigTab] = useState('Organization'); // 'Organization' or 'SMTP'
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    currency_name: 'Indian Rupee',
    currency_symbol: '₹',
    apps: []
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

  // Tenant + Admin Creation Form
  const [form, setForm] = useState({
    tenant_name: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    contact: '',
    gender: 'Male',
    address: '',
    apps: ['crm']
  });

  const [formErrors, setFormErrors] = useState({});

  const fetchTenants = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/tenants`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setTenants(data.data);
        }
      })
      .catch(err => {
        console.warn('API error fetching tenants:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

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
      currency_symbol: tenant.currency_symbol || '₹',
      apps: tenant.apps || []
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

    fetch(`${apiBaseUrl}/smtp-config?tenant_id=${tenant.id}`)
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

    fetch(`${apiBaseUrl}/tenants`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': selectedTenant.id.toString()
      },
      body: JSON.stringify({
        name: tenantForm.name.trim(),
        currency_name: tenantForm.currency_name,
        currency_symbol: tenantForm.currency_symbol,
        apps: tenantForm.apps
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Organization settings updated successfully.');
          fetchTenants();
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
    fetch(`${apiBaseUrl}/smtp-config`, {
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
    fetch(`${apiBaseUrl}/smtp-config`, {
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
    fetch(`${apiBaseUrl}/smtp-config`, {
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

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleOpenModal = () => {

    setForm({
      tenant_name: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      contact: '',
      gender: 'Male',
      address: '',
      apps: ['crm']
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!form.tenant_name || !form.tenant_name.trim()) {
      errors.tenant_name = 'Tenant Organization Name is required.';
    }
    if (!form.first_name || !form.first_name.trim()) {
      errors.first_name = 'Admin first name is required.';
    }
    if (!form.last_name || !form.last_name.trim()) {
      errors.last_name = 'Admin last name is required.';
    }
    if (!form.email || !form.email.trim()) {
      errors.email = 'Admin email is required.';
    } else if (!validateEmail(form.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!form.password || !form.password.trim()) {
      errors.password = 'Initial password is required.';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    if (form.contact && !validatePhone(form.contact)) {
      errors.contact = 'Please enter a valid contact number (7-15 digits).';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    fetch(`${apiBaseUrl}/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          fetchTenants();
          setIsModalOpen(false);
          // Refresh the AppShell tenant dropdown by reloading or calling parent handler
          window.location.reload();
        } else {
          toast.error('Error: ' + data.error);
        }
      })
      .catch((err) => {
        console.warn('API error creating tenant:', err);
        toast.error('Failed to connect to the backend server to create tenant.');
      });
  };

  const filteredTenants = tenants.filter(t => {
    const term = searchTerm.toLowerCase();
    const nameMatch = t.name.toLowerCase().includes(term);
    const idMatch = t.id.toString() === term;
    
    let adminMatch = false;
    if (t.admin) {
      const fullName = `${t.admin.first_name} ${t.admin.last_name}`.toLowerCase();
      const email = t.admin.email.toLowerCase();
      adminMatch = fullName.includes(term) || email.includes(term);
    }

    return nameMatch || idMatch || adminMatch;
  });

  const getInitials = (admin) => {
    if (!admin) return '??';
    const first = admin.first_name ? admin.first_name.charAt(0) : '';
    const last = admin.last_name ? admin.last_name.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  if (loading && tenants.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading tenant directory...
      </div>
    );
  }

  return (
    <>
      <div className="animate-in">
      {/* Top summary metrics widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
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
            <Building size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{tenants.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Total Organizations</div>
          </div>
        </div>

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
            color: 'var(--accent-emerald)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <UserCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tenants.filter(t => t.admin).length}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>Active Administrators</div>
          </div>
        </div>
      </div>

      <div className="leads-page-header">
        <div className="leads-toolbar">
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by tenant name, admin name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button className="add-lead-btn" onClick={handleOpenModal}>
          <Plus size={16} /> Add Tenant
        </button>
      </div>

      <div className="users-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredTenants.length > 0 ? (
          filteredTenants.map((tenant) => {
            const tenantInitials = tenant.name
              ? tenant.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
              : 'TO';
            return (
              <div 
                key={tenant.id} 
                className="user-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)', 
                    color: 'var(--accent-cyan)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700,
                    fontSize: '16px',
                    border: '1px solid rgba(34, 211, 238, 0.2)',
                    flexShrink: 0 
                  }}>
                    {tenantInitials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tenant.name}>
                      {tenant.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        ID: #{tenant.id}
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></span>
                        {tenant.currency_symbol || '₹'} ({tenant.currency_name || 'Indian Rupee'})
                      </span>
                    </div>
                    {/* Active Provisioned Application Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {tenant.apps && tenant.apps.map(appId => {
                        let label = appId.toUpperCase();
                        let color = 'var(--text-muted)';
                        let bg = 'var(--bg-hover)';
                        if (appId === 'crm') { label = 'CRM'; color = 'var(--accent-cyan)'; bg = 'rgba(34, 211, 238, 0.1)'; }
                        if (appId === 'hrms') { label = 'HRMS'; color = 'var(--accent-blue)'; bg = 'rgba(59, 130, 246, 0.1)'; }
                        if (appId === 'accounting') { label = 'Accounting'; color = 'var(--accent-purple)'; bg = 'rgba(139, 92, 246, 0.1)'; }
                        if (appId === 'inventory') { label = 'Inventory'; color = 'var(--accent-orange)'; bg = 'rgba(249, 115, 22, 0.1)'; }
                        return (
                          <span key={appId} style={{ fontSize: '10px', background: bg, border: `1px solid ${color}33`, padding: '1px 6px', borderRadius: '4px', color: color, fontWeight: 600 }}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Administrator Profile
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      Registered: {new Date(tenant.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {tenant.admin ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card-hover)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                          {getInitials(tenant.admin)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {tenant.admin.first_name} {tenant.admin.last_name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Primary Owner</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                        <div className="user-info-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <Mail size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tenant.admin.email}>
                            {tenant.admin.email}
                          </span>
                        </div>
                        <div className="user-info-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                          <Phone size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px' }}>{tenant.admin.contact || 'No contact number'}</span>
                        </div>
                        {tenant.admin.address && (
                          <div className="user-info-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '2px', width: '35px', flexShrink: 0 }}>Loc:</span>
                            <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{tenant.admin.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', gap: '10px', flex: 1 }}>
                      <ShieldAlert size={28} style={{ color: 'var(--accent-red)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                        No administrator registered.
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => handleOpenConfig(tenant)}
                    className="modal-btn secondary"
                    style={{
                      padding: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      height: 'auto',
                      minHeight: '0',
                      gap: '8px',
                      borderRadius: '0',
                      border: 'none',
                      background: 'var(--bg-card-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Settings size={14} /> Settings
                  </button>
                  <button 
                    onClick={() => handleImpersonate(tenant)}
                    disabled={!tenant.admin}
                    className="add-lead-btn"
                    style={{
                      padding: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      height: 'auto',
                      minHeight: '0',
                      gap: '8px',
                      borderRadius: '0',
                      border: 'none',
                      background: tenant.admin ? 'var(--gradient-blue)' : 'var(--bg-card-hover)',
                      color: tenant.admin ? 'white' : 'var(--text-muted)',
                      opacity: tenant.admin ? 1 : 0.5,
                      cursor: tenant.admin ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <UserCheck size={14} /> Impersonate
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No tenants found matching search criteria.
          </div>
        )}
      </div>
      </div>

      {/* CREATE TENANT + ADMIN MODAL */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Tenant Organization</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tenant details
                </h4>
                <div className="form-group">
                  <label className="form-label">Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stark Industries"
                    className={`form-control ${formErrors.tenant_name ? 'is-invalid' : ''}`}
                    value={form.tenant_name}
                    onChange={(e) => {
                      setForm({ ...form, tenant_name: e.target.value });
                      if (formErrors.tenant_name) setFormErrors({ ...formErrors, tenant_name: null });
                    }}
                  />
                  {formErrors.tenant_name && <span className="invalid-feedback">{formErrors.tenant_name}</span>}
                </div>

                <h4 style={{ margin: '16px 0 12px 0', fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Primary Admin Credentials
                </h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admin First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tony"
                      className={`form-control ${formErrors.first_name ? 'is-invalid' : ''}`}
                      value={form.first_name}
                      onChange={(e) => {
                        setForm({ ...form, first_name: e.target.value });
                        if (formErrors.first_name) setFormErrors({ ...formErrors, first_name: null });
                      }}
                    />
                    {formErrors.first_name && <span className="invalid-feedback">{formErrors.first_name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Admin Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stark"
                      className={`form-control ${formErrors.last_name ? 'is-invalid' : ''}`}
                      value={form.last_name}
                      onChange={(e) => {
                        setForm({ ...form, last_name: e.target.value });
                        if (formErrors.last_name) setFormErrors({ ...formErrors, last_name: null });
                      }}
                    />
                    {formErrors.last_name && <span className="invalid-feedback">{formErrors.last_name}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admin Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="tony@stark.com"
                      className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                      }}
                    />
                    {formErrors.email && <span className="invalid-feedback">{formErrors.email}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                      value={form.password}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        if (formErrors.password) setFormErrors({ ...formErrors, password: null });
                      }}
                    />
                    {formErrors.password && <span className="invalid-feedback">{formErrors.password}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 012-3456"
                      className={`form-control ${formErrors.contact ? 'is-invalid' : ''}`}
                      value={form.contact}
                      onChange={(e) => {
                        setForm({ ...form, contact: e.target.value });
                        if (formErrors.contact) setFormErrors({ ...formErrors, contact: null });
                      }}
                    />
                    {formErrors.contact && <span className="invalid-feedback">{formErrors.contact}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    rows="2"
                    placeholder="Enter street, city, state, zip code..."
                    className="form-control"
                    style={{ resize: 'vertical' }}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label className="form-label">Provision Applications</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                    {[
                      { id: 'crm', name: 'Lead & Sales (CRM)' },
                      { id: 'hrms', name: 'HR Management (HRMS)' },
                      { id: 'accounting', name: 'Financial Ledger (Accounting)' },
                      { id: 'inventory', name: 'Warehouse (Inventory)' }
                    ].map(app => (
                      <label key={app.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={form.apps.includes(app.id)}
                          onChange={(e) => {
                            const newApps = e.target.checked
                              ? [...form.apps, app.id]
                              : form.apps.filter(x => x !== app.id);
                            setForm({ ...form, apps: newApps });
                          }}
                          style={{ accentColor: 'var(--accent-cyan)' }}
                        />
                        {app.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary">
                  Create Tenant &amp; Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

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
              <button 
                onClick={() => setConfigTab('Apps')}
                style={{
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: configTab === 'Apps' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderBottom: configTab === 'Apps' ? '2px solid var(--accent-cyan)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Application Access
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
              ) : configTab === 'SMTP' ? (
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
              ) : (
                <form onSubmit={handleSaveOrganization}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Select which applications/modules this tenant has access to. Users of this tenant will only see and be able to open the selected applications.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--bg-card-hover)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      {[
                        { id: 'crm', name: 'Lead & Sales Intelligence (CRM)', desc: 'Pipeline management, activity logging, and revenue analytics.' },
                        { id: 'hrms', name: 'Human Resource Management (HRMS)', desc: 'Employee directory, attendance trackers, leaves, and payroll.' },
                        { id: 'accounting', name: 'Double-Entry Financial Ledger', desc: 'Invoicing, bookkeeping accounts, and tax reporting.' },
                        { id: 'inventory', name: 'Smart Inventory & Warehouse Control', desc: 'Stock levels, barcode cataloging, and purchase orders.' }
                      ].map(app => (
                        <label key={app.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: tenantForm.apps.includes(app.id) ? 'rgba(34, 211, 238, 0.04)' : 'transparent', transition: 'all 0.2s' }}>
                          <input
                            type="checkbox"
                            checked={tenantForm.apps.includes(app.id)}
                            onChange={(e) => {
                              const newApps = e.target.checked
                                ? [...tenantForm.apps, app.id]
                                : tenantForm.apps.filter(x => x !== app.id);
                              setTenantForm({ ...tenantForm, apps: newApps });
                            }}
                            style={{ marginTop: '3px', accentColor: 'var(--accent-cyan)' }}
                          />
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{app.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{app.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      <button type="button" className="modal-btn secondary" onClick={() => setIsConfigModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="modal-btn primary">
                        <Save size={14} style={{ marginRight: 6 }} /> Save Application Access
                      </button>
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
    </>
  );
};

export default Tenants;
