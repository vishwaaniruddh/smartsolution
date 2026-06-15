import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { basePath } from '../../utils/env.js';
import {
  LayoutDashboard, Users, GitBranch, UserCircle, BarChart3,
  Settings, PanelLeftClose, Search, UserCheck, CheckSquare, IndianRupee, Building, LogOut, Menu, ChevronDown, ChevronRight, Shield, Mail, LayoutGrid
} from 'lucide-react';

const adminNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin',
    subItems: [
      { to: '/lead-sources', icon: GitBranch, label: 'Lead Sources' },
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/pipeline', icon: GitBranch, label: 'Sales Pipeline' },
  { to: '/sales', icon: IndianRupee, label: 'Sales' },
  { to: '/contacts', icon: UserCircle, label: 'Contacts' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const saNavItems = [
  { to: '/sa/dashboard', icon: LayoutDashboard, label: 'SA Dashboard' },
  { to: '/sa/leads', icon: Users, label: 'My Leads' },
  { to: '/sa/pipeline', icon: GitBranch, label: 'My Pipeline' },
  { to: '/sa/sales', icon: IndianRupee, label: 'My Sales' },
  { to: '/sa/tasks', icon: CheckSquare, label: 'My Tasks' },
];

const superadminNavItems = [
  { to: '/superadmin/tenants', icon: Building, label: 'Tenants' },
  { to: '/superadmin/analytics', icon: BarChart3, label: 'Tenant Reports' },
  { to: '/superadmin/apps', icon: LayoutGrid, label: 'Apps' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];



const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userStr = localStorage.getItem('crm_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const activeRole = user ? user.role : 'Admin/Manager';
  const activeAgent = user ? `${user.first_name} ${user.last_name}` : 'Emily Davis';

  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return user && (user.is_first_login === 1 || user.is_first_login === '1');
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (label) => {
    setOpenDropdowns(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleCloseWelcomeModal = () => {
    if (!user) return;
    
    fetch('http://localhost/lead/api/auth.php', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: user.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Update local session
          user.is_first_login = 0;
          localStorage.setItem('crm_user', JSON.stringify(user));
        }
      })
      .catch(err => console.warn('Error updating first login flag:', err))
      .finally(() => {
        setShowWelcomeModal(false);
      });
  };

  const isImpersonating = !!localStorage.getItem('crm_superadmin_user');

  const handleStopImpersonation = () => {
    const superadminUserStr = localStorage.getItem('crm_superadmin_user');
    if (!superadminUserStr) return;

    // Restore Superadmin session
    localStorage.setItem('crm_user', superadminUserStr);
    localStorage.removeItem('crm_superadmin_user');

    const superadminUser = JSON.parse(superadminUserStr);
    localStorage.setItem('crm_tenant_id', superadminUser.tenant_id ? superadminUser.tenant_id.toString() : '1');
    localStorage.setItem('crm_active_role', superadminUser.role);

    // Redirect back to Superadmin dashboard and reload to reset state
    const targetUrl = window.location.origin + basePath + '/superadmin/tenants';
    window.location.href = targetUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant_id');
    localStorage.removeItem('crm_active_role');
    localStorage.removeItem('crm_active_agent');
    localStorage.removeItem('crm_superadmin_user');
    navigate('/login');
  };


  const currentNavItems = activeRole === 'Sales Associate'
    ? saNavItems
    : (activeRole === 'Superadmin' ? superadminNavItems : adminNavItems);

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'CRM Dashboard Overview';
    if (path === '/leads') return 'Leads Management';
    if (path === '/pipeline') return 'Sales Pipeline Management';
    if (path === '/sales') return 'Sales Performance & Revenue';
    if (path === '/contacts') return 'Contacts';
    if (path === '/users') return 'User Management';
    if (path === '/reports') return 'Reports';
    if (path === '/settings') return 'Settings';
    if (path === '/lead-sources') return 'Lead Sources Management';
    
    // Superadmin Routes
    if (path === '/superadmin/tenants') return 'Superadmin Tenant Management';
    if (path === '/superadmin/analytics') return 'Tenant Reports & Analytics';
    if (path === '/superadmin/apps') return 'Enterprise App Directory';

    
    // SA Routes
    if (path === '/sa/dashboard') return 'Sales Associate Dashboard';
    if (path === '/sa/leads') return 'My Assigned Leads';
    if (path === '/sa/pipeline') return 'My Sales Pipeline';
    if (path === '/sa/sales') return 'My Converted Sales';
    if (path === '/sa/tasks') return 'My Tasks & Follow-ups';
    
    return 'Help Center';
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const first = user.first_name ? user.first_name.charAt(0) : '';
    const last = user.last_name ? user.last_name.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="app-layout">
      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay open" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px 20px' }}>
          <img src={`${basePath}/sarlogoremovebg.png`} alt="SAR Workforce Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span className="sidebar-logo-text" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            SAR Workforce
          </span>
        </div>

        <nav className="sidebar-nav">
          {currentNavItems.map(item => {
            if (item.isDropdown) {
              const isOpen = openDropdowns[item.label];
              return (
                <div key={item.label} className="sidebar-dropdown">
                  <button 
                    className={`sidebar-link ${isOpen ? 'dropdown-open' : ''}`} 
                    onClick={() => toggleDropdown(item.label)}
                    style={{ width: '100%', justifyContent: 'space-between', border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <item.icon />
                      {item.label}
                    </div>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {isOpen && (
                    <div className="sidebar-sub-nav" style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {item.subItems.map(subItem => (
                        <NavLink
                          key={subItem.to}
                          to={subItem.to}
                          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                        >
                          <subItem.icon size={16} />
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/sa/dashboard'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-collapse">
          <button onClick={handleLogout} style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {isImpersonating && (
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
            zIndex: 10,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0
          }}>
            <span>⚠️ You are currently impersonating <strong>{user?.tenant_name || 'Tenant Admin'}</strong>.</span>
            <button 
              onClick={handleStopImpersonation}
              style={{
                background: 'white',
                color: '#b45309',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Return to Superadmin
            </button>
          </div>
        )}
        {/* Top Header */}

        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={22} />
            </button>
            <div className="header-title">
              {getHeaderTitle()}
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            {/* User Profile Initials Button */}
            {user && (
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '50%', 
                  background: 'var(--gradient-blue)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '14px', 
                  fontWeight: 700,
                  border: '2px solid var(--border-light)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {getUserInitials()}
              </button>
            )}

            {/* Click-away overlay */}
            {isProfileDropdownOpen && (
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                onClick={() => setIsProfileDropdownOpen(false)} 
              />
            )}

            {/* Profile Dropdown */}
            {isProfileDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: '0',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                minWidth: '220px',
                zIndex: 100,
                padding: '8px 0',
                display: 'flex',
                flexDirection: 'column',
                animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{user.first_name} {user.last_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{user.role}</div>
                </div>
                <button 
                  style={{ padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text-primary)', textAlign: 'left', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                  onClick={() => { setIsProfileDropdownOpen(false); navigate('/settings'); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <UserCircle size={16} /> Profile Settings
                </button>
                <button 
                  style={{ padding: '10px 16px', background: 'none', border: 'none', color: 'var(--accent-red)', textAlign: 'left', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s' }}
                  onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <LogOut size={16} /> Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet context={{ activeRole, activeAgent }} />
        </div>
      </div>

      {/* FIRST TIME WELCOME MODAL */}
      {showWelcomeModal && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-container" style={{ maxWidth: '500px', padding: '36px', textAlign: 'center', background: 'rgba(20, 27, 45, 0.95)', border: '1px solid var(--border-light)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'rgba(34, 211, 238, 0.1)',
              color: 'var(--accent-cyan)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid var(--accent-cyan)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '12px' }}>
              Welcome to Your CRM Dashboard!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Hello <strong>{user?.first_name}</strong>, your organization workspace for <strong>{user?.tenant_name}</strong> is ready. 
              You can now configure your pipeline, invite managers and sales associates, and start managing your customer leads.
            </p>
            
            <div style={{ textAlign: 'left', background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>Getting Started Checklist:</h4>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                <li>Go to the <strong>Users</strong> tab to create accounts for your team.</li>
                <li>Go to the <strong>Leads</strong> tab to add new customer leads.</li>
                <li>Assign leads to your agents to start logging activities.</li>
              </ul>
            </div>
            
            <button
              onClick={handleCloseWelcomeModal}
              style={{
                padding: '12px 24px',
                background: 'var(--gradient-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 211, 238, 0.3)',
                transition: 'all 0.2s',
                width: '100%'
              }}
            >
              Let's Get Started!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
