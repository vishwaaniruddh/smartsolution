import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiBaseUrl } from '../utils/env.js';

export const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            let type = 'superadmin';
            
            // Check if token exists
            const token = localStorage.getItem('crm_token') || '';
            const tenantId = localStorage.getItem('crm_tenant_id') || '';

            // We can determine if tenant based on the fact that tenant admins have a tenant_id locally
            if (tenantId && tenantId !== '1') {
                type = 'tenant';
            }

            const res = await fetch(`${apiBaseUrl}/settings?type=${type}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Tenant-ID': tenantId
                }
            });

            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            
            if (data.success && data.data) {
                setSettings(data.data);
                
                // Update document meta
                if (data.data.title) {
                    document.title = data.data.title;
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        
        // Listen for login/logout events to refetch settings
        const handleAuthChange = () => fetchSettings();
        window.addEventListener('auth-change', handleAuthChange);
        
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, refetchSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
