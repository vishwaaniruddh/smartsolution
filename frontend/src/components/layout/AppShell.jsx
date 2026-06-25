import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { basePath, apiBaseUrl } from '../../utils/env.js';
import { initSocket, disconnectSocket } from '../../utils/socket.js';
import CallWidget from '../chat/CallWidget.jsx';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, GitBranch, UserCircle, BarChart3,
  Settings, UserCheck, CheckSquare, IndianRupee, Building, LogOut, Menu, ChevronDown, ChevronRight, Shield, LayoutGrid,
  Clock, CalendarDays, Wallet, CalendarHeart, Warehouse, Truck, Package, ClipboardList, History, Upload, UserPlus, ShoppingBag,
  Receipt, Headphones, Ticket, MessageSquare, MessageCircle, Scale
} from 'lucide-react';
import { useSettings } from '../SettingsContext';
import ImpersonationBanner from './ImpersonationBanner';

const adminNavItems = [
  { isHeader: true, label: 'Administration' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin Settings',
    subItems: [
      { to: '/feature/leads/lead-sources', icon: GitBranch, label: 'Lead Sources' },
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { isHeader: true, label: 'Overview' },
  { to: '/feature/leads', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Sales & Relations' },
  { to: '/feature/leads/leads', icon: Users, label: 'Leads' },
  { to: '/feature/leads/pipeline', icon: GitBranch, label: 'Sales Pipeline' },
  { to: '/feature/leads/sales', icon: IndianRupee, label: 'Sales' },
  { to: '/contacts', icon: UserCircle, label: 'Contacts' },
  { to: '/feature/leads/reports', icon: BarChart3, label: 'Reports' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const saNavItems = [
  { isHeader: true, label: 'Overview' },
  { to: '/feature/leads/sa/dashboard', icon: LayoutDashboard, label: 'SA Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'My Workspace' },
  { to: '/feature/leads/sa/leads', icon: Users, label: 'My Leads' },
  { to: '/feature/leads/sa/pipeline', icon: GitBranch, label: 'My Pipeline' },
  { to: '/feature/leads/sa/sales', icon: IndianRupee, label: 'My Sales' },
  { to: '/feature/leads/sa/tasks', icon: CheckSquare, label: 'My Tasks' },
];

const superadminNavItems = [
  { isHeader: true, label: 'Tenant Administration' },
  { to: '/superadmin/tenants', icon: Building, label: 'Tenants' },
  { to: '/superadmin/analytics', icon: BarChart3, label: 'Tenant Reports' },
  { to: '/superadmin/comparison', icon: Scale, label: 'CRM Comparison' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/superadmin/contacts', icon: Users, label: 'Contacts' },
  { to: '/superadmin/apps', icon: LayoutGrid, label: 'Apps' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

const hrmsNavItems = [
  { isHeader: true, label: 'Administration' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin Settings',
    subItems: [
      { to: '/feature/hrms/departments', icon: Building, label: 'Departments' },
      { to: '/feature/hrms/holidays', icon: CalendarHeart, label: 'Holidays' },
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { isHeader: true, label: 'Overview' },
  { to: '/feature/hrms', icon: LayoutDashboard, label: 'HR Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Personnel & Payroll' },
  { to: '/feature/hrms/employees', icon: Users, label: 'Employees' },
  { to: '/feature/hrms/attendance', icon: Clock, label: 'Attendance' },
  { to: '/feature/hrms/leaves', icon: CalendarDays, label: 'Leave Management' },
  { to: '/feature/hrms/payroll', icon: Wallet, label: 'Payroll' },
  { isHeader: true, label: 'Recruitment' },
  { to: '/feature/hrms/recruitment', icon: UserPlus, label: 'Recruitment' },
  { to: '/feature/hrms/bulk-operations', icon: Upload, label: 'Bulk Operations' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const hrmsEmployeeNavItems = [
  { isHeader: true, label: 'My HR Workspace' },
  { to: '/feature/hrms', icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Self-Service' },
  { to: '/feature/hrms/attendance', icon: Clock, label: 'My Attendance' },
  { to: '/feature/hrms/leaves', icon: CalendarDays, label: 'My Leaves' },
  { to: '/feature/hrms/payroll', icon: Wallet, label: 'My Payslips' },
  { to: '/feature/hrms/holidays', icon: CalendarHeart, label: 'Holidays' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const inventoryNavItems = [
  { isHeader: true, label: 'Administration' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin Settings',
    subItems: [
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { isHeader: true, label: 'Overview' },
  { to: '/feature/inventory', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Product & Stock' },
  { to: '/feature/inventory/products', icon: Package, label: 'Product Catalog' },
  { to: '/feature/inventory/warehouses', icon: Warehouse, label: 'Warehouses' },
  { to: '/feature/inventory/logs', icon: History, label: 'Stock Logs' },
  { isHeader: true, label: 'Orders & Partners' },
  { to: '/feature/inventory/orders', icon: ClipboardList, label: 'Purchase Orders' },
  { to: '/feature/inventory/sales-orders', icon: ShoppingBag, label: 'Sales Orders' },
  { to: '/feature/inventory/suppliers', icon: Users, label: 'Suppliers' },
  { isHeader: true, label: 'Logistics & Ops' },
  { to: '/feature/inventory/couriers', icon: Truck, label: 'Courier Tracker' },
  { to: '/feature/inventory/bulk-operations', icon: Upload, label: 'Bulk Operations' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const accountingNavItems = [
  { isHeader: true, label: 'Administration' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin Settings',
    subItems: [
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { isHeader: true, label: 'Overview' },
  { to: '/feature/accounting', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Transactions & Ledger' },
  { to: '/feature/accounting/accounts', icon: Building, label: 'Chart of Accounts' },
  { to: '/feature/accounting/journals', icon: ClipboardList, label: 'Journal Ledger' },
  { to: '/feature/accounting/transactions', icon: Wallet, label: 'Bank Transactions' },
  { isHeader: true, label: 'Sales & Purchases' },
  { to: '/feature/accounting/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/feature/accounting/bills', icon: ClipboardList, label: 'Supplier Bills' },
  { to: '/feature/accounting/suppliers', icon: Users, label: 'Suppliers' },
  { isHeader: true, label: 'Financial Reports' },
  { to: '/feature/accounting/reports', icon: BarChart3, label: 'Financial Statements' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' }
];

const servicedeskNavItems = [
  { isHeader: true, label: 'Administration' },
  {
    isDropdown: true,
    icon: Shield,
    label: 'Admin Settings',
    subItems: [
      { to: '/users', icon: UserCheck, label: 'Users' }
    ]
  },
  { isHeader: true, label: 'Overview' },
  { to: '/feature/servicedesk', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { isHeader: true, label: 'Tickets' },
  { to: '/feature/servicedesk/tickets', icon: Ticket, label: 'All Tickets' },
  { to: '/feature/servicedesk/my-tickets', icon: MessageSquare, label: 'My Tickets' },
  { isHeader: true, label: 'System' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];


const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user, logout } = useAuth();

  const [callState, setCallState] = useState('idle');
  const [callData, setCallData] = useState(null);
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (user && token) {
      const activeSocket = initSocket(token);
      setSocketInstance(activeSocket);

      if (activeSocket) {
        activeSocket.on('call-made', (data) => {
          setCallState('ringing');
          setCallData({
            peerId: data.from,
            peerName: data.callerName || `User #${data.from}`,
            isVideo: data.isVideo,
            isIncoming: true,
            offer: data.offer
          });
        });
      }
    }

    return () => {
      disconnectSocket();
      setSocketInstance(null);
    };
  }, [user]);

  if (!user) return null;
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
    
    fetch(`${apiBaseUrl}/auth`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: user.id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Update local session via useAuth fetch on reload or just locally
          user.is_first_login = 0;
          // localStorage.setItem('crm_user', JSON.stringify(user));
        }
      })
      .catch(err => console.warn('Error updating first login flag:', err))
      .finally(() => {
        setShowWelcomeModal(false);
      });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };


  const activeApp = location.pathname.startsWith('/feature/hrms')
    ? 'hrms'
    : (location.pathname.startsWith('/feature/inventory')
      ? 'inventory'
      : (location.pathname.startsWith('/feature/accounting')
        ? 'accounting'
        : (location.pathname.startsWith('/feature/servicedesk')
          ? 'servicedesk'
          : (location.pathname.startsWith('/feature/leads') ? 'crm' : (localStorage.getItem('crm_active_app') || 'crm')))));

  const isHRMSAdmin = ['Admin', 'Manager', 'Superadmin'].includes(activeRole);

  const currentNavItems = activeRole === 'Superadmin'
    ? superadminNavItems
    : (activeApp === 'hrms'
      ? (isHRMSAdmin ? hrmsNavItems : hrmsEmployeeNavItems)
      : (activeApp === 'inventory'
        ? inventoryNavItems
        : (activeApp === 'accounting'
          ? accountingNavItems
          : (activeApp === 'servicedesk'
            ? servicedeskNavItems
            : (activeRole === 'Sales Associate' ? saNavItems : adminNavItems)))));

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/feature/leads') return 'CRM Dashboard Overview';
    if (path === '/feature/leads/leads') return 'Leads Management';
    if (path === '/feature/leads/pipeline') return 'Sales Pipeline Management';
    if (path === '/feature/leads/sales') return 'Sales Performance & Revenue';
    
    // Inventory Routes
    if (path === '/feature/inventory') return 'Inventory Dashboard';
    if (path === '/feature/inventory/products') return 'Product Catalog & Tag Directory';
    if (path === '/feature/inventory/warehouses') return 'Multi-Warehouse Inventory Stock';
    if (path === '/feature/inventory/orders') return 'Purchase Order Registry';
    if (path === '/feature/inventory/sales-orders') return 'Sales Order Dispatch Hub';
    if (path === '/feature/inventory/logs') return 'Stock Movement Logs';
    if (path === '/feature/inventory/suppliers' || path === '/feature/accounting/suppliers') return 'Supplier Directory';
    if (path === '/feature/inventory/couriers') return 'Courier Shipments Tracking';
    if (path === '/feature/inventory/bulk-operations') return 'Inventory Bulk Operations';

    // Accounting Routes
    if (path === '/feature/accounting') return 'Accounting Dashboard Overview';
    if (path === '/feature/accounting/accounts') return 'Chart of Accounts';
    if (path === '/feature/accounting/journals') return 'General Ledger Journal Entries';
    if (path === '/feature/accounting/invoices') return 'Customer Billing & Invoices';
    if (path === '/feature/accounting/bills') return 'Supplier Bills Directory';
    if (path === '/feature/accounting/transactions') return 'Bank & Cash Transactions Ledger';
    if (path === '/feature/accounting/reports') return 'Financial Statements';
    if (path === '/contacts') return 'Contacts';
    if (path === '/users') return 'User Management';
    if (path === '/chat') return 'Internal Chat';
    if (path === '/feature/leads/reports') return 'Reports';
    if (path === '/settings') return 'Settings';
    if (path === '/feature/leads/lead-sources') return 'Lead Sources Management';

    // Service Desk Routes
    if (path === '/feature/servicedesk') return 'Service Desk Dashboard';
    if (path === '/feature/servicedesk/tickets') return 'All Support Tickets';
    if (path === '/feature/servicedesk/my-tickets') return 'My Tickets';
    if (path.startsWith('/feature/servicedesk/tickets/')) return 'Ticket Detail';
    
    // Superadmin Routes
    if (path === '/superadmin/tenants') return 'Superadmin Tenant Management';
    if (path === '/superadmin/analytics') return 'Tenant Reports & Analytics';
    if (path === '/superadmin/comparison') return 'Global CRM Market Comparison';
    if (path === '/superadmin/apps') return 'Enterprise App Directory';

    // HRMS Routes
    if (path === '/feature/hrms') return 'HR Dashboard Overview';
    if (path === '/feature/hrms/employees') return 'Employee Directory';
    if (path === '/feature/hrms/departments') return 'Departments & Designations';
    if (path === '/feature/hrms/attendance') return 'Attendance & Timekeeping';
    if (path === '/feature/hrms/leaves') return 'Leave Management';
    if (path === '/feature/hrms/payroll') return 'Payroll & Compensation';
    if (path === '/feature/hrms/holidays') return 'Holiday Calendar';
    if (path === '/feature/hrms/recruitment') return 'Recruitment & Candidate Tracking (ATS)';
    if (path === '/feature/hrms/bulk-operations') return 'Bulk Import Operations';

    
    // SA Routes
    if (path === '/feature/leads/sa/dashboard') return 'Sales Associate Dashboard';
    if (path === '/feature/leads/sa/leads') return 'My Assigned Leads';
    if (path === '/feature/leads/sa/pipeline') return 'My Sales Pipeline';
    if (path === '/feature/leads/sa/sales') return 'My Converted Sales';
    if (path === '/feature/leads/sa/tasks') return 'My Tasks & Follow-ups';
    
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
        <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <img src={settings?.logo_url ? `${apiBaseUrl}/${settings.logo_url.replace(/^\/?api\//, '')}` : `${basePath}/sarlogoremovebg.png`} alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span className="sidebar-logo-text" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {settings?.software_name || 'SAR Workforce'}
            </span>
          </div>
        </div>



        <nav className="sidebar-nav">
          {currentNavItems.map(item => {
            if (item.isHeader) {
              return (
                <div key={item.label} className="sidebar-nav-header">
                  {item.label}
                </div>
              );
            }

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
                end={item.to === '/feature/leads' || item.to === '/feature/leads/sa/dashboard'}
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
        <ImpersonationBanner />
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* App Switcher Button */}
            {user && user.role !== 'Superadmin' && user.apps && user.apps.length > 1 && (
              <button 
                onClick={() => navigate('/select-app')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 14px',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <LayoutGrid size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>{activeApp === 'hrms' ? 'HRMS Module' : (activeApp === 'inventory' ? 'Inventory Module' : (activeApp === 'accounting' ? 'Accounting Module' : 'CRM Module'))}</span>
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>              {/* User Profile Initials Button */}
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
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          <Outlet context={{ activeRole, activeAgent, setCallState, setCallData, socket: socketInstance }} />
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
      {/* Chat Widget Removed */}

      <CallWidget 
        socket={socketInstance}
        callState={callState}
        setCallState={setCallState}
        callData={callData}
        setCallData={setCallData}
      />
    </div>
  );
};

export default AppShell;
