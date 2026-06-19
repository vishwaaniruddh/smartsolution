import { useAuth } from '../../../context/AuthContext';
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

  const { user } = useAuth();
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
