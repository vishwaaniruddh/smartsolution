import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { basePath, apiBaseUrl } from './utils/env.js';
import { NotificationProvider } from './components/NotificationContext';
import Dashboard from './features/leads/pages/Dashboard';
import LeadsTable from './features/leads/pages/LeadsTable';
import Reports from './features/leads/pages/Reports';
import Pipeline from './features/leads/pages/Pipeline';
import Contacts from './pages/Contacts';
import SettingsPage from './pages/SettingsPage';
import HelpCenter from './pages/HelpCenter';
import Users from './pages/Users';
import LeadSources from './features/leads/pages/LeadSources';
import Sales from './features/leads/pages/Sales';
import Tenants from './features/superadmin/pages/Tenants';
import TenantReports from './features/superadmin/pages/TenantReports';
import Apps from './features/superadmin/pages/Apps';
import Comparison from './features/superadmin/pages/Comparison';
import GlobalChatPage from './pages/GlobalChatPage';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import SADashboard from './features/leads/pages/SADashboard';
import SAMyLeads from './features/leads/pages/SAMyLeads';
import SAPipeline from './features/leads/pages/SAPipeline';
import SATasks from './features/leads/pages/SATasks';
import HRMSDashboard from './features/hrms/pages/HRMSDashboard';
import HRMSEmployees from './features/hrms/pages/Employees';
import HRMSDepartments from './features/hrms/pages/Departments';
import HRMSAttendance from './features/hrms/pages/Attendance';
import HRMSLeaveManagement from './features/hrms/pages/LeaveManagement';
import HRMSPayroll from './features/hrms/pages/Payroll';
import HRMSHolidays from './features/hrms/pages/Holidays';
import HRMSBulkOperations from './features/hrms/pages/BulkOperations';
import HRMSRecruitment from './features/hrms/pages/Recruitment';
import SelectApp from './pages/SelectApp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider } from './features/leads/context/CRMContext';
import { HRMSProvider } from './features/hrms/context/HRMSContext';
import { Outlet } from 'react-router-dom';
import { InventoryProvider } from './features/inventory/context/InventoryContext';

// Global Fetch Interceptor to attach JWT token
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  const token = localStorage.getItem('crm_token');
  if (token && typeof resource === 'string' && resource.includes(apiBaseUrl)) {
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return originalFetch(resource, config);
};
import InventoryDashboard from './features/inventory/pages/InventoryDashboard';
import InventoryProducts from './features/inventory/pages/Products';
import InventoryWarehouses from './features/inventory/pages/Warehouses';
import InventoryStockLogs from './features/inventory/pages/StockLogs';
import InventorySuppliers from './features/inventory/pages/Suppliers';
import InventoryPurchaseOrders from './features/inventory/pages/PurchaseOrders';
import InventoryCourierTracker from './features/inventory/pages/CourierTracker';
import InventorySalesOrders from './features/inventory/pages/SalesOrders';
import InventoryBulkOperations from './features/inventory/pages/InventoryBulk';
import { AccountingProvider } from './features/accounting/context/AccountingContext';
import AccountingDashboard from './features/accounting/pages/AccountingDashboard';
import ChartOfAccounts from './features/accounting/pages/ChartOfAccounts';
import JournalLedger from './features/accounting/pages/JournalLedger';
import Invoices from './features/accounting/pages/Invoices';
import Bills from './features/accounting/pages/Bills';
import Transactions from './features/accounting/pages/Transactions';
import FinancialStatements from './features/accounting/pages/FinancialStatements';
import { ServiceDeskProvider } from './features/servicedesk/context/ServiceDeskContext';
import ServiceDeskDashboard from './features/servicedesk/pages/ServiceDeskDashboard';
import SDTickets from './features/servicedesk/pages/Tickets';
import SDTicketDetail from './features/servicedesk/pages/TicketDetail';
import SDMyTickets from './features/servicedesk/pages/MyTickets';

const CRMLayout = () => (
  <CRMProvider>
    <Outlet />
  </CRMProvider>
);

const HRMSLayout = () => (
  <HRMSProvider>
    <Outlet />
  </HRMSProvider>
);

const InventoryLayout = () => (
  <InventoryProvider>
    <Outlet />
  </InventoryProvider>
);

const AccountingLayout = () => (
  <AccountingProvider>
    <Outlet />
  </AccountingProvider>
);

const ServiceDeskLayout = () => (
  <ServiceDeskProvider>
    <Outlet />
  </ServiceDeskProvider>
);

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Workspace...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Guard role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'Superadmin') return <Navigate to="/superadmin/tenants" replace />;
    if (user.role === 'Sales Associate') return <Navigate to="/feature/leads/sa/dashboard" replace />;
    return <Navigate to="/feature/leads" replace />;
  }

  // Guard apps
  const path = window.location.pathname;
  const userApps = user.apps || [];
  if (user.role !== 'Superadmin') {
    if (path.includes('/feature/hrms') && !userApps.includes('hrms')) {
      return <Navigate to="/select-app" replace />;
    }
    if (path.includes('/feature/leads') && !userApps.includes('crm')) {
      return <Navigate to="/select-app" replace />;
    }
    if (path.includes('/feature/inventory') && !userApps.includes('inventory')) {
      return <Navigate to="/select-app" replace />;
    }
    if (path.includes('/feature/accounting') && !userApps.includes('accounting')) {
      return <Navigate to="/select-app" replace />;
    }
    if (path.includes('/feature/servicedesk') && !userApps.includes('servicedesk')) {
      return <Navigate to="/select-app" replace />;
    }
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'Superadmin') {
    return <Navigate to="/superadmin/tenants" replace />;
  }
  
  const apps = user.apps || [];
  if (apps.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-primary)', flexDirection: 'column', gap: '16px' }}>
        <h2>No applications provisioned</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please contact your system administrator.</p>
        <button className="modal-btn primary" onClick={() => { localStorage.clear(); window.location.href = basePath + '/login'; }}>Log Out</button>
      </div>
    );
  }

  const activeApp = localStorage.getItem('crm_active_app');
  if (activeApp && apps.includes(activeApp)) {
    if (activeApp === 'hrms') return <Navigate to="/feature/hrms" replace />;
    if (activeApp === 'inventory') return <Navigate to="/feature/inventory" replace />;
    if (activeApp === 'accounting') return <Navigate to="/feature/accounting" replace />;
    if (activeApp === 'servicedesk') return <Navigate to="/feature/servicedesk" replace />;
    if (user.role === 'Sales Associate') return <Navigate to="/feature/leads/sa/dashboard" replace />;
    return <Navigate to="/feature/leads" replace />;
  }

  if (apps.length === 1) {
    localStorage.setItem('crm_active_app', apps[0]);
    if (apps[0] === 'hrms') return <Navigate to="/feature/hrms" replace />;
    if (apps[0] === 'inventory') return <Navigate to="/feature/inventory" replace />;
    if (apps[0] === 'accounting') return <Navigate to="/feature/accounting" replace />;
    if (apps[0] === 'servicedesk') return <Navigate to="/feature/servicedesk" replace />;
    if (user.role === 'Sales Associate') return <Navigate to="/feature/leads/sa/dashboard" replace />;
    return <Navigate to="/feature/leads" replace />;
  }

  return <Navigate to="/select-app" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={basePath}>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/select-app" element={
            <ProtectedRoute>
              <SelectApp />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            {/* Root index redirect to dynamic app landing */}
            <Route index element={<RootRedirect />} />

            {/* Leads Module Routes */}
            <Route path="feature/leads" element={<CRMLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="leads" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <LeadsTable />
                </ProtectedRoute>
              } />
              <Route path="pipeline" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Pipeline />
                </ProtectedRoute>
              } />
              <Route path="sales" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <Sales />
                </ProtectedRoute>
              } />
              <Route path="lead-sources" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <LeadSources />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Reports />
                </ProtectedRoute>
              } />

              {/* Sales Associate Routes */}
              <Route path="sa/dashboard" element={
                <ProtectedRoute allowedRoles={['Sales Associate']}>
                  <SADashboard />
                </ProtectedRoute>
              } />
              <Route path="sa/leads" element={
                <ProtectedRoute allowedRoles={['Sales Associate']}>
                  <SAMyLeads />
                </ProtectedRoute>
              } />
              <Route path="sa/pipeline" element={
                <ProtectedRoute allowedRoles={['Sales Associate']}>
                  <SAPipeline />
                </ProtectedRoute>
              } />
              <Route path="sa/tasks" element={
                <ProtectedRoute allowedRoles={['Sales Associate']}>
                  <SATasks />
                </ProtectedRoute>
              } />
              <Route path="sa/sales" element={
                <ProtectedRoute allowedRoles={['Sales Associate']}>
                  <Sales />
                </ProtectedRoute>
              } />
            </Route>

            {/* HRMS Module Routes */}
            <Route path="feature/hrms" element={<HRMSLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSDashboard />
                </ProtectedRoute>
              } />
              <Route path="employees" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSEmployees />
                </ProtectedRoute>
              } />
              <Route path="departments" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSDepartments />
                </ProtectedRoute>
              } />
              <Route path="attendance" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSAttendance />
                </ProtectedRoute>
              } />
              <Route path="leaves" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSLeaveManagement />
                </ProtectedRoute>
              } />
              <Route path="payroll" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSPayroll />
                </ProtectedRoute>
              } />
              <Route path="holidays" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSHolidays />
                </ProtectedRoute>
              } />
              <Route path="bulk-operations" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <HRMSBulkOperations />
                </ProtectedRoute>
              } />
              <Route path="recruitment" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <HRMSRecruitment />
                </ProtectedRoute>
              } />
            </Route>

            {/* Inventory Module Routes */}
            <Route path="feature/inventory" element={<InventoryLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <InventoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="products" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <InventoryProducts />
                </ProtectedRoute>
              } />
              <Route path="warehouses" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventoryWarehouses />
                </ProtectedRoute>
              } />
              <Route path="logs" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventoryStockLogs />
                </ProtectedRoute>
              } />
              <Route path="suppliers" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventorySuppliers />
                </ProtectedRoute>
              } />
              <Route path="orders" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventoryPurchaseOrders />
                </ProtectedRoute>
              } />
              <Route path="couriers" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <InventoryCourierTracker />
                </ProtectedRoute>
              } />
              <Route path="sales-orders" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <InventorySalesOrders />
                </ProtectedRoute>
              } />
              <Route path="bulk-operations" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventoryBulkOperations />
                </ProtectedRoute>
              } />
            </Route>

            {/* Accounting Module Routes */}
            <Route path="feature/accounting" element={<AccountingLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <AccountingDashboard />
                </ProtectedRoute>
              } />
              <Route path="accounts" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <ChartOfAccounts />
                </ProtectedRoute>
              } />
              <Route path="journals" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <JournalLedger />
                </ProtectedRoute>
              } />
              <Route path="invoices" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Invoices />
                </ProtectedRoute>
              } />
              <Route path="bills" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Bills />
                </ProtectedRoute>
              } />
              <Route path="transactions" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <Transactions />
                </ProtectedRoute>
              } />
              <Route path="suppliers" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <InventoryProvider>
                    <InventorySuppliers />
                  </InventoryProvider>
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <FinancialStatements />
                </ProtectedRoute>
              } />
            </Route>

            {/* Service Desk Module Routes */}
            <Route path="feature/servicedesk" element={<ServiceDeskLayout />}>
              <Route index element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <ServiceDeskDashboard />
                </ProtectedRoute>
              } />
              <Route path="tickets" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                  <SDTickets />
                </ProtectedRoute>
              } />
              <Route path="tickets/:id" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <SDTicketDetail />
                </ProtectedRoute>
              } />
              <Route path="my-tickets" element={
                <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Sales Associate']}>
                  <SDMyTickets />
                </ProtectedRoute>
              } />
            </Route>

            {/* Core / Shell Routes */}
            <Route path="contacts" element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <Contacts />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Superadmin']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="help" element={<HelpCenter />} />
            
            {/* Superadmin Routes */}
            <Route path="superadmin/tenants" element={
              <ProtectedRoute allowedRoles={['Superadmin']}>
                <Tenants />
              </ProtectedRoute>
            } />
            <Route path="superadmin/analytics" element={
              <ProtectedRoute allowedRoles={['Superadmin']}>
                <TenantReports />
              </ProtectedRoute>
            } />
            <Route path="superadmin/apps" element={
              <ProtectedRoute allowedRoles={['Superadmin']}>
                <Apps />
              </ProtectedRoute>
            } />
            <Route path="superadmin/comparison" element={
              <ProtectedRoute allowedRoles={['Superadmin']}>
                <Comparison />
              </ProtectedRoute>
            } />
            
            <Route path="chat" element={
              <ProtectedRoute>
                <GlobalChatPage />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
