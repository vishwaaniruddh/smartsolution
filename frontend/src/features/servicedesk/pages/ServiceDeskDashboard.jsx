import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceDesk } from '../context/ServiceDeskContext';
import { apiBaseUrl } from '../../../utils/env.js';
import { 
  Ticket, AlertTriangle, Clock, CheckCircle2, Users, 
  TrendingUp, BarChart3, Wallet, Box, Percent, Calendar, RefreshCw 
} from 'lucide-react';

const PRIORITY_COLORS = {
  Critical: { color: 'var(--accent-red)',    bg: 'rgba(239,68,68,0.1)' },
  High:     { color: 'var(--accent-orange)', bg: 'rgba(249,115,22,0.1)' },
  Medium:   { color: 'var(--accent-yellow)', bg: 'rgba(245,158,11,0.1)' },
  Low:      { color: 'var(--text-muted)',    bg: 'rgba(255,255,255,0.05)' },
};

const STATUS_COLORS = {
  'Open':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  'In Progress': { color: 'var(--accent-orange)', bg: 'rgba(249,115,22,0.1)' },
  'On Hold':     { color: 'var(--accent-yellow)', bg: 'rgba(245,158,11,0.1)' },
  'Resolved':    { color: 'var(--accent-green)',  bg: 'rgba(16,185,129,0.1)' },
  'Closed':      { color: 'var(--text-muted)',    bg: 'rgba(255,255,255,0.05)' },
};

export default function ServiceDeskDashboard() {
  const { tenantId, user, toast } = useServiceDesk();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'reports'

  const fetchDashboardData = () => {
    setLoading(true);
    const agentId = user?.id || '';
    fetch(`${apiBaseUrl}/servicedesk/dashboard?tenant_id=${tenantId}&agent_id=${agentId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res);
        else toast.showError('Failed to load dashboard.');
      })
      .catch(() => toast.showError('Connection error.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)', gap: '10px' }}>
      <RefreshCw className="animate-spin" size={18} />
      Loading Service Desk Dashboard...
    </div>
  );

  const kpis = data?.kpis || {};
  const priority_counts = data?.priority_counts || {};
  const recent_activity = data?.recent_activity || [];
  const my_queue = data?.my_queue || [];
  const category_counts = data?.category_counts || [];
  const daily_trend = data?.daily_trend || [];
  const reports = data?.reports || {
    total_materials_requested: 0,
    total_materials_delivered: 0,
    total_funds_requested: 0,
    total_funds_paid: 0,
    sla_met: 0,
    sla_breached: 0
  };

  const kpiCards = [
    { label: 'Total Open',     value: kpis.total_open || 0,     icon: Ticket,        color: '#60a5fa',                gradient: 'rgba(96,165,250,0.15)' },
    { label: 'SLA Breached',   value: kpis.sla_breached || 0,   icon: AlertTriangle, color: 'var(--accent-red)',      gradient: 'rgba(239,68,68,0.15)' },
    { label: 'Resolved Today', value: kpis.resolved_today || 0, icon: CheckCircle2,  color: 'var(--accent-green)',    gradient: 'rgba(16,185,129,0.15)' },
    { label: 'Unassigned',     value: kpis.unassigned || 0,     icon: Users,         color: 'var(--accent-yellow)',   gradient: 'rgba(245,158,11,0.15)' },
  ];

  const actLabels = {
    ticket_created:    '🎫 Ticket created',
    status_changed:    '🔄 Status changed',
    assigned:          '👤 Assigned to',
    comment_added:     '💬 Comment added',
    internal_note_added: '🔒 Internal note',
    priority_changed:  '⚡ Priority changed',
    schedule_updated:  '📅 Visit schedule updated',
    schedule_confirmed: '✅ Visit schedule confirmed',
    material_requested: '📦 Material requested',
    material_status_changed: '🔄 Material status updated',
    fund_requested: '💰 Fund request created',
    fund_status_changed: '🔄 Fund status updated'
  };

  // Calculations for Reports
  const totalSla = reports.sla_met + reports.sla_breached;
  const slaComplianceRate = totalSla > 0 ? Math.round((reports.sla_met / totalSla) * 100) : 100;
  
  const materialDeliveryRate = reports.total_materials_requested > 0 
    ? Math.round((reports.total_materials_delivered / reports.total_materials_requested) * 100) 
    : 100;

  const fundPayoutRate = reports.total_funds_requested > 0
    ? Math.round((reports.total_funds_paid / reports.total_funds_requested) * 100)
    : 0;

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tab Header & Quick Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{
              background: activeTab === 'overview' ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none', 
              color: activeTab === 'overview' ? 'var(--text-white)' : 'var(--text-muted)',
              padding: '8px 16px', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 600, 
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            style={{
              background: activeTab === 'reports' ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none', 
              color: activeTab === 'reports' ? 'var(--text-white)' : 'var(--text-muted)',
              padding: '8px 16px', 
              borderRadius: 'var(--radius-md)', 
              fontWeight: 600, 
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            Reports & Analytics
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/feature/servicedesk/tickets')} className="add-lead-btn" style={{ fontSize: '13px', height: '34px', minHeight: 0 }}>
            <Ticket size={14} style={{ marginRight: '6px' }} /> View Tickets
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            {kpiCards.map(({ label, value, icon: Icon, color, gradient }) => (
              <div key={label} style={{
                background: `linear-gradient(135deg, ${gradient}, rgba(255,255,255,0.02))`,
                border: `1px solid ${color}33`,
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                </div>
                <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-white)', lineHeight: 1 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Status + Priority row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Status Breakdown */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={16} style={{ color: '#60a5fa' }} /> Status Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(STATUS_COLORS).map(([status, { color, bg }]) => {
                  const key = status.toLowerCase().replace(/ /g, '_');
                  const val = kpis[key] || 0;
                  const total = (kpis.total_open || 0) + (kpis.resolved || 0) + (kpis.closed || 0);
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                        <span style={{ color, fontWeight: 700 }}>{val}</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', borderRadius: '3px', background: color, width: `${pct}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--accent-orange)' }} /> Open by Priority
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {['Critical', 'High', 'Medium', 'Low'].map(p => {
                  const { color, bg } = PRIORITY_COLORS[p];
                  const val = priority_counts[p] || 0;
                  return (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '10px', background: bg, color, minWidth: '68px', textAlign: 'center' }}>{p}</span>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', borderRadius: '4px', background: color, width: `${Math.min(val * 10, 100)}%`, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-white)', minWidth: '24px', textAlign: 'right' }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* My Queue + Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* My Queue */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ticket size={16} style={{ color: 'var(--accent-cyan)' }} /> My Queue
                <span style={{ fontSize: '11px', fontWeight: 600, background: 'rgba(34,211,238,0.1)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '10px', marginLeft: 'auto' }}>{my_queue.length} tickets</span>
              </div>
              {my_queue.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>🎉 No tickets in your queue</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {my_queue.map(t => (
                    <div key={t.id} onClick={() => navigate(`/feature/servicedesk/tickets/${t.id}`)}
                      style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 700 }}>{t.ticket_number}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '8px', background: PRIORITY_COLORS[t.priority]?.bg, color: PRIORITY_COLORS[t.priority]?.color }}>{t.priority}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.subject}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: 'var(--accent-purple)' }} /> Recent Activity
              </div>
              {recent_activity.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>No activity yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                  {recent_activity.map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', marginTop: '5px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`/feature/servicedesk/tickets/${a.ticket_id}`)}>
                            {a.ticket_number}
                          </span>
                          {' — '}{actLabels[a.action] || a.action}
                          {a.new_value && <span style={{ color: 'var(--text-white)', fontWeight: 600 }}> {a.new_value}</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>by {a.actor_name} • {new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          {category_counts.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} /> Open Tickets by Category
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {category_counts.map(c => (
                  <div key={c.category} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.category}</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-white)' }}>{c.cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Reports Analytics KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* SLA Compliance */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(255,255,255,0.01))',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Percent size={20} />
              </div>
              <div>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-white)', display: 'block', lineHeight: 1.1 }}>{slaComplianceRate}%</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>SLA Compliance Rate</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reports.sla_met} Met / {reports.sla_breached} Breached</span>
              </div>
            </div>

            {/* Material Fulfilment */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(255,255,255,0.01))',
              border: '1px solid rgba(34,211,238,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                <Box size={20} />
              </div>
              <div>
                <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-white)', display: 'block', lineHeight: 1.1 }}>{materialDeliveryRate}%</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Material Fulfillment Rate</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{reports.total_materials_delivered} Delivered of {reports.total_materials_requested} Req</span>
              </div>
            </div>

            {/* Cash Fund Disbursed */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(255,255,255,0.01))',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <Wallet size={20} />
              </div>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-white)', display: 'block', lineHeight: 1.1 }}>₹{parseFloat(reports.total_funds_paid).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Disbursed Cash Funds ({fundPayoutRate}%)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requested: ₹{parseFloat(reports.total_funds_requested).toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
              </div>
            </div>

          </div>

          {/* Ticket Trends Chart */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: 'var(--accent-cyan)' }} /> Ticket Creation Trend (Last 14 Days)
              </span>
            </div>
            
            {daily_trend.length === 0 ? (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No trend data available for the last 14 days.
              </div>
            ) : (
              <div>
                {/* Visual Chart Area */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  {(() => {
                    const maxTrendVal = Math.max(...daily_trend.map(t => t.cnt), 1);
                    return daily_trend.map(t => {
                      const pctHeight = (t.cnt / maxTrendVal) * 100;
                      return (
                        <div key={t.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-white)', fontWeight: 700, position: 'absolute', bottom: `${pctHeight + 4}%`, opacity: t.cnt > 0 ? 1 : 0 }}>{t.cnt}</span>
                            <div style={{
                              height: `${Math.max(4, pctHeight)}%`,
                              width: '16px',
                              background: 'linear-gradient(180deg, var(--accent-cyan) 0%, rgba(34,211,238,0.2) 100%)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease',
                              cursor: 'pointer'
                            }} title={`${t.day}: ${t.cnt} tickets`} />
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {new Date(t.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* SLA Performance & Financial/Material Fulfillment side-by-side details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            
            {/* SLA Detailed Audit */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Percent size={16} style={{ color: 'var(--accent-green)' }} /> SLA Compliance breakdown
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Met SLA Limit</span>
                    <strong style={{ color: 'var(--accent-green)' }}>{reports.sla_met} Tickets ({slaComplianceRate}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', background: 'var(--accent-green)', borderRadius: '4px', width: `${slaComplianceRate}%` }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Breached SLA Limit</span>
                    <strong style={{ color: 'var(--accent-red)' }}>{reports.sla_breached} Tickets ({100 - slaComplianceRate}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', background: 'var(--accent-red)', borderRadius: '4px', width: `${100 - slaComplianceRate}%` }} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  💡 SLA deadlines are configured based on ticket priority: Critical (4h), High (12h), Medium (24h), and Low (72h). Resolved and closed tickets determine final adherence metrics.
                </div>
              </div>
            </div>

            {/* Fund & Material Resource Flow */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={16} style={{ color: 'var(--accent-cyan)' }} /> Resource Allocations
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Material Delivery Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Material Deliveries</span>
                    <strong style={{ color: 'var(--text-white)' }}>{reports.total_materials_delivered} of {reports.total_materials_requested} Delivered ({materialDeliveryRate}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', background: 'var(--accent-cyan)', borderRadius: '4px', width: `${materialDeliveryRate}%` }} />
                  </div>
                </div>

                {/* Fund Payout Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Petty Cash Disbursements</span>
                    <strong style={{ color: 'var(--text-white)' }}>₹{reports.total_funds_paid} of ₹{reports.total_funds_requested} Paid ({fundPayoutRate}%)</strong>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div style={{ height: '100%', background: '#f59e0b', borderRadius: '4px', width: `${fundPayoutRate}%` }} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Pending Materials</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-yellow)' }}>{reports.total_materials_requested - reports.total_materials_delivered} Items</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Pending Cash Amount</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-yellow)' }}>₹{(reports.total_funds_requested - reports.total_funds_paid).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
