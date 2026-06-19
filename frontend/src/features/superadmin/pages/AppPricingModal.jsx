import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, CreditCard } from 'lucide-react';
import { apiBaseUrl } from '../../../utils/env';
import { useToast } from '../../../components/NotificationContext';

const AppPricingModal = ({ isOpen, onClose, app }) => {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && app) {
      fetchPlans();
    }
  }, [isOpen, app]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/subscriptions/plans?app_id=${app.id}`);
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      } else {
        toast.error('Failed to fetch pricing plans');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlan = () => {
    setPlans([
      ...plans,
      {
        id: 'new_' + Date.now(),
        app_id: app.id,
        plan_name: '',
        base_fee: 0,
        included_users: 1,
        additional_user_fee: 0,
        billing_cycle: 'Monthly',
        isNew: true
      }
    ]);
  };

  const handleChange = (id, field, value) => {
    setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSavePlan = async (plan) => {
    try {
      const method = plan.isNew ? 'POST' : 'PUT';
      const res = await fetch(`${apiBaseUrl}/subscriptions/plans`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchPlans(); // Refresh to get proper ID and remove isNew flag
      } else {
        toast.error(data.error || 'Failed to save plan');
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  const handleDeletePlan = async (plan) => {
    if (plan.isNew) {
      setPlans(plans.filter(p => p.id !== plan.id));
      return;
    }
    
    if (!confirm('Are you sure you want to delete this pricing plan?')) return;
    
    try {
      const res = await fetch(`${apiBaseUrl}/subscriptions/plans?id=${plan.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Plan removed');
        fetchPlans();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Network error');
    }
  };

  if (!isOpen || !app) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', borderRadius: '8px' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2>{app.name} - Pricing Configuration</h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Define subscription tiers and billing models</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ background: 'var(--bg-dark)', padding: '24px' }}>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading plans...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {plans.map(plan => (
                <div key={plan.id} style={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Plan Name</label>
                      <input 
                        type="text" 
                        value={plan.plan_name} 
                        onChange={(e) => handleChange(plan.id, 'plan_name', e.target.value)}
                        placeholder="e.g. Basic, Premium"
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Billing Cycle</label>
                      <select 
                        value={plan.billing_cycle} 
                        onChange={(e) => handleChange(plan.id, 'billing_cycle', e.target.value)}
                        className="form-control"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Base Fee ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={plan.base_fee} 
                        onChange={(e) => handleChange(plan.id, 'base_fee', parseFloat(e.target.value))}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Included Users</label>
                      <input 
                        type="number" 
                        value={plan.included_users} 
                        onChange={(e) => handleChange(plan.id, 'included_users', parseInt(e.target.value))}
                        className="form-control"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Extra User Fee ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={plan.additional_user_fee} 
                        onChange={(e) => handleChange(plan.id, 'additional_user_fee', parseFloat(e.target.value))}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={() => handleDeletePlan(plan)} className="modal-btn secondary" style={{ color: 'var(--accent-red)' }}>
                      <Trash2 size={14} /> Remove
                    </button>
                    <button onClick={() => handleSavePlan(plan)} className="modal-btn primary">
                      <Save size={14} /> {plan.isNew ? 'Create Plan' : 'Update Plan'}
                    </button>
                  </div>
                </div>
              ))}

              {plans.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                  No pricing plans configured for this module.
                </div>
              )}

              <button 
                onClick={handleAddPlan} 
                className="modal-btn secondary" 
                style={{ width: '100%', padding: '16px', borderStyle: 'dashed', justifyContent: 'center' }}
              >
                <Plus size={16} /> Add New Pricing Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppPricingModal;
