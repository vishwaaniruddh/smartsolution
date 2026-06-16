import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { apiBaseUrl } from '../../../utils/env.js';
import { useCRM } from '../context/CRMContext';

const LeadSources = () => {
  const { toast, confirm, tenantId } = useCRM();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentSource, setCurrentSource] = useState(null);
  
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSources = useCallback(() => {
    setLoading(true);
    fetch(`${apiBaseUrl}/lead-sources?tenant_id=${tenantId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSources(data.data);
        } else {
          setSources([]);
        }
      })
      .catch(err => {
        console.error('Error fetching lead sources:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tenantId]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const openAddModal = () => {
    setModalMode('add');
    setCurrentSource(null);
    setFormName('');
    setIsModalOpen(true);
  };

  const openEditModal = (source) => {
    setModalMode('edit');
    setCurrentSource(source);
    setFormName(source.name);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormName('');
    setCurrentSource(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.warning('Source name is required.');
      return;
    }

    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      name: formName.trim()
    };

    if (modalMode === 'edit') {
      payload.id = currentSource.id;
    }

    const method = modalMode === 'edit' ? 'PUT' : 'POST';

    fetch(`${apiBaseUrl}/lead-sources`, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(modalMode === 'edit' ? 'Lead source updated.' : 'Lead source created.');
          fetchSources();
          closeModal();
        } else {
          toast.error(data.error || 'Failed to save lead source.');
        }
      })
      .catch(err => {
        console.error('Error saving lead source:', err);
        toast.error('Network error while saving.');
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handleDelete = async (id, name) => {
    const confirmed = await confirm(`Are you sure you want to delete "${name}"?`, 'Delete Lead Source');
    if (!confirmed) {
      return;
    }

    fetch(`${apiBaseUrl}/lead-sources?id=${id}&tenant_id=${tenantId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Lead source deleted successfully.');
          fetchSources();
        } else {
          toast.error(data.error || 'Failed to delete lead source.');
        }
      })
      .catch(err => {
        console.error('Error deleting lead source:', err);
        toast.error('Network error while deleting.');
      });
  };

  const filteredSources = sources.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in">
      <div className="leads-page-header">
        <div>
          <h1 className="page-title">Lead Sources</h1>
          <p className="page-subtitle">Manage where your leads come from</p>
        </div>
        
        <div className="leads-toolbar">
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="add-lead-btn" onClick={openAddModal}>
            <Plus size={16} /> Add Source
          </button>
        </div>
      </div>

      <div className="leads-table-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading lead sources...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Source Name</th>
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSources.length > 0 ? (
                  filteredSources.map((source) => (
                    <tr key={source.id}>
                      <td style={{ color: 'var(--text-muted)' }}>#{source.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{source.name}</td>
                      <td>{new Date(source.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-buttons-cell" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="action-icon-btn edit"
                            onClick={() => openEditModal(source)}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="action-icon-btn delete"
                            onClick={() => handleDelete(source.id, source.name)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No lead sources found. Add one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{modalMode === 'add' ? 'Add Lead Source' : 'Edit Lead Source'}</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Source Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Website, Referral"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="modal-btn primary" disabled={saving}>
                  {saving ? 'Saving...' : (modalMode === 'add' ? 'Add Source' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LeadSources;
