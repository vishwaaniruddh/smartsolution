import React, { useState, useEffect } from 'react';
import { User, Key, Building2, Mail, Save, Activity, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useToast } from '../components/NotificationContext';

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

const SettingsPage = () => {
  const toast = useToast();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSuperadmin = currentUser?.role === 'Superadmin';
  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

  const [activeTab, setActiveTab] = useState('Profile');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    first_name: currentUser?.first_name || '',
    last_name: currentUser?.last_name || '',
    email: currentUser?.email || '',
    contact: currentUser?.contact || '',
    gender: currentUser?.gender || 'Other',
    address: currentUser?.address || ''
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Security Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Company Settings Form State
  const [companyForm, setCompanyForm] = useState({
    name: currentUser?.tenant_name || '',
    currency_name: currentUser?.currency_name || 'Indian Rupee',
    currency_symbol: currentUser?.currency_symbol || '₹'
  });
  const [companySaving, setCompanySaving] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 465,
    encryption: 'ssl',
    username: '',
    password: '',
    from_name: '',
    from_email: ''
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSendingTest, setSmtpSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch initial profile & tenant configurations
  useEffect(() => {
    if (currentUser && currentUser.id) {
      fetch(`http://localhost/lead/api/users.php?id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const dbUser = data.data;
            setProfileForm({
              first_name: dbUser.first_name || '',
              last_name: dbUser.last_name || '',
              email: dbUser.email || '',
              contact: dbUser.contact || '',
              gender: dbUser.gender || 'Other',
              address: dbUser.address || ''
            });

            if (dbUser.tenant_name) {
              setCompanyForm({
                name: dbUser.tenant_name || '',
                currency_name: dbUser.currency_name || 'Indian Rupee',
                currency_symbol: dbUser.currency_symbol || '₹'
              });
            }

            // Sync session
            const updatedSession = { ...currentUser, ...dbUser };
            localStorage.setItem('crm_user', JSON.stringify(updatedSession));
          }
        })
        .catch(err => console.warn('Error fetching fresh profile info:', err));
    }
  }, []);

  // Fetch SMTP configurations when tab becomes active
  useEffect(() => {
    if (activeTab === 'SMTP' && isAdminOrManager) {
      setSmtpLoading(true);
      fetch('http://localhost/lead/api/smtp_config.php', {
        headers: {
          'X-Tenant-ID': currentUser?.tenant_id || '1'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSmtpConfig(data.data);
          }
        })
        .catch(err => {
          console.error('Failed to load SMTP configurations:', err);
          toast.error('Failed to load SMTP configurations.');
        })
        .finally(() => setSmtpLoading(false));
    }
  }, [activeTab]);

  // Handle Profile Save
  const handleProfileSave = (e) => {
    e.preventDefault();
    setProfileSaving(true);

    if (!profileForm.first_name.trim() || !profileForm.last_name.trim() || !profileForm.email.trim()) {
      toast.warning('First name, last name, and email address are required.');
      setProfileSaving(false);
      return;
    }

    const payload = {
      id: currentUser.id,
      first_name: profileForm.first_name,
      last_name: profileForm.last_name,
      email: profileForm.email,
      contact: profileForm.contact,
      gender: profileForm.gender,
      address: profileForm.address,
      role: currentUser.role
    };

    fetch('http://localhost/lead/api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Profile updated successfully!');
          const updatedSession = { ...currentUser, ...payload };
          localStorage.setItem('crm_user', JSON.stringify(updatedSession));
          // Refresh layouts shortly after save
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          toast.error(data.error || 'Failed to update profile details.');
        }
      })
      .catch(err => {
        console.error('Error saving profile settings:', err);
        toast.error('Network error. Failed to save changes.');
      })
      .finally(() => setProfileSaving(false));
  };

  // Handle Password Save
  const handlePasswordSave = (e) => {
    e.preventDefault();
    setPasswordSaving(true);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.warning('New passwords do not match.');
      setPasswordSaving(false);
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.warning('Password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }

    const payload = {
      user_id: currentUser.id,
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password
    };

    fetch('http://localhost/lead/api/change_password.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Password updated successfully!');
          setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        } else {
          toast.error(data.error || 'Failed to change password.');
        }
      })
      .catch(() => toast.error('Network error.'))
      .finally(() => setPasswordSaving(false));
  };

  // Handle Company settings change
  const handleCurrencyChange = (e) => {
    const selectedName = e.target.value;
    const found = currenciesList.find(c => c.name === selectedName);
    setCompanyForm(prev => ({
      ...prev,
      currency_name: selectedName,
      currency_symbol: found ? found.symbol : '₹'
    }));
  };

  // Handle Company settings save
  const handleCompanySave = (e) => {
    e.preventDefault();
    setCompanySaving(true);

    if (!companyForm.name.trim()) {
      toast.warning('Company name is required.');
      setCompanySaving(false);
      return;
    }

    fetch('http://localhost/lead/api/tenants.php', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': currentUser?.tenant_id || '1'
      },
      body: JSON.stringify({
        name: companyForm.name.trim(),
        currency_name: companyForm.currency_name,
        currency_symbol: companyForm.currency_symbol
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Company settings saved successfully!');
          // Update details locally
          const updatedSession = {
            ...currentUser,
            tenant_name: companyForm.name.trim(),
            currency_name: companyForm.currency_name,
            currency_symbol: companyForm.currency_symbol
          };
          localStorage.setItem('crm_user', JSON.stringify(updatedSession));
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          toast.error(data.error || 'Failed to update company settings.');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Network error. Failed to save changes.');
      })
      .finally(() => setCompanySaving(false));
  };

  // Handle SMTP Settings Changes
  const handleSmtpChange = (e) => {
    const { name, value } = e.target;
    setSmtpConfig(prev => ({ ...prev, [name]: value }));
  };

  // Handle SMTP settings save
  const handleSmtpSave = (e) => {
    e.preventDefault();
    setSmtpSaving(true);

    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': currentUser?.tenant_id || '1'
      },
      body: JSON.stringify({ action: 'save', ...smtpConfig })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('SMTP configurations saved successfully.');
        } else {
          toast.error(data.error || 'Failed to save settings.');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('An error occurred while saving.');
      })
      .finally(() => setSmtpSaving(false));
  };

  // Handle SMTP Connection Test
  const handleSmtpTestConnection = () => {
    setSmtpTesting(true);
    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': currentUser?.tenant_id || '1'
      },
      body: JSON.stringify({ action: 'test_connection', ...smtpConfig })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('SMTP connection successful!');
        } else {
          toast.error(data.error || 'SMTP connection failed.');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Connection test failed.');
      })
      .finally(() => setSmtpTesting(false));
  };

  // Handle Send Test Email
  const handleSmtpSendTestEmail = () => {
    if (!testEmail) {
      toast.warning('Please enter a test recipient email address.');
      return;
    }

    setSmtpSendingTest(true);
    fetch('http://localhost/lead/api/smtp_config.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': currentUser?.tenant_id || '1'
      },
      body: JSON.stringify({ action: 'send_test', to_email: testEmail })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Test email sent successfully to ${testEmail}!`);
          setShowTestModal(false);
          setTestEmail('');
        } else {
          toast.error(data.error || 'Failed to send test email.');
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to send test email.');
      })
      .finally(() => setSmtpSendingTest(false));
  };

  const getProfileInitials = () => {
    const first = profileForm.first_name ? profileForm.first_name.charAt(0) : '';
    const last = profileForm.last_name ? profileForm.last_name.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };

  // Define tabs dynamically
  const tabs = [
    { icon: User, label: 'Profile' },
    { icon: Key, label: 'Security' }
  ];

  if (isAdminOrManager) {
    tabs.push({ icon: Building2, label: 'Company' });
    tabs.push({ icon: Mail, label: 'SMTP' });
  }

  return (
    <div className="settings-page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
      <div className="settings-layout" style={{ marginTop: '20px' }}>
        
        {/* Settings Navigation */}
        <div className="settings-nav">
          {tabs.map((item, i) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={i}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.label)}
                style={{
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  marginBottom: '4px'
                }}
              >
                <item.icon size={18} />
                <span>{item.label === 'SMTP' ? 'SMTP Server' : (item.label === 'Company' ? 'Company Settings' : item.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div style={{ flex: 1 }}>
          
          {/* PROFILE INFORMATION TAB */}
          {activeTab === 'Profile' && (
            <div className="report-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Profile Information</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'var(--gradient-blue)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 24
                }}>
                  {getProfileInitials()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
                    {profileForm.first_name} {profileForm.last_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {isSuperadmin ? 'System Superadmin' : `${companyForm.name} (${currentUser?.role})`}
                  </div>
                </div>
              </div>

              <form onSubmit={handleProfileSave}>
                <div className="settings-form-grid">
                  <div>
                    <label style={labelStyle}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address *</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone / Contact</label>
                    <input
                      type="text"
                      value={profileForm.contact}
                      onChange={(e) => setProfileForm({ ...profileForm, contact: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <button type="submit" disabled={profileSaving} className="add-lead-btn" style={{ gap: 8, marginTop: '20px' }}>
                  <Save size={16} /> {profileSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>
          )}

          {/* CHANGE PASSWORD TAB */}
          {activeTab === 'Security' && (
            <div className="report-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Change Password</h3>
              <form onSubmit={handlePasswordSave}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
                  <div>
                    <label style={labelStyle}>Current Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      style={inputStyle}
                    />
                  </div>

                  <button type="submit" disabled={passwordSaving} className="add-lead-btn" style={{ gap: 8, width: 'fit-content', marginTop: 8 }}>
                    <Key size={16} /> {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* COMPANY SETTINGS TAB */}
          {activeTab === 'Company' && isAdminOrManager && (
            <div className="report-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Company Settings</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Customize your organization profile and baseline currency symbol for calculations.
              </p>
              
              <form onSubmit={handleCompanySave}>
                <div className="settings-form-grid">
                  <div>
                    <label style={labelStyle}>Company Name *</label>
                    <input
                      type="text"
                      required
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Currency Setting</label>
                    <select
                      value={companyForm.currency_name}
                      onChange={handleCurrencyChange}
                      style={inputStyle}
                    >
                      {currenciesList.map((c, idx) => (
                        <option key={idx} value={c.name}>{c.name} ({c.symbol})</option>
                      ))}
                      <option value="Custom">Custom Currency</option>
                    </select>
                  </div>
                  
                  {companyForm.currency_name === 'Custom' && (
                    <>
                      <div>
                        <label style={labelStyle}>Custom Currency Name</label>
                        <input
                          type="text"
                          required
                          value={companyForm.currency_name}
                          onChange={(e) => setCompanyForm({ ...companyForm, currency_name: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Custom Symbol</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={companyForm.currency_symbol}
                          onChange={(e) => setCompanyForm({ ...companyForm, currency_symbol: e.target.value })}
                          style={inputStyle}
                        />
                      </div>
                    </>
                  )}
                </div>

                <button type="submit" disabled={companySaving} className="add-lead-btn" style={{ gap: 8, marginTop: '24px' }}>
                  <Building2 size={16} /> {companySaving ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}

          {/* SMTP CONFIGURATION TAB */}
          {activeTab === 'SMTP' && isAdminOrManager && (
            <div className="report-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Email Server Settings</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                Configure your SMTP server to allow the system to send emails (e.g. Welcome Emails, Password Resets) on your behalf.
              </p>

              {smtpLoading ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Loading SMTP configurations...</div>
              ) : (
                <form onSubmit={handleSmtpSave}>
                  <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={labelStyle}>SMTP Host *</label>
                        <input
                          type="text"
                          name="host"
                          value={smtpConfig.host}
                          onChange={handleSmtpChange}
                          placeholder="smtp.example.com"
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <label style={labelStyle}>Port *</label>
                          <input
                            type="number"
                            name="port"
                            value={smtpConfig.port}
                            onChange={handleSmtpChange}
                            placeholder="465"
                            style={inputStyle}
                            required
                          />
                        </div>
                        <div>
                          <label style={labelStyle}>Encryption</label>
                          <select
                            name="encryption"
                            value={smtpConfig.encryption}
                            onChange={handleSmtpChange}
                            style={inputStyle}
                          >
                            <option value="none">None</option>
                            <option value="ssl">SSL</option>
                            <option value="tls">TLS</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={labelStyle}>SMTP Username *</label>
                        <input
                          type="text"
                          name="username"
                          value={smtpConfig.username}
                          onChange={handleSmtpChange}
                          placeholder="user@example.com"
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>SMTP Password *</label>
                        <input
                          type="password"
                          name="password"
                          value={smtpConfig.password}
                          onChange={handleSmtpChange}
                          placeholder="••••••••"
                          style={inputStyle}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <hr style={{ borderColor: 'var(--border)', borderTop: 'none', margin: '10px 0 20px 0' }} />
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Sender Details</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={labelStyle}>From Name *</label>
                        <input
                          type="text"
                          name="from_name"
                          value={smtpConfig.from_name}
                          onChange={handleSmtpChange}
                          placeholder="My Company"
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>From Email *</label>
                        <input
                          type="email"
                          name="from_email"
                          value={smtpConfig.from_email}
                          onChange={handleSmtpChange}
                          placeholder="noreply@example.com"
                          style={inputStyle}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleSmtpTestConnection}
                          disabled={smtpTesting}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)',
                            borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)',
                            cursor: smtpTesting ? 'not-allowed' : 'pointer', opacity: smtpTesting ? 0.7 : 1
                          }}
                        >
                          <Activity size={16} />
                          {smtpTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTestModal(true)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                            borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: '1px solid rgba(59, 130, 246, 0.2)',
                            cursor: 'pointer'
                          }}
                        >
                          <Send size={16} />
                          Send Test Email
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={smtpSaving}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 20px', background: '#3b82f6', color: 'white',
                          borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none',
                          cursor: smtpSaving ? 'not-allowed' : 'pointer', opacity: smtpSaving ? 0.7 : 1
                        }}
                      >
                        <Save size={16} />
                        {smtpSaving ? 'Saving...' : 'Save settings'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="confirm-overlay" onClick={() => setShowTestModal(false)}>
          <div className="confirm-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '24px' }}>
            <div className="confirm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-white)' }}>Send Test Email</h3>
              <button type="button" onClick={() => setShowTestModal(false)} className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="confirm-body" style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Enter an email address to send a dummy message to. Ensure you save your settings first if you've made changes.
              </p>
              <div>
                <label style={labelStyle}>Recipient Email *</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  style={inputStyle}
                  required
                />
              </div>
            </div>
            
            <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="confirm-btn confirm-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSmtpSendTestEmail}
                disabled={smtpSendingTest}
                className="confirm-btn confirm-btn-confirm"
                style={{ background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}
              >
                <Send size={16} style={{ marginRight: '6px' }} />
                {smtpSendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
