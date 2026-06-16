/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import { useToast, useConfirm } from '../../../components/NotificationContext';
import { useOutletContext } from 'react-router-dom';

const CRMContext = createContext(null);

export const CRMProvider = ({ children }) => {
  const toast = useToast();
  const confirm = useConfirm();
  
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
  const currencySymbol = user?.currency_symbol || '₹';

  return (
    <CRMContext.Provider value={{
      tenantId,
      user,
      activeRole,
      activeAgent,
      currencySymbol,
      toast,
      confirm
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
