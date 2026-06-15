import React, { useState } from 'react';
import { LayoutGrid, Users, Wallet, Package, Search, Sparkles, ShieldCheck, CheckCircle2, Play, Lock, ExternalLink } from 'lucide-react';
import { useToast } from '../../../components/NotificationContext';

const appsList = [
  {
    id: 'crm',
    name: 'Lead & Sales Intelligence',
    description: 'Enterprise pipeline management, lead assignment trackers, activity logger, and real-time revenue analytics dashboard.',
    category: 'Sales & Marketing',
    status: 'Active',
    icon: Sparkles,
    color: 'var(--accent-cyan)',
    bg: 'rgba(34, 211, 238, 0.1)',
    border: 'rgba(34, 211, 238, 0.2)',
    badgeColor: 'var(--accent-emerald)',
    badgeBg: 'rgba(16, 185, 129, 0.1)',
    badgeText: 'Active Module'
  },
  {
    id: 'hrms',
    name: 'Human Resource Management (HRMS)',
    description: 'Complete employee directory, shift scheduling, real-time clock-in trackers, leave planner, payroll ledger, and task sheets.',
    category: 'Human Resources',
    status: 'Inactive',
    icon: Users,
    color: 'var(--accent-blue)',
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.2)',
    badgeColor: 'var(--accent-yellow)',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    badgeText: 'Available'
  },
  {
    id: 'accounting',
    name: 'Double-Entry Financial Ledger',
    description: 'Cohesive bookkeeping accounts, custom invoicing, vendor logs, cashflow forecasts, financial statement generator, and tax reports.',
    category: 'Finance',
    status: 'Inactive',
    icon: Wallet,
    color: 'var(--accent-purple)',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.2)',
    badgeColor: 'var(--accent-yellow)',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    badgeText: 'Available'
  },
  {
    id: 'inventory',
    name: 'Smart Inventory & Warehouse Control',
    description: 'Multi-warehouse stock logs, barcode/RFID cataloging, automated purchase ordering, supply logs, and courier trackers.',
    category: 'Logistics',
    status: 'Inactive',
    icon: Package,
    color: 'var(--accent-orange)',
    bg: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.2)',
    badgeColor: 'var(--accent-yellow)',
    badgeBg: 'rgba(245, 158, 11, 0.1)',
    badgeText: 'Available'
  }
];

const Apps = () => {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredApps = appsList.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategory === 'All') return matchesSearch;
    if (activeCategory === 'Active') return matchesSearch && app.status === 'Active';
    if (activeCategory === 'Available') return matchesSearch && app.status === 'Inactive';
    return matchesSearch;
  });

  const handleRequestAccess = (appName) => {
    toast.success(`Upgrade Request Submitted! The ${appName} module activation request has been logged. Our deployment team will contact you shortly.`);
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top summary metrics widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '20px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)', 
            color: 'var(--accent-cyan)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(34, 211, 238, 0.2)'
          }}>
            <LayoutGrid size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{appsList.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Total Cataloged Modules</div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '20px', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: 'var(--radius-md)', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)', 
            color: 'var(--accent-green)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {appsList.filter(a => a.status === 'Active').length}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Active Enterprise Licenses</div>
          </div>
        </div>
      </div>

      {/* Toolbar and Filter Category Tabs */}
      <div className="leads-page-header" style={{ marginBottom: 0, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'Active', 'Available'].map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className="modal-btn secondary"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: activeCategory === category ? 'var(--bg-hover)' : 'transparent',
                color: activeCategory === category ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: activeCategory === category ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              {category} Modules
            </button>
          ))}
        </div>
        
        <div className="leads-toolbar" style={{ margin: 0 }}>
          <div className="leads-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search enterprise modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Grid Layout of Apps */}
      <div className="users-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {filteredApps.length > 0 ? (
          filteredApps.map((app) => (
            <div 
              key={app.id} 
              className="user-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {/* App Card Header */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: 'var(--radius-md)', 
                  background: app.bg, 
                  color: app.color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: `1px solid ${app.border}`,
                  flexShrink: 0 
                }}>
                  <app.icon size={24} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '15px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.name}>
                    {app.name}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Category: {app.category}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                  {app.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Developer: SAR Solutions</span>
                  <span style={{ 
                    fontSize: '11px', 
                    background: app.badgeBg, 
                    color: app.badgeColor, 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontWeight: 600,
                    border: `1px solid rgba(255,255,255,0.05)` 
                  }}>
                    {app.badgeText}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', borderTop: '1px solid var(--border)' }}>
                {app.status === 'Active' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)', fontSize: '11px', color: 'var(--accent-green)', gap: '4px', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Active License
                    </div>
                    <button 
                      onClick={() => window.location.href = '#/superadmin/tenants'}
                      className="add-lead-btn"
                      style={{
                        padding: '14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        height: 'auto',
                        minHeight: '0',
                        gap: '8px',
                        borderRadius: '0',
                        border: 'none',
                        background: 'var(--gradient-blue)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Play size={12} /> Launch Module
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-hover)', fontSize: '11px', color: 'var(--text-muted)', gap: '4px', fontWeight: 500 }}>
                      <Lock size={12} /> Module Locked
                    </div>
                    <button 
                      onClick={() => handleRequestAccess(app.name)}
                      className="add-lead-btn"
                      style={{
                        padding: '14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        height: 'auto',
                        minHeight: '0',
                        gap: '8px',
                        borderRadius: '0',
                        border: 'none',
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
                        color: 'var(--accent-cyan)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: '1px solid var(--border)'
                      }}
                    >
                      <ExternalLink size={12} /> Request Setup
                    </button>
                  </>
                )}
              </div>

            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
            No modules found matching filters.
          </div>
        )}
      </div>

    </div>
  );
};

export default Apps;
