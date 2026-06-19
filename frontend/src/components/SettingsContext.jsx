import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiBaseUrl } from '../utils/env.js';

export const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            // Check if user is logged in
            const authUser = localStorage.getItem('crm_user');
            let type = 'superadmin'; // Default fallback
            
            if (authUser) {
                const user = JSON.parse(authUser);
                if (user.role !== 'Superadmin') {
                    type = 'tenant';
                }
            }

            const token = localStorage.getItem('token') || '';
            const tenantId = localStorage.getItem('crm_tenant_id') || '';

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
