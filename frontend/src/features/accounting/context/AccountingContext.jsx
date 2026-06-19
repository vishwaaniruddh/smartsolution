/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../../../components/NotificationContext';
import { useOutletContext } from 'react-router-dom';
import { apiBaseUrl } from '../../../utils/env.js';

const AccountingContext = createContext(null);

export const AccountingProvider = ({ children }) => {
  const baseToast = useToast();
  const toast = (message, type, duration) => baseToast(message, type, duration);
  toast.success = (msg, dur) => baseToast.success(msg, dur);
  toast.error = (msg, dur) => baseToast.error(msg, dur);
  toast.warning = (msg, dur) => baseToast.warning(msg, dur);
  toast.info = (msg, dur) => baseToast.info(msg, dur);
  toast.showSuccess = (msg, dur) => baseToast.success(msg, dur);
  toast.showError = (msg, dur) => baseToast.error(msg, dur);

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

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const fetchAccounts = () => {
    setLoadingAccounts(true);
    fetch(`${apiBaseUrl}/accounting/accounts?tenant_id=${tenantId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setAccounts(res.data || []);
        } else {
          toast.showError(res.error || 'Failed to fetch Chart of Accounts.');
        }
      })
      .catch(err => {
        console.error("Error fetching accounts:", err);
        toast.showError('Connection error while fetching Chart of Accounts.');
      })
      .finally(() => {
        setLoadingAccounts(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, [tenantId]);

  return (
    <AccountingContext.Provider value={{
      tenantId,
      user,
      activeRole,
      activeAgent,
      currencySymbol,
      toast,
      accounts,
      loadingAccounts,
      refreshAccounts: fetchAccounts
    }}>
      {children}
    </AccountingContext.Provider>
  );
};

export const useAccounting = () => {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
};
