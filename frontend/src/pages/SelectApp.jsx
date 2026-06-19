import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, Users, Wallet, Package, LogOut, Lock, ShieldCheck, ArrowRight, Headphones } from 'lucide-react';
import { basePath, apiBaseUrl } from '../utils/env.js';
import { useToast } from '../components/NotificationContext';

const appVisuals = {
  'crm': {
    icon: Sparkles,
    color: 'var(--accent-cyan)',
    bg: 'rgba(34, 211, 238, 0.08)',
    border: 'rgba(34, 211, 238, 0.2)',
    launchPath: '/feature/leads'
  },
  'hrms': {
    icon: Users,
    color: 'var(--accent-blue)',
    bg: 'rgba(59, 130, 246, 0.08)',
    border: 'rgba(59, 130, 246, 0.2)',
    launchPath: '/feature/hrms'
  },
  'accounting': {
    icon: Wallet,
    color: 'var(--accent-purple)',
    bg: 'rgba(139, 92, 246, 0.08)',
    border: 'rgba(139, 92, 246, 0.2)',
    launchPath: '/feature/accounting'
  },
  'inventory': {
    icon: Package,
    color: 'var(--accent-orange)',
    bg: 'rgba(249, 115, 22, 0.08)',
    border: 'rgba(249, 115, 22, 0.2)',
    launchPath: '/feature/inventory'
  },
  'servicedesk': {
    icon: Headphones,
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    border: 'rgba(167, 139, 250, 0.2)',
    launchPath: '/feature/servicedesk'
  }
};

const SelectApp = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const userStr = localStorage.getItem('crm_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [dbApps, setDbApps] = useState([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/apps`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setDbApps(data.data);
        }
      });
  }, []);

  if (!user) return null;

  const appsData = dbApps.map(app => {
    const visuals = appVisuals[app.id] || {
      icon: LayoutGrid,
      color: '#ffffff',
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.2)',
      launchPath: '#'
    };
    return { ...app, ...visuals };
  });

  const userApps = user.apps || [];
  const isSuperadmin = user.role === 'Superadmin';

  const sortedApps = [...appsData].sort((a, b) => {
    const hasA = isSuperadmin || userApps.includes(a.id);
    const hasB = isSuperadmin || userApps.includes(b.id);
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    return 0;
  });

  const handleLaunchApp = (app) => {
    const hasAccess = isSuperadmin || userApps.includes(app.id);
    if (!hasAccess) {
      toast.warning(`Access to ${app.name} is not provisioned for your tenant workspace. Please contact your system administrator.`);
      return;
    }

    localStorage.setItem('crm_active_app', app.id);
    
    // CRM module special routing for Sales Associate
    if (app.id === 'crm' && user.role === 'Sales Associate') {
      localStorage.setItem('crm_active_agent', `${user.first_name} ${user.last_name}`);
      navigate('/feature/leads/sa/dashboard');
    } else {
      navigate(app.launchPath);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant_id');
    localStorage.removeItem('crm_active_role');
    localStorage.removeItem('crm_active_agent');
    localStorage.removeItem('crm_superadmin_user');
    localStorage.removeItem('crm_active_app');
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e293b, #0f172a, #020617)',
      color: 'var(--text-primary)',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '30px'
    }}>
      
      {/* Header Bar */}
      <div style={{
        width: '100%',
        maxWidth: '1350px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px',
        animation: 'fadeInUp 0.4s ease-out'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={`${basePath}/sarlogoremovebg.png`} alt="SAR Workforce Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-white)', margin: 0 }}>SAR Workforce</h1>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Tenant Workspace: <strong style={{ color: 'var(--accent-cyan)' }}>{user.tenant_name || 'Superadmin Console'}</strong>
            </span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: 'var(--accent-red)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '1350px',
        background: 'rgba(20, 27, 45, 0.5)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease-out'
      }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-white)', margin: '0 0 8px 0' }}>
            Welcome back, {user.first_name}!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxW: '500px', margin: '0 auto' }}>
            Choose an enterprise application to open your customized dashboard and workspace.
          </p>
        </div>

        {userApps.length === 0 && !isSuperadmin ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px dashed var(--accent-red)',
            padding: '30px',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginTop: '20px'
          }}>
            <Lock size={32} style={{ color: 'var(--accent-red)', marginBottom: '12px' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Applications Provisioned</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Your tenant workspace currently does not have access to any modules. Please contact your Superadmin to allocate applications.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginTop: '10px'
          }}>
            {sortedApps.map(app => {
              const hasAccess = isSuperadmin || userApps.includes(app.id);
              return (
                <div 
                  key={app.id}
                  onClick={() => hasAccess && handleLaunchApp(app)}
                  style={{
                    background: hasAccess ? 'var(--bg-card)' : 'rgba(20, 27, 45, 0.3)',
                    border: hasAccess ? `1px solid var(--border)` : '1px dashed rgba(255,255,255,0.05)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '20px',
                    cursor: hasAccess ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    opacity: hasAccess ? 1 : 0.45,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: hasAccess ? 'var(--shadow-sm)' : 'none',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    if (hasAccess) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = app.color;
                      e.currentTarget.style.boxShadow = `0 10px 20px -10px ${app.color}40`;
                    }
                  }}
                  onMouseLeave={e => {
                    if (hasAccess) {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }
                  }}
                >
                  <div>
                    {/* App Header / Icon */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-md)',
                        background: app.bg,
                        color: app.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${app.border}`
                      }}>
                        <app.icon size={22} />
                      </div>
                      
                      {hasAccess ? (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: 'var(--accent-green)',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 600
                        }}>
                          Provisioned
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: 'var(--accent-red)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Lock size={10} /> Locked
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', margin: '0 0 6px 0' }}>
                      {app.name}
                    </h3>
                    
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }}>
                      {app.category}
                    </span>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      {app.description}
                    </p>
                  </div>

                  {/* Button */}
                  <div>
                    {hasAccess ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchApp(app);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: app.bg,
                          color: app.color,
                          border: `1px solid ${app.border}`,
                          borderRadius: 'var(--radius-md)',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = app.color;
                          e.currentTarget.style.color = '#000';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = app.bg;
                          e.currentTarget.style.color = app.color;
                        }}
                      >
                        Launch Workspace
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button 
                        disabled
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Lock size={12} /> Locked Module
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default SelectApp;
