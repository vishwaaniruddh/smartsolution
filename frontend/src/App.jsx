import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { basePath } from './utils/env.js';
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
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import SADashboard from './features/leads/pages/SADashboard';
import SAMyLeads from './features/leads/pages/SAMyLeads';
import SAPipeline from './features/leads/pages/SAPipeline';
import SATasks from './features/leads/pages/SATasks';


const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const userStr = localStorage.getItem('crm_user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }
  const user = JSON.parse(userStr);
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    if (user.role === 'Superadmin') return <Navigate to="/superadmin/tenants" replace />;
    if (user.role === 'Sales Associate') return <Navigate to="/feature/leads/sa/dashboard" replace />;
    return <Navigate to="/feature/leads" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter basename={basePath}>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            {/* Root index redirect to Leads active app */}
            <Route index element={
              <ProtectedRoute>
                <Navigate to="/feature/leads" replace />
              </ProtectedRoute>
            } />

            {/* Leads Module Routes */}
            <Route path="feature/leads">
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
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
