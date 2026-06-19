import { useAuth } from '../../../context/AuthContext';
import React, { useState, useEffect } from 'react';
import { apiBaseUrl } from '../../../utils/env.js';

const validateEmail = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validatePhone = (phone) => {
  if (!phone) return true;
  const trimmed = phone.trim();
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
  if (phoneRegex.test(trimmed)) {
    const digitCount = trimmed.replace(/\D/g, '').length;
    return digitCount >= 7 && digitCount <= 15;
  }
  return false;
};

const StandardLeadForm = ({
  initialData,
  onSubmit,
  onCancel,
  agentsList = ['Unassigned'],
  showAgentAssignment = false,
  currencySymbol = '₹',
  saving = false
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    contact_number: '',
    source: 'Website',
    status: 'New',
    value: '',
    agent: 'Unassigned',
    delegation_status: 'None',
    remarks: ''
  });

  const [errors, setErrors] = useState({});
  const [sources, setSources] = useState([]);

  useEffect(() => {
    const userStr = localStorage.getItem('crm_user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const tenantId = currentUser?.tenant_id || localStorage.getItem('crm_tenant_id') || '1';

    fetch(`${apiBaseUrl}/lead-sources?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data && data.data.length > 0) {
          const names = data.data.map(item => item.name);
          setSources(names);
          if (!initialData) {
            setForm(prev => {
              if (!names.includes(prev.source)) {
                return { ...prev, source: names[0] };
              }
              return prev;
            });
          }
        } else {
          setSources(['Website', 'Referral', 'LinkedIn', 'Partner', 'Cold Call', 'Other']);
        }
      })
      .catch(() => {
        setSources(['Website', 'Referral', 'LinkedIn', 'Partner', 'Cold Call', 'Other']);
      });
  }, [initialData]);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        email: initialData.email || '',
        contact_number: initialData.contact_number || '',
        source: initialData.source || 'Website',
        status: initialData.status || 'New',
        value: initialData.value !== undefined && initialData.value !== null ? initialData.value.toString() : '',
        agent: initialData.agent || 'Unassigned',
        delegation_status: initialData.delegation_status || 'None',
        remarks: initialData.remarks || ''
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name || !form.name.trim()) {
      newErrors.name = 'Lead Name is required.';
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid Email Address (e.g. name@domain.com).';
    }

    if (form.contact_number && !validatePhone(form.contact_number)) {
      newErrors.contact_number = 'Please enter a valid Contact Number (7-15 digits).';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = {
      ...form,
      value: form.value === '' ? 0.00 : parseFloat(form.value),
      delegation_status: form.agent === 'Unassigned' ? 'None' : form.delegation_status
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-body">
        <div className="form-group">
          <label className="form-label">Lead Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Acme Corporation or Jane Doe"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              if (errors.name) setErrors({ ...errors, name: null });
            }}
          />
          {errors.name && <span className="invalid-feedback">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="e.g. john@acme.com"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
              value={form.email || ''}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: null });
              }}
            />
            {errors.email && <span className="invalid-feedback">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input
              type="text"
              placeholder="e.g. +1 (555) 012-3456"
              className={`form-control ${errors.contact_number ? 'is-invalid' : ''}`}
              value={form.contact_number || ''}
              onChange={(e) => {
                setForm({ ...form, contact_number: e.target.value });
                if (errors.contact_number) setErrors({ ...errors, contact_number: null });
              }}
            />
            {errors.contact_number && <span className="invalid-feedback">{errors.contact_number}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Source</label>
            <select
              className="form-control"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            >
              {sources.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
              {form.source && !sources.includes(form.source) && (
                <option value={form.source}>{form.source}</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>New</option>
              <option>Contacted</option>
              <option>Qualified</option>
              <option>Closed</option>
              <option>Lost</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Estimated Value ({currencySymbol})</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 5000.00"
            className="form-control"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea
            rows="3"
            placeholder="General remarks, notes, or background information about this lead..."
            className="form-control"
            style={{ resize: 'vertical' }}
            value={form.remarks || ''}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          />
        </div>

        {showAgentAssignment && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assign Agent</label>
              <select
                className="form-control"
                value={form.agent}
                onChange={(e) => {
                  const agent = e.target.value;
                  const status = agent === 'Unassigned' ? 'None' : 'Pending';
                  setForm({ ...form, agent, delegation_status: status });
                }}
              >
                {agentsList.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>

            {form.agent !== 'Unassigned' && (
              <div className="form-group">
                <label className="form-label">Delegation Status</label>
                <select
                  className="form-control"
                  value={form.delegation_status}
                  onChange={(e) => setForm({ ...form, delegation_status: e.target.value })}
                >
                  <option>Pending</option>
                  <option>Accepted</option>
                  <option>Rejected</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button type="button" className="modal-btn secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="modal-btn primary" disabled={saving}>
          {saving ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Lead')}
        </button>
      </div>
    </form>
  );
};

export default StandardLeadForm;
