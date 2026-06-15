export function getAppBasePath() {
  let path = window.location.pathname;
  if (path.endsWith('/') && path !== '/') {
    path = path.slice(0, -1);
  }
  const routerPaths = [
    '/superadmin/tenants',
    '/sa/dashboard',
    '/sa/leads',
    '/sa/pipeline',
    '/sa/tasks',
    '/sa/sales',
    '/login',
    '/leads',
    '/pipeline',
    '/sales',
    '/contacts',
    '/users',
    '/lead-sources',
    '/smtp-config',
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
