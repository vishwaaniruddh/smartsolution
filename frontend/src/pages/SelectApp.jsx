import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Sparkles, Users, Wallet, Package, LogOut, Lock, ShieldCheck, ArrowRight, Headphones } from 'lucide-react';
import { basePath, apiBaseUrl } from '../utils/env.js';
import { useToast } from '../components/NotificationContext';
import { useSettings } from '../components/SettingsContext';

const appVisuals = {
  'crm': {
    icon: Sparkles,
    color: '#38bdf8', // cyan
    bg: 'rgba(56, 189, 248, 0.1)',
    border: 'rgba(56, 189, 248, 0.25)',
    launchPath: '/feature/leads'
  },
  'hrms': {
    icon: Users,
    color: '#60a5fa', // blue
    bg: 'rgba(96, 165, 250, 0.1)',
    border: 'rgba(96, 165, 250, 0.25)',
    launchPath: '/feature/hrms'
  },
  'accounting': {
    icon: Wallet,
    color: '#c084fc', // purple
    bg: 'rgba(192, 132, 252, 0.1)',
    border: 'rgba(192, 132, 252, 0.25)',
    launchPath: '/feature/accounting'
  },
  'inventory': {
    icon: Package,
    color: '#fb923c', // orange
    bg: 'rgba(251, 146, 60, 0.1)',
    border: 'rgba(251, 146, 60, 0.25)',
    launchPath: '/feature/inventory'
  },
  'servicedesk': {
    icon: Headphones,
    color: '#a78bfa', // violet
    bg: 'rgba(167, 139, 250, 0.1)',
    border: 'rgba(167, 139, 250, 0.25)',
    launchPath: '/feature/servicedesk'
  }
};

const SelectApp = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();

  const userStr = localStorage.getItem('crm_user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const [dbApps, setDbApps] = useState([]);
  const [launchingApp, setLaunchingApp] = useState(null);

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
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.25)',
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
    setLaunchingApp(app);
    
    setTimeout(() => {
      if (app.id === 'crm' && user.role === 'Sales Associate') {
        localStorage.setItem('crm_active_agent', `${user.first_name} ${user.last_name}`);
        navigate('/feature/leads/sa/dashboard');
      } else {
        navigate(app.launchPath);
      }
    }, 1500);
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
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
          
          :root {
            --bg-dark: #020617;
            --glass-bg: rgba(15, 23, 42, 0.6);
            --glass-border: rgba(255, 255, 255, 0.08);
            --glass-hover: rgba(255, 255, 255, 0.12);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent: #6366f1;
            --accent-hover: #818cf8;
          }

          .select-app-wrapper {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Outfit', 'Inter', sans-serif;
            background: var(--bg-dark);
            position: relative;
            overflow-x: hidden;
            overflow-y: auto;
            padding: 40px 24px;
            box-sizing: border-box;
            gap: 24px;
          }

          /* --- Background Animations --- */
          .mesh-bg {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
          }
          .mesh-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(90px);
            opacity: 0.4;
            animation: float 20s infinite alternate ease-in-out;
          }
          .orb-1 {
            top: -10%; left: -10%; width: 50vw; height: 50vw;
            background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%);
          }
          .orb-2 {
            bottom: -20%; right: -10%; width: 60vw; height: 60vw;
            background: radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 60%);
            animation-duration: 25s;
            animation-direction: alternate-reverse;
          }
          .orb-3 {
            top: 30%; left: 40%; width: 40vw; height: 40vw;
            background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%);
            animation-duration: 22s;
          }
          .grid-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 40px 40px;
            z-index: 1;
            pointer-events: none;
          }

          /* --- Header Bar --- */
          .header-bar {
            width: 100%;
            max-width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 2;
            animation: fadeInDown 0.5s ease-out;
          }
          .header-brand {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .header-logo {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--glass-border);
            padding: 6px;
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .header-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .header-titles h1 {
            font-size: 22px;
            font-weight: 800;
            color: var(--text-primary);
            margin: 0 0 4px 0;
            letter-spacing: -0.02em;
          }
          .header-titles span {
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 500;
          }
          .header-titles strong {
            color: #38bdf8;
            font-weight: 600;
          }
          .btn-logout {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 10px 18px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
          }
          .btn-logout:hover {
            background: rgba(239, 68, 68, 0.2);
            transform: translateY(-2px);
          }

          /* --- Main Glass Card --- */
          .glass-main {
            width: 100%;
            max-width: 100%;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 48px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            z-index: 2;
            animation: fadeInUp 0.5s ease-out 0.1s both;
            box-sizing: border-box;
          }

          .welcome-section {
            margin-bottom: 40px;
          }
          .welcome-section h2 {
            font-size: 32px;
            font-weight: 800;
            color: var(--text-primary);
            margin: 0 0 12px 0;
            letter-spacing: -0.02em;
          }
          .welcome-section p {
            font-size: 16px;
            color: var(--text-secondary);
            margin: 0;
            max-width: 600px;
            line-height: 1.6;
          }

          /* --- App Grid --- */
          .app-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
          }

          .app-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            cursor: pointer;
          }
          .app-card.locked {
            cursor: not-allowed;
            opacity: 0.6;
            background: rgba(0,0,0,0.2);
            border: 1px dashed rgba(255,255,255,0.1);
          }
          .app-card:not(.locked):hover {
            transform: translateY(-4px);
            background: rgba(255,255,255,0.04);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
          }
          
          .app-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .app-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .status-badge {
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 12px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .status-badge.provisioned {
            background: rgba(16, 185, 129, 0.1);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.2);
          }
          .status-badge.locked {
            background: rgba(239, 68, 68, 0.1);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.2);
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .app-info h3 {
            font-size: 18px;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 6px 0;
          }
          .app-info .category {
            font-size: 12px;
            color: var(--accent);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: block;
            margin-bottom: 12px;
          }
          .app-info p {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
          }

          .app-btn {
            width: 100%;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }
          .app-btn.launch {
            color: #020617;
            border: none;
            cursor: pointer;
          }
          .app-btn.locked {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-secondary);
            border: 1px solid rgba(255, 255, 255, 0.05);
            cursor: not-allowed;
          }

          /* --- Empty State --- */
          .empty-state {
            background: rgba(239, 68, 68, 0.05);
            border: 1px dashed rgba(239, 68, 68, 0.3);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
          }
          .empty-state h3 {
            color: var(--text-primary);
            font-size: 18px;
            margin: 16px 0 8px 0;
          }
          .empty-state p {
            color: var(--text-secondary);
            font-size: 14px;
            margin: 0;
          }

          /* --- Loader Styles --- */
          .loader-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: var(--bg-dark);
            position: relative;
            animation: fadeIn 0.4s ease-out;
            overflow: hidden;
            font-family: 'Outfit', 'Inter', sans-serif;
            z-index: 100;
          }
          .loader-content {
            position: relative;
            width: 120px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
          }
          .pulse-ring {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
          .logo-circle {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
            border: 1px solid var(--glass-border);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1;
            box-shadow: 0 0 40px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
          }
          .logo-circle img {
            width: 50px;
            height: 50px;
            object-fit: contain;
            filter: drop-shadow(0 0 10px rgba(255,255,255,0.2));
          }
          .loader-text {
            margin-top: 32px;
            text-align: center;
            animation: fadeInUp 0.4s ease-out 0.2s both;
            z-index: 1;
          }
          .loader-text h2 {
            font-size: 26px;
            font-weight: 800;
            color: var(--text-primary);
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
          }
          .loader-text p {
            margin: 0;
            font-size: 15px;
            font-weight: 500;
          }

          /* --- Keyframes --- */
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes float {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 30px); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            80% { transform: scale(1.5); opacity: 0; }
            100% { transform: scale(1.5); opacity: 0; }
          }

          @media (max-width: 768px) {
            .select-app-wrapper {
              padding: 20px 16px;
            }
            .header-bar {
              flex-direction: column;
              align-items: flex-start;
              gap: 16px;
            }
            .btn-logout {
              width: 100%;
              justify-content: center;
            }
            .glass-main {
              padding: 32px 20px;
              border-radius: 24px;
            }
            .welcome-section h2 {
              font-size: 26px;
            }
          }
        `}
      </style>

      {launchingApp ? (
        <div className="loader-container">
          <div className="mesh-bg">
            <div className="mesh-orb orb-1"></div>
            <div className="mesh-orb orb-2"></div>
            <div className="mesh-orb orb-3"></div>
          </div>
          <div className="grid-overlay"></div>
          
          <div className="loader-content">
            <div className="pulse-ring" style={{ background: launchingApp.color }}></div>
            <div className="logo-circle">
               <img src={settings?.logo_url ? `${apiBaseUrl}/${settings.logo_url.replace(/^\/?api\//, '')}` : `${basePath}/sarlogoremovebg.png`} alt="Logo" />
            </div>
          </div>
          <div className="loader-text">
            <h2>{settings?.software_name || 'Loading Workspace...'}</h2>
            <p style={{ color: launchingApp.color }}>Launching {launchingApp.name}...</p>
          </div>
        </div>
      ) : (
        <div className="select-app-wrapper">
          {/* Animated Mesh Background */}
          <div className="mesh-bg">
            <div className="mesh-orb orb-1"></div>
            <div className="mesh-orb orb-2"></div>
            <div className="mesh-orb orb-3"></div>
          </div>

          {/* Grid Overlay */}
          <div className="grid-overlay"></div>

          {/* Header Bar */}
          <div className="header-bar">
            <div className="header-brand">
              <div className="header-logo">
                <img src={settings?.logo_url ? `${apiBaseUrl}/${settings.logo_url.replace(/^\/?api\//, '')}` : `${basePath}/sarlogoremovebg.png`} alt="Logo" />
              </div>
              <div className="header-titles">
                <h1>{settings?.software_name || 'Dhurandhar Setu'}</h1>
                <span>
                  Tenant Workspace: <strong>{user.tenant_name || 'Superadmin Console'}</strong>
                </span>
              </div>
            </div>

            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>

          {/* Main Glass Card */}
          <div className="glass-main">
            <div className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: '1 1 300px' }}>
                <h2>Welcome back, {user.first_name}!</h2>
                <p>Choose an enterprise application to open your customized dashboard and workspace.</p>
              </div>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)', 
                padding: '12px 20px', 
                borderRadius: '12px', 
                border: '1px solid rgba(255, 255, 255, 0.05)',
                textAlign: 'right',
                minWidth: '200px'
              }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.first_name} {user.last_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '4px', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {user.role}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {user.email}
                </div>
              </div>
            </div>

            {userApps.length === 0 && !isSuperadmin ? (
              <div className="empty-state">
                <ShieldCheck size={40} style={{ color: '#ef4444', margin: '0 auto' }} />
                <h3>No Applications Provisioned</h3>
                <p>Your tenant workspace currently does not have access to any modules. Please contact your Superadmin to allocate applications.</p>
              </div>
            ) : (
              <div className="app-grid">
                {sortedApps.map(app => {
                  const hasAccess = isSuperadmin || userApps.includes(app.id);
                  return (
                    <div 
                      key={app.id}
                      onClick={() => hasAccess && handleLaunchApp(app)}
                      className={`app-card ${!hasAccess ? 'locked' : ''}`}
                      style={hasAccess ? { '--hover-color': app.color } : {}}
                      onMouseEnter={e => {
                        if (hasAccess) {
                          e.currentTarget.style.borderColor = app.color;
                        }
                      }}
                      onMouseLeave={e => {
                        if (hasAccess) {
                          e.currentTarget.style.borderColor = 'var(--glass-border)';
                        }
                      }}
                    >
                      <div className="app-header">
                        <div className="app-icon" style={{ background: app.bg, border: `1px solid ${app.border}`, color: app.color }}>
                          <app.icon size={22} />
                        </div>
                        {hasAccess ? (
                          <span className="status-badge provisioned">Provisioned</span>
                        ) : (
                          <span className="status-badge locked"><Lock size={12} /> Locked</span>
                        )}
                      </div>

                      <div className="app-info" style={{ flexGrow: 1 }}>
                        <h3>{app.name}</h3>
                        <span className="category" style={{ color: app.color }}>{app.category}</span>
                        <p>{app.description}</p>
                      </div>

                      {hasAccess ? (
                        <button 
                          className="app-btn launch"
                          style={{ background: app.color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLaunchApp(app);
                          }}
                        >
                          Launch Workspace <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button className="app-btn locked" disabled>
                          <Lock size={14} /> Locked Module
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SelectApp;
