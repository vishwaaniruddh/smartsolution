import React, { Suspense, useMemo } from 'react';
import StandardLeadForm from './StandardLeadForm';

// Glob all tenant custom lead forms. Vite resolves this at build/dev compile time.
const customForms = import.meta.glob('../features/leads/tenants/tenant_*/CustomLeadForm.jsx');

const LeadFormResolver = (props) => {
  // Get current user's tenant_id
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const tenantId = currentUser?.tenant_id || 1;

  // Resolve custom form path
  const customPath = `../features/leads/tenants/tenant_${tenantId}/CustomLeadForm.jsx`;
  
  // Memoize the lazy component to prevent re-creation on every render
  const CustomFormComponent = useMemo(() => {
    if (customForms[customPath]) {
      return React.lazy(customForms[customPath]);
    }
    return null;
  }, [customPath]);

  if (CustomFormComponent) {
    return (
      <Suspense fallback={
        <div className="modal-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading customized form...</div>
        </div>
      }>
        <CustomFormComponent {...props} />
      </Suspense>
    );
  }

  // Fallback to the standard lead form
  return <StandardLeadForm {...props} />;
};

export default LeadFormResolver;
