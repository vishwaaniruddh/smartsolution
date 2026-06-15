import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { basePath, isProd } from './utils/env.js'

// Global fetch interceptor to inject X-Tenant-ID header dynamically and auto-adapt URLs
const originalFetch = window.fetch;
window.fetch = (url, options = {}) => {
  let urlStr = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
  
  // Auto-adapt API base URL for production vs development
  if (isProd) {
    // In production, rewrite absolute localhost API path to relative path with basePath prefix
    if (urlStr.includes('localhost/lead/api/')) {
      urlStr = urlStr.replace(/http:\/\/localhost\/lead\/api\//, basePath + '/api/');
      url = urlStr;
    }
  } else {
    // In development (port 5173), rewrite relative /api/ to absolute localhost path
    if (urlStr.startsWith('/api/')) {
      urlStr = urlStr.replace(/^\/api\//, 'http://localhost/lead/api/');
      url = urlStr;
    }
  }

  if (urlStr.includes('/api/') || urlStr.includes('/lead/api/')) {
    const tenantId = localStorage.getItem('crm_tenant_id') || '1';
    let headers = options.headers || {};
    if (headers instanceof Headers) {
      headers.set('X-Tenant-ID', tenantId);
    } else if (Array.isArray(headers)) {
      headers.push(['X-Tenant-ID', tenantId]);
    } else {
      headers = {
        ...headers,
        'X-Tenant-ID': tenantId
      };
    }
    options.headers = headers;
  }
  return originalFetch(url, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
