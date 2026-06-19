import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Building, ShieldAlert, ShieldCheck, Mail, Phone, Calendar, User, UserCheck, Settings, Save, Send, Ban, MoreVertical } from 'lucide-react';
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
  const [openActionMenu, setOpenActionMenu] = useState(null);

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

  const handleToggleSuspend = (tenant) => {
    const isSuspended = tenant.is_deleted === 1 || tenant.is_deleted === '1';
    const nextDeleted = isSuspended ? 0 : 1;
    const actionText = nextDeleted === 1 ? 'suspend' : 'activate';
    
    if (!window.confirm(`Are you sure you want to ${actionText} organization '${tenant.name}' and all associated user accounts?`)) {
      return;
    }
    
    fetch(`${apiBaseUrl}/tenants`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenant.id.toString()
      },
      body: JSON.stringify({
        name: tenant.name,
        currency_name: tenant.currency_name,
        currency_symbol: tenant.currency_symbol,
        apps: tenant.apps,
        is_deleted: nextDeleted
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Organization ${nextDeleted === 1 ? 'suspended' : 'activated'} successfully.`);
          fetchTenants();
        } else {
          toast.error(data.error || 'Failed to update tenant status.');
        }
      })
      .catch((err) => {
        console.error("Error toggling tenant status:", err);
        toast.error('Network error while toggling organization status.');
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
      tenant_name: tenant.name, // Add the tenant's name
      apps: tenant.apps || [] // Include tenant's provisioned apps
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
          if (data.error && data.error.toLowerCase().includes('email')) {
            setFormErrors({ email: data.error });
          }
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
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Summary Metric Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
            <Building size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{tenants.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>Total Organizations</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tenants.filter(t => !(t.is_deleted === 1 || t.is_deleted === '1')).length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>Active Tenants</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
            <Ban size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tenants.filter(t => t.is_deleted === 1 || t.is_deleted === '1').length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>Suspended</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34, 211, 238, 0.15)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {tenants.filter(t => t.admin).length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>With Admins</div>
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

      {/* Tenant Table */}
      <div className="leads-table-card">
        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', padding: '16px 24px' }}>
          <span>Tenant Directory</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            Showing {filteredTenants.length} of {tenants.length} organizations
          </span>
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Organization</th>
                <th>Status</th>
                <th>Primary Administrator</th>
                <th>Applications</th>
                <th>Currency</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant) => {
                  const isSuspended = tenant.is_deleted === 1 || tenant.is_deleted === '1';
                  const tenantInitials = tenant.name
                    ? tenant.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    : 'TO';
                  return (
                    <tr key={tenant.id} style={{ opacity: isSuspended ? 0.65 : 1, transition: 'opacity 0.2s ease' }}>
                      {/* Organization */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSuspended
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)'
                              : 'linear-gradient(135deg, rgba(34, 211, 238, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
                            color: isSuspended ? 'var(--accent-red)' : 'var(--accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0,
                            border: isSuspended ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 211, 238, 0.15)'
                          }}>
                            {tenantInitials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{tenant.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>ID: #{tenant.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: isSuspended ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: isSuspended ? 'var(--accent-red)' : 'var(--accent-emerald)',
                          border: isSuspended ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isSuspended ? 'var(--accent-red)' : 'var(--accent-emerald)'
                          }}></span>
                          {isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      {/* Primary Admin */}
                      <td>
                        {tenant.admin ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isSuspended ? 'var(--border)' : 'var(--gradient-blue)',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 600,
                              flexShrink: 0
                            }}>
                              {getInitials(tenant.admin)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
                                {tenant.admin.first_name} {tenant.admin.last_name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={tenant.admin.email}>
                                {tenant.admin.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--accent-red)', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldAlert size={13} /> No Administrator
                          </span>
                        )}
                      </td>

                      {/* Apps */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {tenant.apps && tenant.apps.map(appId => {
                            let label = appId.toUpperCase();
                            let color = 'var(--text-muted)';
                            let bg = 'var(--bg-hover)';
                            if (appId === 'crm') { label = 'CRM'; color = 'var(--accent-cyan)'; bg = 'rgba(34, 211, 238, 0.1)'; }
                            if (appId === 'hrms') { label = 'HRMS'; color = 'var(--accent-blue)'; bg = 'rgba(59, 130, 246, 0.1)'; }
                            if (appId === 'accounting') { label = 'Acct'; color = 'var(--accent-purple)'; bg = 'rgba(139, 92, 246, 0.1)'; }
                            if (appId === 'inventory') { label = 'Inv'; color = 'var(--accent-orange)'; bg = 'rgba(249, 115, 22, 0.1)'; }
                            if (appId === 'servicedesk') { label = 'SD'; color = '#a78bfa'; bg = 'rgba(167, 139, 250, 0.1)'; }
                            return (
                              <span key={appId} style={{ fontSize: '10px', background: bg, border: `1px solid ${color}22`, padding: '1px 6px', borderRadius: '4px', color: color, fontWeight: 600 }}>
                                {label}
                              </span>
                            );
                          })}
                          {(!tenant.apps || tenant.apps.length === 0) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Currency */}
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {tenant.currency_symbol || '₹'} {tenant.currency_name || 'INR'}
                        </span>
                      </td>

                      {/* Registered */}
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {new Date(tenant.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="modal-btn secondary"
                            title="Tenant Action Menu"
                            onClick={() => setOpenActionMenu(openActionMenu === tenant.id ? null : tenant.id)}
                            style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {openActionMenu === tenant.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              zIndex: 10,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              minWidth: '160px'
                            }}>
                              <button
                                onClick={() => { handleOpenConfig(tenant); setOpenActionMenu(null); }}
                                className="modal-btn secondary"
                                title="Organization Settings"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  height: 'auto',
                                  minHeight: '0',
                                  gap: '8px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  border: 'none',
                                  background: 'transparent'
                                }}
                              >
                                <Settings size={14} /> Settings
                              </button>

                              <button
                                onClick={() => { handleToggleSuspend(tenant); setOpenActionMenu(null); }}
                                title={isSuspended ? 'Activate Organization' : 'Suspend Organization'}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  height: 'auto',
                                  minHeight: '0',
                                  gap: '8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: 'none',
                                  background: 'transparent',
                                  color: isSuspended ? 'var(--accent-emerald)' : 'var(--accent-red)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  justifyContent: 'flex-start',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isSuspended ? <ShieldCheck size={14} /> : <Ban size={14} />}
                                {isSuspended ? 'Activate' : 'Suspend'}
                              </button>

                              {tenant.admin && !isSuspended ? (
                                <button
                                  onClick={() => { handleImpersonate(tenant); setOpenActionMenu(null); }}
                                  className="add-lead-btn"
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    height: 'auto',
                                    minHeight: '0',
                                    gap: '8px',
                                    width: '100%',
                                    justifyContent: 'flex-start'
                                  }}
                                >
                                  <UserCheck size={14} /> Impersonate
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="modal-btn secondary"
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    height: 'auto',
                                    minHeight: '0',
                                    gap: '8px',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: 0.4,
                                    cursor: 'not-allowed',
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    border: 'none',
                                    background: 'transparent'
                                  }}
                                >
                                  <UserCheck size={14} /> Impersonate
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    No tenants found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                      { id: 'inventory', name: 'Warehouse (Inventory)' },
                      { id: 'servicedesk', name: 'Service Desk & Ticketing' }
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
                        { id: 'inventory', name: 'Smart Inventory & Warehouse Control', desc: 'Stock levels, barcode cataloging, and purchase orders.' },
                        { id: 'servicedesk', name: 'Service Desk & Ticketing', desc: 'Internal ticketing, SLA tracking, agent queues, and resolution analytics.' }
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
