export function getAppBasePath() {
  let path = window.location.pathname;
  if (path.endsWith('/') && path !== '/') {
    path = path.slice(0, -1);
  }
  const routerPaths = [
    '/superadmin/tenants',
    '/feature/leads/sa/dashboard',
    '/feature/leads/sa/leads',
    '/feature/leads/sa/pipeline',
    '/feature/leads/sa/tasks',
    '/feature/leads/sa/sales',
    '/login',
    '/feature/leads/leads',
    '/feature/leads/pipeline',
    '/feature/leads/sales',
    '/feature/leads',
    '/contacts',
    '/users',
    '/feature/leads/lead-sources',
    '/reports',
    '/settings',
    '/help'
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
  const hostname = window.location.hostname;
  if (hostname === 'workforce.sarsspl.com') {
    return 'https://workforce.sarsspl.com/api';
  } else if (hostname === 'workforce_dev.sarsspl.com') {
    return 'https://workforce_dev.sarsspl.com/api';
  } else {
    // Local / Testing environment
    if (window.location.port === '5173') {
      return 'http://localhost/lead/api';
    }
    return window.location.origin + basePath + '/api';
  }
}

export const apiBaseUrl = getApiBaseUrl();
