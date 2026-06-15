import React, { useState, useEffect } from 'react';
import { Mail, Save, Activity, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';

const SMTPConfig = () => {
  const [config, setConfig] = useState({
    host: '',
    port: 465,
    encryption: 'ssl',
    username: '',
    password: '',
    from_name: '',
    from_email: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('http://localhost/lead/api/smtp_config.php', {
        headers: {
          'X-Tenant-ID': localStorage.getItem('tenant_id') || '1'
        }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch SMTP config:', error);
      showToast('Failed to load configuration.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('http://localhost/lead/api/smtp_config.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('tenant_id') || '1'
        },
        body: JSON.stringify({ action: 'save', ...config })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Settings saved successfully!');
      } else {
        showToast(data.error || 'Failed to save settings.', 'error');
      }
    } catch (error) {
      console.error('Error saving SMTP config:', error);
      showToast('An error occurred while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('http://localhost/lead/api/smtp_config.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('tenant_id') || '1'
        },
        body: JSON.stringify({ action: 'test_connection', ...config })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Connection successful!', 'success');
      } else {
        showToast(data.error || 'Connection failed.', 'error');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      showToast('An error occurred during testing.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      showToast('Please enter an email address.', 'error');
      return;
    }
    
    setIsSendingTest(true);
    try {
      const response = await fetch('http://localhost/lead/api/smtp_config.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('tenant_id') || '1'
        },
        body: JSON.stringify({ action: 'send_test', to_email: testEmail })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Test email sent successfully!', 'success');
        setShowTestModal(false);
      } else {
        showToast(data.error || 'Failed to send test email.', 'error');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showToast('An error occurred while sending test email.', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="leads-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    );
  }

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div className="leads-content">
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="leads-page-header">
        <div className="leads-toolbar">
          <div className="leads-search">
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail style={{ color: '#3b82f6' }} size={24} />
                </div>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>SMTP Configurations</h1>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Manage your email delivery settings</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="report-card" style={{ maxWidth: '800px', margin: '0 auto', marginTop: '20px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Email Server Settings</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
          Configure your SMTP server to allow the system to send emails (e.g. Welcome Emails, Password Resets) on your behalf.
        </p>

        <form onSubmit={handleSave}>
          <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>SMTP Host *</label>
                <input
                  type="text"
                  name="host"
                  value={config.host}
                  onChange={handleChange}
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
                    value={config.port}
                    onChange={handleChange}
                    placeholder="465"
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Encryption</label>
                  <select
                    name="encryption"
                    value={config.encryption}
                    onChange={handleChange}
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
                  value={config.username}
                  onChange={handleChange}
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
                  value={config.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', marginBottom: '10px' }}>
              <hr style={{ borderColor: 'var(--border)', borderTop: 'none', margin: '20px 0' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Sender Details</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={labelStyle}>From Name *</label>
                <input
                  type="text"
                  name="from_name"
                  value={config.from_name}
                  onChange={handleChange}
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
                  value={config.from_email}
                  onChange={handleChange}
                  placeholder="noreply@example.com"
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)',
                    cursor: isTesting ? 'not-allowed' : 'pointer', opacity: isTesting ? 0.7 : 1
                  }}
                >
                  <Activity size={16} />
                  {isTesting ? 'Testing...' : 'Test Connection'}
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
                disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', background: '#3b82f6', color: 'white',
                  borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none',
                  cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1
                }}
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Send Test Email</h3>
              <button type="button" onClick={() => setShowTestModal(false)} className="close-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
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
            
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                style={{
                  padding: '10px 16px', background: 'var(--bg-hover)', color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', background: '#3b82f6', color: 'white',
                  borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none',
                  cursor: isSendingTest ? 'not-allowed' : 'pointer', opacity: isSendingTest ? 0.7 : 1
                }}
              >
                <Send size={16} />
                {isSendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SMTPConfig;
