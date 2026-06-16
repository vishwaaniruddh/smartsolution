export function getAppBasePath() {
  if (import.meta.env.VITE_APP_BASE_PATH !== undefined && import.meta.env.VITE_APP_BASE_PATH !== '') {
    return import.meta.env.VITE_APP_BASE_PATH;
  }
  let path = window.location.pathname;
  if (path.endsWith('/') && path !== '/') {
    path = path.slice(0, -1);
  }
  const routerPaths = [
    '/superadmin/tenants',
    '/superadmin/analytics',
    '/superadmin/apps',
    '/feature/leads/lead-sources',
    '/feature/leads/sa/dashboard',
    '/feature/leads/sa/leads',
    '/feature/leads/sa/pipeline',
    '/feature/leads/sa/tasks',
    '/feature/leads/sa/sales',
    '/feature/leads/leads',
    '/feature/leads/pipeline',
    '/feature/leads/sales',
    '/feature/leads/reports',
    '/feature/leads',
    '/feature/hrms/employees',
    '/feature/hrms/departments',
    '/feature/hrms/attendance',
    '/feature/hrms/leaves',
    '/feature/hrms/payroll',
    '/feature/hrms/holidays',
    '/feature/hrms',
    '/select-app',
    '/contacts',
    '/users',
    '/settings',
    '/help',
    '/login',
    '/reset-password'
  ];
  
  for (const rPath of routerPaths) {
    if (path.endsWith(rPath)) {
      return path.slice(0, -rPath.length);
    }
  }
  
  if (path === '/') {
    return '';
  }
  return path;
}

export const basePath = getAppBasePath();
export const isProd = window.location.hostname !== 'localhost' || window.location.port !== '5173';

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Dynamic fallback for testing/production environments if env variable is missing
  if (window.location.port === '5173') {
    return 'http://localhost/lead/api';
  }
  return window.location.origin + basePath + '/api';
}

export const apiBaseUrl = getApiBaseUrl();
