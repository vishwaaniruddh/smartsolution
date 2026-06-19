import { useAuth } from '../../../context/AuthContext';
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../../../components/NotificationContext';
import { useOutletContext } from 'react-router-dom';
import { apiBaseUrl } from '../../../utils/env.js';

const InventoryContext = createContext(null);

export const InventoryProvider = ({ children }) => {
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
  const currencySymbol = user?.currency_symbol || '₹';

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingShared, setLoadingShared] = useState(false);

  const fetchSharedData = () => {
    setLoadingShared(true);
    Promise.all([
      fetch(`${apiBaseUrl}/inventory/warehouses?tenant_id=${tenantId}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/inventory/products?tenant_id=${tenantId}`).then(r => r.json()),
      fetch(`${apiBaseUrl}/inventory/suppliers?tenant_id=${tenantId}`).then(r => r.json())
    ]).then(([wRes, pRes, sRes]) => {
      if (wRes.success) setWarehouses(wRes.data || []);
      if (pRes.success) setProducts(pRes.data || []);
      if (sRes.success) setSuppliers(sRes.data || []);
    }).catch(err => {
      console.error("Error fetching shared inventory data:", err);
    }).finally(() => {
      setLoadingShared(false);
    });
  };

  useEffect(() => {
    fetchSharedData();
  }, [tenantId]);

  return (
    <InventoryContext.Provider value={{
      tenantId,
      user,
      activeRole,
      activeAgent,
      currencySymbol,
      toast,
      warehouses,
      products,
      suppliers,
      loadingShared,
      refreshSharedData: fetchSharedData
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
