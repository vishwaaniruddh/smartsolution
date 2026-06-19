import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Mail, Phone, MapPin, User, Lock, Upload, Edit2, Trash2, CheckCircle2, AlertCircle, LayoutGrid } from 'lucide-react';
import { useToast, useConfirm } from '../components/NotificationContext';
import { apiBaseUrl } from '../utils/env.js';

const appNames = {
  crm: 'Lead & Sales Intelligence (CRM)',
  hrms: 'Human Resource Management (HRMS)',
  accounting: 'Double-Entry Financial Ledger',
  inventory: 'Smart Inventory & Warehouse Control',
  servicedesk: 'Service Desk & Ticketing'
};

const defaultUsers = [
  {
    id: 1,
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.davis@crm.com',
    contact: '+1 (555) 019-2834',
    gender: 'Female',
    address: '123 Sales St, San Francisco, CA',
    profile_photo: null,
    role: 'Manager'
  },
  {
    id: 2,
    first_name: 'Alex',
    last_name: 'Lee',
    email: 'alex.lee@crm.com',
    contact: '+1 (555) 019-5847',
    gender: 'Male',
    address: '456 Tech Ave, San Jose, CA',
    profile_photo: null,
    role: 'Sales Associate'
  },
  {
    id: 3,
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@crm.com',
    contact: '+1 (555) 019-0000',
    gender: 'Other',
    address: '789 Main Rd, Seattle, WA',
    profile_photo: null,
    role: 'Admin'
  }
];

const validateEmail = (email) => {
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

const Users = () => {
  const [users, setUsers] = useState(defaultUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); // null means creating, number means editing
  const [modalTab, setModalTab] = useState('Profile');
  
  // User creation/edit form state
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact: '',
    gender: 'Male',
    address: '',
    password: '',
    role: 'Sales Associate',
    assigned_apps: []
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const [existingPhotoPath, setExistingPhotoPath] = useState(null);

  const currentUserStr = localStorage.getItem('crm_user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const activeRole = localStorage.getItem('crm_active_role') || (currentUser ? currentUser.role : '');
  const availableApps = currentUser ? (currentUser.apps || []) : [];

  const appDetails = {
    'crm': { name: 'Lead & Sales Intelligence (CRM)', desc: 'Pipeline management, activity logging, and revenue analytics.' },
    'hrms': { name: 'Human Resource Management (HRMS)', desc: 'Employee directory, attendance trackers, leaves, and payroll.' },
    'accounting': { name: 'Double-Entry Financial Ledger', desc: 'Invoicing, bookkeeping accounts, and tax reporting.' },
    'inventory': { name: 'Smart Inventory & Warehouse Control', desc: 'Stock levels, barcode cataloging, and purchase orders.' },
    'servicedesk': { name: 'Service Desk & Ticketing', desc: 'Internal ticketing, SLA tracking, agent queues, and resolution analytics.' }
  };

  const navigate = useNavigate();

  const handleImpersonateClick = async (userToImpersonate) => {
    const confirmed = await confirm(`Are you sure you want to impersonate ${userToImpersonate.first_name} ${userToImpersonate.last_name}?`, 'Impersonate User');
    if (!confirmed) return;
    
    // Save current user as original
    localStorage.setItem('crm_tenant_admin_user', JSON.stringify(currentUser));
    
    // Set the selected user as active, ensuring assigned_apps are mapped to apps property
    const impersonatedUser = { ...userToImpersonate, apps: userToImpersonate.assigned_apps || [] };
    localStorage.setItem('crm_user', JSON.stringify(impersonatedUser));
    localStorage.setItem('crm_active_role', impersonatedUser.role);
    localStorage.removeItem('crm_active_app');
    
    toast.success(`Impersonating ${userToImpersonate.first_name}`);
    window.location.href = '/select-app'; // Hard refresh to ensure all context reloads
  };

  // Fetch users from backend
  const fetchUsers = () => {
    fetch(`${apiBaseUrl}/users`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setUsers(data.data);
        }
      })
      .catch(err => {
        console.warn('API error fetching users, using mock data:', err);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleOpenAddModal = () => {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      contact: '',
      gender: 'Male',
      address: '',
      password: '',
      role: 'Sales Associate',
      assigned_apps: []
    });
    setFormErrors({});
    setEditingUserId(null);
    setPhotoPreview(null);
    setPhotoFile(null);
    setModalTab('Profile');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      contact: user.contact || '',
      gender: user.gender || 'Male',
      address: user.address || '',
      password: '', // blank password means don't change
      role: user.role || 'Sales Associate',
      assigned_apps: user.assigned_apps || []
    });
    setFormErrors({});
    setEditingUserId(user.id);
    setPhotoPreview(user.profile_photo ? getAvatarUrl(user.profile_photo) : null);
    setExistingPhotoPath(user.profile_photo);
    setModalTab('Profile');
    setIsModalOpen(true);
  };

  // Click delete button
  const handleDeleteClick = async (userId, userName) => {
    const confirmed = await confirm(`Are you sure you want to delete the user "${userName}"?`, 'Delete User');
    if (!confirmed) {
      return;
    }

    fetch(`${apiBaseUrl}/users?id=${userId}`, {
      method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success('User deleted successfully.');
        fetchUsers();
      } else {
        toast.error('Error deleting user: ' + data.error);
      }
    })
    .catch(() => {
      // Local fallback
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted (local fallback).');
    });
  };

  // Submit new/edited user
  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!form.first_name || !form.first_name.trim()) {
      errors.first_name = 'First name is required.';
    }
    if (!form.last_name || !form.last_name.trim()) {
      errors.last_name = 'Last name is required.';
    }
    if (!form.email || !form.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!validateEmail(form.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (form.contact && !validatePhone(form.contact)) {
      errors.contact = 'Please enter a valid contact number (7-15 digits).';
    }
    if (editingUserId === null && (!form.password || !form.password.trim())) {
      errors.password = 'Password is required for new accounts.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setModalTab('Profile');
      return;
    }
    setFormErrors({});

    const formData = new FormData();
    if (editingUserId !== null) {
      formData.append('id', editingUserId);
    }
    formData.append('first_name', form.first_name);
    formData.append('last_name', form.last_name);
    formData.append('email', form.email);
    formData.append('contact', form.contact);
    formData.append('gender', form.gender);
    formData.append('address', form.address);
    formData.append('role', form.role);
    formData.append('assigned_apps', JSON.stringify(form.assigned_apps));
    
    // Only send password if filled (or if creating a new user)
    if (form.password) {
      formData.append('password', form.password);
    } else if (editingUserId === null) {
      toast.warning('Password is required for new accounts.');
      return;
    }

    if (photoFile) {
      formData.append('profile_photo', photoFile);
    }

    setIsSubmitting(true);
    fetch(`${apiBaseUrl}/users`, {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        fetchUsers();
        setIsModalOpen(false);
        resetForm();
        
        if (editingUserId === null) {
          if (data.email_sent) {
            toast.success('User created and Welcome Email sent!');
          } else if (data.email_error) {
            toast.warning(`User created, but email failed: ${data.email_error}`);
          } else {
            toast.success('User created successfully!');
          }
        } else {
          toast.success('User updated successfully!');
        }
      } else {
        toast.error('Error: ' + data.error);
      }
    })
    .catch((err) => {
      toast.error('API error. Check connection.');
      console.warn('Failed to post to API, falling back to local update:', err);
      // Fallback local update
      if (editingUserId !== null) {
        // Edit fallback
        setUsers(users.map(u => 
          u.id === editingUserId 
            ? {
                ...u,
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                contact: form.contact,
                gender: form.gender,
                address: form.address,
                profile_photo: photoPreview || existingPhotoPath,
                role: form.role,
                assigned_apps: form.assigned_apps
              }
            : u
        ));
      } else {
        // Create fallback
        const localNewUser = {
          id: Date.now(),
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          contact: form.contact,
          gender: form.gender,
          address: form.address,
          profile_photo: photoPreview,
          role: form.role,
          assigned_apps: form.assigned_apps
        };
        setUsers([localNewUser, ...users]);
      }
      setIsModalOpen(false);
      resetForm();
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  };

  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      contact: '',
      gender: 'Male',
      address: '',
      password: '',
      role: 'Sales Associate',
      assigned_apps: []
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoPath(null);
    setEditingUserId(null);
    setFormErrors({});
    setModalTab('Profile');
  };

  // Helper to format avatar image URL
  const getAvatarUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('data:') || photoPath.startsWith('blob:') || photoPath.startsWith('http')) {
      return photoPath;
    }
    return `${apiBaseUrl}/${photoPath}`;
  };

  const getInitials = (user) => {
    const first = user.first_name ? user.first_name.charAt(0) : '';
    const last = user.last_name ? user.last_name.charAt(0) : '';
    return (first + last).toUpperCase();
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'Admin': return 'role-admin';
      case 'Manager': return 'role-manager';
      case 'Sales Associate':
      default:
        return 'role-sales';
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const email = u.email.toLowerCase();
    const role = u.role.toLowerCase();
    const term = searchTerm.toLowerCase();

    return fullName.includes(term) || email.includes(term) || role.includes(term);
  });

  return (
    <>
      <div className="animate-in">
        <div className="leads-page-header">
        <div className="leads-toolbar">
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button 
          className="add-lead-btn" 
          onClick={handleOpenAddModal}
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="users-grid">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div key={user.id} className="user-card">
              
              {/* HOVER ACTIONS PANEL */}
              <div className="user-card-actions">
                {currentUser && currentUser.id !== user.id && (
                  <button 
                    className="user-card-action-btn edit" 
                    style={{ color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                    onClick={() => handleImpersonateClick(user)}
                    title="Impersonate User"
                  >
                    <User size={13} />
                  </button>
                )}
                <button 
                  className="user-card-action-btn edit" 
                  onClick={() => handleOpenEditModal(user)}
                  title="Edit User Profile"
                >
                  <Edit2 size={13} />
                </button>
                <button 
                  className="user-card-action-btn delete" 
                  onClick={() => handleDeleteClick(user.id, `${user.first_name} ${user.last_name}`)}
                  title="Delete User Account"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="user-card-header">
                <div className="user-avatar-wrapper">
                  {user.profile_photo ? (
                    <img
                      src={getAvatarUrl(user.profile_photo)}
                      alt={`${user.first_name} avatar`}
                      className="user-avatar-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (!parent.querySelector('.user-avatar-placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'user-avatar-placeholder';
                          placeholder.innerText = getInitials(user);
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {getInitials(user)}
                    </div>
                  )}
                </div>
                <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>
                  {user.first_name} {user.last_name}
                </h3>
                <span className={`user-role-badge ${getRoleClass(user.role)}`}>
                  {user.role}
                </span>
              </div>

              <div className="user-card-body">
                <div className="user-info-row">
                  <Mail />
                  <span className="user-info-text" title={user.email}>{user.email}</span>
                </div>
                <div className="user-info-row">
                  <Phone />
                  <span className="user-info-text">{user.contact || 'No contact number'}</span>
                </div>
                <div className="user-info-row">
                  <User />
                  <span className="user-info-text">Gender: {user.gender}</span>
                </div>
                <div className="user-info-row" style={{ alignItems: 'flex-start' }}>
                  <MapPin style={{ marginTop: '2px' }} />
                  <span className="user-info-text" style={{ whiteSpace: 'normal', height: 'auto', lineBreak: 'anywhere' }}>
                    {user.address || 'No address provided'}
                  </span>
                </div>
                <div className="user-info-row" style={{ alignItems: 'flex-start', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <LayoutGrid style={{ marginTop: '2px', color: 'var(--text-muted)' }} size={16} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {user.assigned_apps && user.assigned_apps.length > 0 ? (
                      user.assigned_apps.map(appId => (
                        <span key={appId} style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          color: 'var(--text-secondary)', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          border: '1px solid rgba(255,255,255,0.1)' 
                        }}>
                          {appNames[appId] || appId}
                        </span>
                      ))
                    ) : (
                      <span className="user-info-text" style={{ fontStyle: 'italic', fontSize: '12px' }}>No apps assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No users found matching search criteria.
          </div>
        )}
      </div>
      </div>

      {/* USER FORM MODAL (CREATE OR EDIT) */}
      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUserId !== null ? 'Edit User Account' : 'Create User Account'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
              <button 
                onClick={() => setModalTab('Profile')}
                type="button"
                style={{
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: modalTab === 'Profile' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderBottom: modalTab === 'Profile' ? '2px solid var(--accent-cyan)' : 'none',
                  cursor: 'pointer'
                }}
              >
                User Profile
              </button>
              <button 
                onClick={() => setModalTab('Apps')}
                type="button"
                style={{
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: modalTab === 'Apps' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderBottom: modalTab === 'Apps' ? '2px solid var(--accent-cyan)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Application Access
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {modalTab === 'Profile' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select
                        className="form-control"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        disabled={editingUserId !== null && activeRole !== 'Superadmin' && form.role === 'Admin'}
                      >
                        <option>Admin</option>
                        <option>Manager</option>
                        <option>Sales Associate</option>
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">First Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Jane"
                          className={`form-control ${formErrors.first_name ? 'is-invalid' : ''}`}
                          value={form.first_name}
                          onChange={(e) => {
                            setForm({ ...form, first_name: e.target.value });
                            if (formErrors.first_name) setFormErrors({ ...formErrors, first_name: null });
                          }}
                        />
                        {formErrors.first_name && <span className="invalid-feedback">{formErrors.first_name}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Last Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Doe"
                          className={`form-control ${formErrors.last_name ? 'is-invalid' : ''}`}
                          value={form.last_name}
                          onChange={(e) => {
                            setForm({ ...form, last_name: e.target.value });
                            if (formErrors.last_name) setFormErrors({ ...formErrors, last_name: null });
                          }}
                        />
                        {formErrors.last_name && <span className="invalid-feedback">{formErrors.last_name}</span>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="jane.doe@company.com"
                          className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                          value={form.email}
                          onChange={(e) => {
                            setForm({ ...form, email: e.target.value });
                            if (formErrors.email) setFormErrors({ ...formErrors, email: null });
                          }}
                        />
                        {formErrors.email && <span className="invalid-feedback">{formErrors.email}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Contact Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +1 (555) 012-3456"
                          className={`form-control ${formErrors.contact ? 'is-invalid' : ''}`}
                          value={form.contact}
                          onChange={(e) => {
                            setForm({ ...form, contact: e.target.value });
                            if (formErrors.contact) setFormErrors({ ...formErrors, contact: null });
                          }}
                        />
                        {formErrors.contact && <span className="invalid-feedback">{formErrors.contact}</span>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select
                          className="form-control"
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                          <option>Prefer not to say</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">
                          Password {editingUserId !== null ? '(leave blank to keep unchanged)' : '*'}
                        </label>
                        <input
                          type="password"
                          required={editingUserId === null}
                          placeholder="••••••••"
                          className={`form-control ${formErrors.password ? 'is-invalid' : ''}`}
                          value={form.password}
                          onChange={(e) => {
                            setForm({ ...form, password: e.target.value });
                            if (formErrors.password) setFormErrors({ ...formErrors, password: null });
                          }}
                        />
                        {formErrors.password && <span className="invalid-feedback">{formErrors.password}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Address</label>
                      <textarea
                        rows="2"
                        placeholder="Enter street, city, state, zip code..."
                        className="form-control"
                        style={{ resize: 'vertical' }}
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Profile Photo</label>
                      <div className="photo-upload-container">
                        <div className="photo-preview">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <Upload size={20} />
                          )}
                        </div>
                        <div className="photo-upload-input-wrapper">
                          <label htmlFor="user-photo-upload" className="photo-upload-btn-label">
                            Choose Photo
                          </label>
                          <input
                            id="user-photo-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                          />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Supports JPG, PNG, WEBP, or GIF. Max 2MB.
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label" style={{ marginBottom: '12px' }}>Provision Applications</label>
                      {availableApps.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--bg-card-hover)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                          {availableApps.map(appId => {
                            const app = appDetails[appId] || { name: appNames[appId] || appId, desc: 'Application module access' };
                            const isChecked = form.assigned_apps.includes(appId);
                            return (
                              <label key={appId} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: isChecked ? 'rgba(34, 211, 238, 0.04)' : 'transparent', transition: 'all 0.2s' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setForm({ ...form, assigned_apps: [...form.assigned_apps, appId] });
                                    } else {
                                      setForm({ ...form, assigned_apps: form.assigned_apps.filter(a => a !== appId) });
                                    }
                                  }}
                                  style={{ marginTop: '3px', accentColor: 'var(--accent-cyan)' }}
                                />
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{app.name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{app.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No applications available for this tenant.</span>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="modal-btn secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="modal-btn primary"
                >
                  {isSubmitting ? 'Saving...' : (editingUserId !== null ? 'Update User' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
};

export default Users;
