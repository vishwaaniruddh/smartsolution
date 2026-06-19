import React, { useState, useEffect, useRef } from 'react';
import { Save, Image as ImageIcon, Monitor } from 'lucide-react';
import { useToast } from '../components/NotificationContext';
import { apiBaseUrl, basePath } from '../utils/env.js';
import { useSettings } from '../components/SettingsContext';

const SiteBrandingSettings = ({ isSuperadmin }) => {
  const toast = useToast();
  const { refetchSettings } = useSettings();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    software_name: '',
    title: '',
    description: ''
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const type = isSuperadmin ? 'superadmin' : 'tenant';
        const res = await fetch(`${apiBaseUrl}/settings?type=${type}`, {
          headers: {
            'X-Tenant-ID': localStorage.getItem('crm_tenant_id') || '1'
          }
        });
        const data = await res.json();
        
        if (data.success && data.data) {
          setFormData({
            software_name: data.data.software_name || '',
            title: data.data.title || '',
            description: data.data.description || ''
          });
          if (data.data.logo_url) {
             // Handle both old /api/uploads/.. format and new uploads/.. format
             const cleanPath = data.data.logo_url.replace(/^\/?api\//, '');
             setPreviewUrl(`${apiBaseUrl}/${cleanPath}`);
          }
        }
      } catch (err) {
        console.error('Failed to load branding settings', err);
        toast.error('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [isSuperadmin]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.warning('Logo file size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const type = isSuperadmin ? 'superadmin' : 'tenant';
      const formDataObj = new FormData();
      formDataObj.append('type', type);
      formDataObj.append('software_name', formData.software_name);
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      
      if (logoFile) {
        formDataObj.append('logo', logoFile);
      }

      const res = await fetch(`${apiBaseUrl}/settings`, {
        method: 'POST',
        headers: {
          'X-Tenant-ID': localStorage.getItem('crm_tenant_id') || '1'
        },
        body: formDataObj
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message || 'Settings updated successfully');
        refetchSettings(); // Update global context immediately
      } else {
        toast.error(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-input)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading branding settings...</div>;
  }

  return (
    <div className="report-card" style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {isSuperadmin ? 'Global Site Branding' : 'Tenant Site Branding'}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Customize your software name, logo, and login page titles.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="settings-form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'start' }}>
            {/* Logo Upload Section */}
            <div style={{ background: 'var(--bg-hover)', padding: '20px', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px dashed var(--border)' }}>
              <label style={labelStyle}>Company Logo</label>
              
              <div 
                style={{ 
                  width: '120px', height: '120px', margin: '0 auto 16px',
                  background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', border: '1px solid var(--border)'
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <ImageIcon size={32} color="var(--text-muted)" />
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/gif, image/webp" 
                style={{ display: 'none' }} 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current.click()}
                style={{
                  padding: '8px 16px', background: 'var(--accent-blue)', color: 'white',
                  border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Upload Logo
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Max size: 2MB. Format: PNG, JPG, WEBP.
              </p>
            </div>

            {/* Text Details Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Software Name</label>
                <input
                  type="text"
                  value={formData.software_name}
                  onChange={(e) => setFormData({ ...formData, software_name: e.target.value })}
                  placeholder={isSuperadmin ? "SAR Software Solutions" : "Acme Corp Software"}
                  style={inputStyle}
                />
              </div>
              
              <div>
                <label style={labelStyle}>Page Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Welcome to the Platform"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Site Description (SEO / Meta)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter a brief description..."
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: '#3b82f6', color: 'white',
                borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SiteBrandingSettings;
