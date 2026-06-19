import { useAuth } from '../../../context/AuthContext';
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useToast, useConfirm } from '../../../components/NotificationContext';
import { apiBaseUrl } from '../../../utils/env.js';

const ServiceDeskContext = createContext(null);

export const ServiceDeskProvider = ({ children }) => {
  const toast   = useToast();   // Has .success, .error, .warning, .info built in
  const confirm = useConfirm();

  // Attach showSuccess/showError aliases for consistency with other modules
  toast.showSuccess = toast.success;
  toast.showError   = toast.error;

  const { user } = useAuth();
  const tenantId = localStorage.getItem('crm_tenant_id') || '1';
  const activeRole = user?.role || 'User';

  const [categories, setCategories] = useState([]);
  const [agents,     setAgents]     = useState([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/servicedesk/categories?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => { if (res.success) setCategories(res.data || []); })
      .catch(() => {});

    fetch(`${apiBaseUrl}/users?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => { if (res.success) setAgents(res.data || []); })
      .catch(() => {});
  }, [tenantId]);

  return (
    <ServiceDeskContext.Provider value={{
      tenantId, user, activeRole, toast, confirm, categories, agents
    }}>
      {children}
    </ServiceDeskContext.Provider>
  );
};

export const useServiceDesk = () => {
  const context = useContext(ServiceDeskContext);
  if (!context) throw new Error('useServiceDesk must be used within ServiceDeskProvider');
  return context;
};
