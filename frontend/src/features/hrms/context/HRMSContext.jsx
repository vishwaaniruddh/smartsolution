/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { useToast } from '../../../components/NotificationContext';
import { useOutletContext } from 'react-router-dom';

const HRMSContext = createContext(null);

export const HRMSProvider = ({ children }) => {
  const toast = useToast();

  let activeRole = 'Admin/Manager';
  let activeAgent = 'Emily Davis';
  try {
    const context = useOutletContext();
    if (context) {
      activeRole = context.activeRole || activeRole;
      activeAgent = context.activeAgent || activeAgent;
    }
  } catch {
    // Not in outlet context
  }

  const userStr = localStorage.getItem('crm_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const tenantId = localStorage.getItem('crm_tenant_id') || '1';

  return (
    <HRMSContext.Provider value={{
      tenantId,
      user,
      activeRole,
      activeAgent,
      toast
    }}>
      {children}
    </HRMSContext.Provider>
  );
};

export const useHRMS = () => {
  const context = useContext(HRMSContext);
  if (!context) {
    throw new Error('useHRMS must be used within an HRMSProvider');
  }
  return context;
};
