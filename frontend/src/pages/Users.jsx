import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, X, Mail, Phone, MapPin, User, Lock, Upload, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast, useConfirm } from '../components/NotificationContext';
import { apiBaseUrl } from '../utils/env.js';

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
  
  // User creation/edit form state
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact: '',
    gender: 'Male',
    address: '',
    password: '',
    role: 'Sales Associate'
  });
  
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const [existingPhotoPath, setExistingPhotoPath] = useState(null);

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

  // Click edit button
  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFormErrors({});
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      contact: user.contact || '',
      gender: user.gender || 'Male',
      address: user.address || '',
      password: '', // Keep empty unless updating password
      role: user.role || 'Sales Associate'
    });
    setPhotoFile(null);
    setPhotoPreview(user.profile_photo ? getAvatarUrl(user.profile_photo) : null);
    setExistingPhotoPath(user.profile_photo);
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
                role: form.role
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
          role: form.role
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
      role: 'Sales Associate'
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoPath(null);
    setEditingUserId(null);
    setFormErrors({});
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
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
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
                <button 
                  className="user-card-action-btn edit" 
                  onClick={() => handleEditClick(user)}
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
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
              </div>
              
              <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    editingUserId !== null ? 'Update User' : 'Add User'
                  )}
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
