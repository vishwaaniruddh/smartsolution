import React, { useState, useEffect } from 'react';
import { apiBaseUrl } from '../../../utils/env.js';

/* Horizontal bar chart grouped by Sales Agent */
const TeamPerformance = ({ leads = [], users = [] }) => {
  // Get list of agents from users, or fallback to unique agents in leads (except 'Unassigned')
  let agents = users.map(u => `${u.first_name} ${u.last_name}`);
  if (agents.length === 0) {
    const leadAgents = Array.from(new Set(leads.map(l => l.agent).filter(a => a && a !== 'Unassigned')));
    agents = leadAgents.length > 0 ? leadAgents : ['No Agents'];
  }
  
  const performanceData = agents.map(agent => {
    const agentLeads = leads.filter(l => l.agent === agent);
    const won = agentLeads.filter(l => l.status === 'Closed' || l.status === 'Won').length;
    const open = agentLeads.filter(l => l.status === 'New' || l.status === 'Contacted' || l.status === 'Qualified').length;
    return { name: agent, won, open };
  });

  const maxVal = Math.max(...performanceData.map(t => t.won + t.open), 5); // Fallback to 5 to avoid division by zero and look decent

  return (
    <div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-cyan)' }} /> Won Deals
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-blue)' }} /> Open Leads
        </div>
      </div>
      {performanceData.map(t => (
        <div className="bar-row" key={t.name}>
          <span className="bar-label" style={{ width: '120px', textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.name}>
            {t.name}
          </span>
          <div className="bar-track">
            <div className="bar-fill won" style={{ width: `${(t.won / maxVal) * 100}%` }} />
            <div className="bar-fill open" style={{ width: `${(t.open / maxVal) * 100}%`, borderRadius: '0 4px 4px 0' }} />
          </div>
          <span className="bar-value" style={{ width: '80px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
            {t.won} W / {t.open} O
          </span>
        </div>
      ))}
    </div>
  );
};

/* Monthly Revenue Line Chart */
const RevenueChart = ({ leads = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const getPast6Months = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      result.push({
        label: monthNames[m.getMonth()],
        month: m.getMonth(),
        year: m.getFullYear()
      });
    }
    return result;
  };

  const pastMonths = getPast6Months();
  const wonLeads = leads.filter(l => l.status === 'Closed' || l.status === 'Won');
  
  const values = pastMonths.map(pm => {
    const endOfMonth = new Date(pm.year, pm.month + 1, 0, 23, 59, 59);
    const cumulativeLeads = wonLeads.filter(l => {
      if (!l.created_at) return false;
      const created = new Date(l.created_at.replace(' ', 'T'));
      return created <= endOfMonth;
    });
    return cumulativeLeads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0);
  });

  const w = 440, h = 180;
  const pxLeft = 55, pxRight = 15;
  const pyTop = 20, pyBottom = 20;
  const chartW = w - pxLeft - pxRight;
  const chartH = h - pyTop - pyBottom;
  const maxVal = Math.max(...values, 1000); // minimum scale is ₹1,000

  const toX = (i) => pxLeft + (i / (values.length - 1)) * chartW;
  const toY = (v) => pyTop + chartH - (v / maxVal) * chartH;

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  const area = path + ` L${toX(values.length - 1)},${h - pyBottom} L${pxLeft},${h - pyBottom} Z`;

  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';

  const formatYLabel = (val) => {
    if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(0)}K`;
    return `${currencySymbol}${val.toFixed(0)}`;
  };

  const formatValue = (v) => {
    return `${currencySymbol}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const yTicks = [0, maxVal * 0.333, maxVal * 0.666, maxVal];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="reportsRevGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tickVal, index) => (
        <g key={index}>
          <line x1={pxLeft} y1={toY(tickVal)} x2={w - pxRight} y2={toY(tickVal)} className="chart-grid-line" />
          <text x={pxLeft - 8} y={toY(tickVal) + 4} textAnchor="end" className="chart-axis-label">
            {formatYLabel(tickVal)}
          </text>
        </g>
      ))}
      {pastMonths.map((m, i) => (
        <text key={m.label} x={toX(i)} y={h - 2} textAnchor="middle" className="chart-axis-label">{m.label}</text>
      ))}
      <path d={area} fill="url(#reportsRevGrad)" />
      <path d={path} className="chart-line chart-line-cyan" />

      {/* Dashed vertical indicator line on hover */}
      {hoveredIdx !== null && (
        <line
          x1={toX(hoveredIdx)}
          y1={pyTop}
          x2={toX(hoveredIdx)}
          y2={h - pyBottom}
          stroke="#22d3ee"
          strokeWidth="1"
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      )}

      {/* Dots */}
      {values.map((v, i) => (
        <circle 
          key={i} 
          cx={toX(i)} 
          cy={toY(v)} 
          className="chart-dot" 
          fill="#22d3ee" 
          r={hoveredIdx === i ? 5 : 3.5}
          style={{ transition: 'r 0.15s ease' }}
        />
      ))}

      {/* Interactive Hover Columns */}
      {values.map((v, i) => (
        <rect
          key={`hover-rect-${i}`}
          x={toX(i) - (chartW / (values.length - 1)) / 2}
          y={pyTop}
          width={chartW / (values.length - 1)}
          height={chartH}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        />
      ))}

      {/* Tooltip Overlay */}
      {hoveredIdx !== null && (
        <g pointerEvents="none">
          {/* Card background */}
          <rect
            x={toX(hoveredIdx) - 55}
            y={Math.max(toY(values[hoveredIdx]) - 42, 2)}
            width="110"
            height="34"
            rx="5"
            fill="#0f172a"
            stroke="var(--border)"
            strokeWidth="1"
          />
          {/* Tooltip Text - Month */}
          <text
            x={toX(hoveredIdx)}
            y={Math.max(toY(values[hoveredIdx]) - 30, 14)}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="9"
            fontWeight="600"
          >
            {pastMonths[hoveredIdx].label}
          </text>
          {/* Tooltip Text - Value */}
          <text
            x={toX(hoveredIdx)}
            y={Math.max(toY(values[hoveredIdx]) - 18, 26)}
            textAnchor="middle"
            fill="#22d3ee"
            fontSize="10"
            fontWeight="700"
          >
            {formatValue(values[hoveredIdx])}
          </text>
        </g>
      )}
    </svg>
  );
};

/* Funnel Chart showing lead status conversion levels */
const ConversionFunnel = ({ leads = [] }) => {
  const totalLeads = leads.length;
  const contacted = leads.filter(l => l.status !== 'New').length;
  const qualified = leads.filter(l => l.status === 'Qualified' || l.status === 'Closed' || l.status === 'Won').length;
  const closedWon = leads.filter(l => l.status === 'Closed' || l.status === 'Won').length;

  const getPercentage = (sub, total) => {
    if (total === 0) return 0;
    return Math.round((sub / total) * 100);
  };

  const steps = [
    { label: `Total Leads (${totalLeads})`, pct: 100, color: '#3b82f6' },
    { label: `Contacted (${contacted})`, pct: getPercentage(contacted, totalLeads), color: '#22d3ee' },
    { label: `Qualified (${qualified})`, pct: getPercentage(qualified, contacted), color: '#8b5cf6' },
    { label: `Closed-Won (${closedWon})`, pct: getPercentage(closedWon, qualified), color: '#10b981' },
  ];

  return (
    <div className="funnel-container">
      {steps.map((s, i) => (
        <div className="funnel-step" key={i}>
          <div className="funnel-bar"
            style={{
              width: `${100 - i * 14}%`,
              background: s.color,
              clipPath: `polygon(0 0, 100% 0, 97% 100%, 3% 100%)`
            }}
          >
            {s.pct}%
          </div>
          <span className="funnel-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

/* Heatmap based on logged activity counts */
const ActivityHeatmap = ({ activities = [] }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const times = ['9AM', '12PM', '1PM', '4PM', '5PM', '6PM'];
  const matrix = Array(6).fill(0).map(() => Array(5).fill(0));

  const getTimeIndex = (hour) => {
    if (hour < 11) return 0; // 9AM slot
    if (hour < 13) return 1; // 12PM slot
    if (hour < 15) return 2; // 1PM slot
    if (hour < 17) return 3; // 4PM slot
    if (hour < 18) return 4; // 5PM slot
    return 5; // 6PM slot
  };

  activities.forEach(act => {
    if (!act.logged_at) return;
    const date = new Date(act.logged_at.replace(' ', 'T'));
    const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (day >= 1 && day <= 5) {
      const dayIdx = day - 1;
      const hour = date.getHours();
      const timeIdx = getTimeIndex(hour);
      matrix[timeIdx][dayIdx] += 1;
    }
  });

  const maxCount = Math.max(...matrix.map(row => Math.max(...row)), 1);

  const getColor = (v) => {
    const alpha = 0.15 + v * 0.85;
    return `rgba(34, 211, 238, ${alpha})`;
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days.length}, 1fr)`, gap: '3px', marginBottom: '4px' }}>
        <div />
        {days.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>
      {matrix.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: `40px repeat(${days.length}, 1fr)`, gap: '3px', marginBottom: '3px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '6px' }}>
            {times[ri]}
          </div>
          {row.map((count, ci) => {
            const scaledVal = count / maxCount;
            const cellColor = count === 0 ? 'rgba(255, 255, 255, 0.03)' : getColor(scaledVal);
            return (
              <div
                key={ci}
                className="heatmap-cell"
                style={{ background: cellColor, height: '28px', borderRadius: '4px', transition: 'background 0.3s ease' }}
                title={`${days[ci]} ${times[ri]}: ${count} activity/activities`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};


/* Sales Status Breakdown */
const SalesStatusBreakdown = ({ leads = [] }) => {
  const converted = leads.filter(l => l.status === 'Closed' || l.status === 'Won');
  const total = converted.length;
  const done = converted.filter(l => l.sales_status === 'Sales Done').length;
  const pending = converted.filter(l => !l.sales_status || l.sales_status === 'Pending').length;
  const notDone = converted.filter(l => l.sales_status === 'Not Done').length;

  const getPercentage = (count) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  const pctDone = getPercentage(done);
  const pctPending = getPercentage(pending);
  const pctNotDone = getPercentage(notDone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        Total Converted Deals: <strong style={{ color: 'var(--text-white)' }}>{total}</strong>
      </div>
      
      {/* Progress visual bar */}
      <div style={{ display: 'flex', height: '24px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-hover)' }}>
        {done > 0 && <div style={{ width: `${pctDone}%`, background: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 600 }} title="Sales Done">{pctDone}%</div>}
        {pending > 0 && <div style={{ width: `${pctPending}%`, background: 'var(--accent-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 600 }} title="Pending">{pctPending}%</div>}
        {notDone > 0 && <div style={{ width: `${pctNotDone}%`, background: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 600 }} title="Not Done">{pctNotDone}%</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-green)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Sales Done</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>{done} ({pctDone}%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-orange)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Pending</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>{pending} ({pctPending}%)</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-red)' }} />
            <span style={{ color: 'var(--text-primary)' }}>Not Done</span>
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>{notDone} ({pctNotDone}%)</span>
        </div>
      </div>
    </div>
  );
};

/* Reports Screen */
const Reports = () => {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = fetch(`${apiBaseUrl}/leads`)
      .then(res => res.json())
      .catch(err => {
        console.warn('API error fetching leads for reports:', err);
        return { success: false };
      });

    const fetchUsers = fetch(`${apiBaseUrl}/users`)
      .then(res => res.json())
      .catch(err => {
        console.warn('API error fetching users for reports:', err);
        return { success: false };
      });

    const fetchActivities = fetch(`${apiBaseUrl}/activities`)
      .then(res => res.json())
      .catch(err => {
        console.warn('API error fetching activities for reports:', err);
        return { success: false };
      });

    Promise.all([fetchLeads, fetchUsers, fetchActivities])
      .then(([leadsData, usersData, activitiesData]) => {
        if (leadsData.success && leadsData.data) {
          setLeads(leadsData.data);
        }
        if (usersData.success && usersData.data) {
          setUsers(usersData.data);
        }
        if (activitiesData.success && activitiesData.data) {
          setActivities(activitiesData.data);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--text-muted)' }}>
        Loading reports analytics...
      </div>
    );
  }

  return (
    <div>
      <div className="reports-header">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-white)' }}>
            Sales &amp; Leads Analytics Reports
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Live performance indicators and conversion metrics calculated from database deals.
          </p>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-card animate-in">
          <h3>Agent Deals Performance (Won vs. Open)</h3>
          <TeamPerformance leads={leads} users={users} />
        </div>

        <div className="report-card animate-in">
          <h3>Monthly Revenue Growth (Last 6 Months)</h3>
          <div className="report-chart-area">
            <RevenueChart leads={leads} />
          </div>
        </div>

        <div className="report-card animate-in">
          <h3>Lead Funnel Conversion Rates</h3>
          <ConversionFunnel leads={leads} />
        </div>

        <div className="report-card animate-in">
          <h3>Call &amp; Interaction Activity Heatmap</h3>
          <ActivityHeatmap activities={activities} />
        </div>

        <div className="report-card animate-in">
          <h3>Sales Finalization Status Breakdown</h3>
          <SalesStatusBreakdown leads={leads} />
        </div>
      </div>
    </div>
  );
};

export default Reports;
