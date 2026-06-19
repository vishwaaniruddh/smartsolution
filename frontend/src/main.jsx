import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { basePath, isProd } from './utils/env.js'

// Global fetch interceptor to inject X-Tenant-ID header dynamically
const originalFetch = window.fetch;
window.fetch = (url, options = {}) => {
  let urlStr = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
  
  if (urlStr.includes('/api') || urlStr.includes('/lead/api')) {
    const tenantId = localStorage.getItem('crm_tenant_id') || '1';
    let headers = options.headers || {};
    if (headers instanceof Headers) {
      if (!headers.has('X-Tenant-ID') && !headers.has('x-tenant-id')) {
        headers.set('X-Tenant-ID', tenantId);
      }
    } else if (Array.isArray(headers)) {
      const hasHeader = headers.some(([key]) => key.toLowerCase() === 'x-tenant-id');
      if (!hasHeader) {
        headers.push(['X-Tenant-ID', tenantId]);
      }
    } else {
      const hasHeader = Object.keys(headers).some(key => key.toLowerCase() === 'x-tenant-id');
      if (!hasHeader) {
        headers = {
          ...headers,
          'X-Tenant-ID': tenantId
        };
      }
    }
    options.headers = headers;
  }
  return originalFetch(url, options);
};

import { SettingsProvider } from './components/SettingsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
)
