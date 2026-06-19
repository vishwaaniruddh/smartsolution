import React, { useState, useEffect } from 'react';
import { CreditCard, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/NotificationContext';
import { apiBaseUrl } from '../utils/env';
import { useAuth } from '../context/AuthContext';

const TenantBillingSettings = () => {
  const { user } = useAuth();
  const currency = user?.currency_symbol || '$';
  const toast = useToast();
  const [billingData, setBillingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const fetchBillingInfo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/subscriptions/tenant_billing`);
      const data = await res.json();
      if (data.success) {
        setBillingData(data.data);
      } else {
        toast.error('Failed to load billing information');
      }
    } catch (err) {
      toast.error('Network error while loading billing');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading billing data...</div>;
  }

  if (!billingData) {
    return null;
  }

  return (
    <div className="report-card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 20 }}>
        <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', borderRadius: '8px' }}>
          <CreditCard size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Billing & Subscriptions</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Manage your application access and usage</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ padding: '20px', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Estimated Monthly Cost</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currency}{billingData.totals.monthly.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Billed monthly on your cycle date</div>
        </div>
        <div style={{ padding: '20px', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Estimated Yearly Cost</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{currency}{billingData.totals.yearly.toFixed(2)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Billed annually on your cycle date</div>
        </div>
      </div>

      <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Active Application Plans</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {billingData.subscriptions.map((sub, index) => (
          <div key={index} style={{ 
            padding: '20px', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: '12px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h5 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{sub.app_name}</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    background: sub.has_plan ? 'rgba(34, 211, 238, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                    color: sub.has_plan ? 'var(--accent-cyan)' : 'var(--text-muted)', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 600 
                  }}>
                    {sub.plan_name}
                  </span>
                  {sub.status === 'Active' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-green)' }}>
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-red)' }}>
                      <AlertCircle size={12} /> {sub.status}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {currency}{sub.total_fee?.toFixed(2) || '0.00'} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {sub.billing_cycle === 'Monthly' ? 'mo' : 'yr'}</span>
                </div>
              </div>
            </div>

            {sub.has_plan && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base Fee ({sub.included_users} users included)</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>{currency}{sub.base_fee?.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Users</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {sub.assigned_users} / {sub.included_users}
                  </div>
                </div>
                {sub.additional_users > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Additional Users ({sub.additional_users})</div>
                    <div style={{ fontSize: '14px', color: 'var(--accent-orange)', fontWeight: 500 }}>
                      + {currency}{(sub.additional_users * sub.additional_user_fee).toFixed(2)} ({currency}{sub.additional_user_fee}/user)
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {sub.assigned_users > (sub.included_users || 0) && sub.has_plan && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Info size={16} style={{ color: 'var(--accent-orange)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  You have exceeded the base included users. Additional users are billed at <strong>{currency}{sub.additional_user_fee}</strong> per user / {sub.billing_cycle === 'Monthly' ? 'month' : 'year'}.
                </div>
              </div>
            )}
          </div>
        ))}

        {billingData.subscriptions.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
            No active applications or subscriptions found.
          </div>
        )}
      </div>

    </div>
  );
};

export default TenantBillingSettings;
