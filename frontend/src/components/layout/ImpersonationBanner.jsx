import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { basePath } from '../../utils/env';

const ImpersonationBanner = () => {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const activeRole = user.role;
  const isImpersonatingSuperadmin = !!localStorage.getItem('crm_superadmin_token') && activeRole !== 'Superadmin';
  const isImpersonatingTenantAdmin = !!localStorage.getItem('crm_tenant_admin_token');
  const isImpersonating = isImpersonatingSuperadmin || isImpersonatingTenantAdmin;

  if (!isImpersonating) return null;

  const handleStopImpersonation = () => {
    const superadminToken = localStorage.getItem('crm_superadmin_token');
    const tenantAdminToken = localStorage.getItem('crm_tenant_admin_token');

    if (tenantAdminToken) {
      localStorage.setItem('crm_token', tenantAdminToken);
      localStorage.removeItem('crm_tenant_admin_token');
      const targetUrl = window.location.origin + basePath + '/users';
      window.location.href = targetUrl;
    } else if (superadminToken) {
      localStorage.setItem('crm_token', superadminToken);
      localStorage.removeItem('crm_superadmin_token');
      const targetUrl = window.location.origin + basePath + '/superadmin/tenants';
      window.location.href = targetUrl;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(90deg, #d97706, #b45309)',
      color: 'white',
      padding: '8px 28px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px',
      fontWeight: 600,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: 1000,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      flexShrink: 0,
      position: 'relative'
    }}>
      <span>⚠️ You are currently impersonating <strong>{isImpersonatingTenantAdmin ? `${user?.first_name} ${user?.last_name}` : (user?.tenant_name || 'Tenant Admin')}</strong> ({user?.role}).</span>
      <button 
        onClick={handleStopImpersonation}
        style={{
          background: 'white',
          color: '#b45309',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'transform 0.1s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Return to {isImpersonatingTenantAdmin ? 'Admin' : 'Superadmin'}
      </button>
    </div>
  );
};

export default ImpersonationBanner;
