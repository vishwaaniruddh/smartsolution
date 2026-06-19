const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "c:/xampp/htdocs/lead/frontend/src/pages/Users.jsx",
  "c:/xampp/htdocs/lead/frontend/src/pages/SettingsPage.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/superadmin/pages/TenantReports.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/servicedesk/context/ServiceDeskContext.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/leads/tenants/tenant_2/CustomLeadForm.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/leads/context/CRMContext.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/leads/components/StandardLeadForm.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/leads/components/LeadFormResolver.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/inventory/context/InventoryContext.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/hrms/context/HRMSContext.jsx",
  "c:/xampp/htdocs/lead/frontend/src/features/accounting/context/AccountingContext.jsx",
  "c:/xampp/htdocs/lead/frontend/src/components/SettingsContext.jsx"
];

filesToUpdate.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Try to find the right relative path for AuthContext
  const parts = file.split('src/');
  if(parts.length < 2) return;
  const relativeDepth = parts[1].split('/').length - 1;
  const relativePrefix = relativeDepth === 0 ? './' : '../'.repeat(relativeDepth);
  const authContextPath = `${relativePrefix}context/AuthContext`;

  // Inject import if not exists
  if (!content.includes('useAuth')) {
    content = `import { useAuth } from '${authContextPath}';\n` + content;
  }

  // Replace localStorage logic
  content = content.replace(/const\s+currentUserStr\s*=\s*localStorage\.getItem\('crm_user'\);[\s\S]*?(?:const\s+currentUser\s*=\s*[^;]+;|const\s+currentUser\s*=\s*JSON\.parse[^;]+;)/g, 'const { user: currentUser } = useAuth();');
  content = content.replace(/const\s+userStr\s*=\s*localStorage\.getItem\('crm_user'\);[\s\S]*?(?:const\s+user\s*=\s*[^;]+;|const\s+user\s*=\s*JSON\.parse[^;]+;)/g, 'const { user } = useAuth();');
  content = content.replace(/const\s+currentSuperadmin\s*=\s*localStorage\.getItem\('crm_user'\);/g, "const currentSuperadmin = localStorage.getItem('crm_superadmin_token');");
  content = content.replace(/const\s+authUser\s*=\s*localStorage\.getItem\('crm_user'\);[\s\S]*?(?:const\s+user\s*=\s*[^;]+;)/g, 'const token = localStorage.getItem("crm_token");\n            const user = token ? true : false;');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated: ${file}`);
});
