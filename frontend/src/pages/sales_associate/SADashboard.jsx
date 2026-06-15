import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Target, Award, ListTodo, FileText, CheckCircle2 } from 'lucide-react';

const SADashboard = () => {
  const { activeAgent } = useOutletContext();
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';

  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Define target for the simulated agent
  const salesTarget = 40000; // ₹40,000 monthly quota

  useEffect(() => {
    setLoading(true);
    // Fetch leads, tasks, and activities
    const fetchAllData = async () => {
      try {
        const leadsRes = await fetch('http://localhost/lead/api/leads.php');
        const leadsData = await leadsRes.json();
        
        const tasksRes = await fetch(`http://localhost/lead/api/tasks.php?agent_name=${encodeURIComponent(activeAgent)}`);
        const tasksData = await tasksRes.json();
        
        const actRes = await fetch(`http://localhost/lead/api/activities.php?agent_name=${encodeURIComponent(activeAgent)}`);
        const actData = await actRes.json();

        if (leadsData.success) {
          // Filter leads by active agent
          const agentLeads = leadsData.data.filter(l => l.agent === activeAgent);
          setLeads(agentLeads);
        }
        if (tasksData.success) {
          setTasks(tasksData.data);
        }
        if (actData.success) {
          setActivities(actData.data);
        }
      } catch (err) {
        console.warn('API error in SA Dashboard, falling back to mock metrics:', err);
        // Fallback local mock data specific to the agent
        const mockLeads = [
          { name: 'Acme Corp', value: 8000, status: 'Closed', agent: 'Emily Davis' },
          { name: 'TechFlow', value: 12500, status: 'Contacted', agent: 'Emily Davis' },
          { name: 'Apex Org', value: 9200, status: 'Qualified', agent: 'Emily Davis' },
          { name: 'Global Tech', value: 15000, status: 'Closed', agent: 'Emily Davis' },
          { name: 'Delta Co', value: 3400, status: 'Lost', agent: 'Emily Davis' },
          { name: 'Alpha Inc', value: 11000, status: 'Closed', agent: 'Alex Lee' },
          { name: 'Sigma Ventures', value: 4500, status: 'New', agent: 'Alex Lee' },
          { name: 'Next Gen', value: 18000, status: 'Qualified', agent: 'Sarah Connor' },
        ];
        
        const mockTasks = [
          { title: 'Follow up on onboarding', due_date: '2026-06-14', status: 'Pending', agent_name: 'Emily Davis', lead_name: 'Acme Corp' },
          { title: 'Send contract proposal', due_date: '2026-06-15', status: 'Pending', agent_name: 'Emily Davis', lead_name: 'TechFlow' },
          { title: 'Review requirements doc', due_date: '2026-06-12', status: 'Completed', agent_name: 'Emily Davis', lead_name: 'Apex Org' },
        ];

        const mockActs = [
          { lead_id: 1, agent_name: 'Emily Davis', activity_type: 'Call', details: 'Discussed technical requirements and pricing.', logged_at: '2026-06-12 11:30:00' },
          { lead_id: 2, agent_name: 'Emily Davis', activity_type: 'Email', details: 'Sent product onboarding slide deck.', logged_at: '2026-06-11 14:15:00' }
        ];

        setLeads(mockLeads.filter(l => l.agent === activeAgent));
        setTasks(mockTasks.filter(t => t.agent_name === activeAgent));
        setActivities(mockActs.filter(a => a.agent_name === activeAgent));
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [activeAgent]);

  // Calculate Metrics
  const activeLeads = leads.filter(l => l.status !== 'Closed' && l.status !== 'Lost');
  const closedWonLeads = leads.filter(l => l.status === 'Closed' || l.status === 'Won');
  const closedLostLeads = leads.filter(l => l.status === 'Lost');
  
  const closedRevenue = closedWonLeads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0);
  
  const totalClosedDeals = closedWonLeads.length + closedLostLeads.length;
  const winRate = totalClosedDeals > 0 
    ? Math.round((closedWonLeads.length / totalClosedDeals) * 100) 
    : 0;

  const pendingTasks = tasks.filter(t => t.status === 'Pending');

  // Quota percentage
  const targetPct = Math.min(Math.round((closedRevenue / salesTarget) * 100), 100);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-white)' }}>
          Welcome back, {activeAgent}!
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Here is your personal performance metrics and checklist for today.
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon blue"><Target /></div>
          <div className="stat-info">
            <span className="stat-label">Active Opportunities</span>
            <h3>{activeLeads.length}</h3>
            <span className="stat-change">Nurturing pipeline</span>
          </div>
        </div>
        
        <div className="stat-card green">
          <div className="stat-icon green"><Award /></div>
          <div className="stat-info">
            <span className="stat-label">Closed-Won Revenue</span>
            <h3>{currencySymbol}{closedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <span className="stat-change">Quota: {currencySymbol}{salesTarget.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="stat-card orange">
          <div className="stat-icon orange"><ListTodo /></div>
          <div className="stat-info">
            <span className="stat-label">Tasks Pending</span>
            <h3>{pendingTasks.length}</h3>
            <span className="stat-change">Due soon</span>
          </div>
        </div>
      </div>

      <div className="charts-row">
        {/* TARGET PROGRESS CARD */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales Quota Target Progress</h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)' }}>
              {targetPct}% Achieved
            </span>
          </div>
          
          <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Current Revenue: <strong>{currencySymbol}{closedRevenue.toLocaleString()}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>Target Quota: <strong>{currencySymbol}{salesTarget.toLocaleString()}</strong></span>
            </div>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '16px', background: 'var(--bg-hover)', borderRadius: '999px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${targetPct}%`, 
                  height: '100%', 
                  background: 'var(--gradient-blue)', 
                  borderRadius: '999px',
                  transition: 'width 1s ease-out' 
                }} 
              />
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {salesTarget - closedRevenue > 0 
                ? `You are ${currencySymbol}${(salesTarget - closedRevenue).toLocaleString()} away from your monthly target. Keep pushing!` 
                : 'Congratulations! You have exceeded your monthly sales quota! 🎉'}
            </div>
            
            {/* Conversion Mini Funnel */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Personal Lead Conversion</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '80px', fontSize: '12px', color: 'var(--text-muted)' }}>Assigned:</span>
                  <div style={{ flex: 1, background: 'var(--bg-hover)', height: '20px', borderRadius: '4px', position: 'relative' }}>
                    <div style={{ background: 'var(--accent-blue)', height: '100%', width: '100%', borderRadius: '4px 0 0 4px', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'white' }}>{leads.length} Leads</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '80px', fontSize: '12px', color: 'var(--text-muted)' }}>Won Deals:</span>
                  <div style={{ flex: 1, background: 'var(--bg-hover)', height: '20px', borderRadius: '4px', position: 'relative' }}>
                    <div style={{ background: 'var(--accent-green)', height: '100%', width: `${leads.length > 0 ? (closedWonLeads.length / leads.length) * 100 : 0}%`, borderRadius: '4px 0 0 4px', minWidth: '24px', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'white' }}>{closedWonLeads.length} Won</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)' }}>{winRate}% Win</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TASKS DUE TODAY & RECENT FEED */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="chart-header" style={{ marginBottom: 0 }}>
            <h3>Tasks & Reminders</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingTasks.length > 0 ? (
              pendingTasks.slice(0, 4).map((task, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h5 style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{task.title}</h5>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Lead: {task.lead_name || 'General'} | Due: {task.due_date}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
                No pending tasks. You are all caught up!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY LOG FEED */}
      <div className="activity-card" style={{ marginTop: '24px' }}>
        <h3>Your Recent Logged Interactions</h3>
        <div style={{ padding: '16px 24px' }}>
          {activities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activities.slice(0, 5).map((act, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: act.activity_type === 'Call' ? 'var(--accent-blue)' : act.activity_type === 'Email' ? 'var(--accent-orange)' : 'var(--accent-green)',
                      marginTop: '6px'
                    }} />
                    {i < activities.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{act.activity_type} logged</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{act.logged_at}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{act.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '12px' }}>
              No interaction activities logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SADashboard;
