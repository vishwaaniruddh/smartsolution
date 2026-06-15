import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, IndianRupee, Award } from 'lucide-react';
import { apiBaseUrl } from '../../../utils/env.js';

/* ─── Dynamic Inline SVG Charts ─── */

const SalesChart = ({ leads = [], currencySymbol = '₹' }) => {
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
  const months = pastMonths.map(pm => pm.label);

  const wonLeads = leads.filter(l => l.status === 'Closed' || l.status === 'Won');
  
  const values1 = pastMonths.map(pm => {
    const startOfMonth = new Date(pm.year, pm.month, 1, 0, 0, 0);
    const endOfMonth = new Date(pm.year, pm.month + 1, 0, 23, 59, 59);
    const monthLeads = wonLeads.filter(l => {
      if (!l.created_at) return false;
      const created = new Date(l.created_at.replace(' ', 'T'));
      return created >= startOfMonth && created <= endOfMonth;
    });
    return monthLeads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0);
  });
  
  // Competitor curve benchmark
  const values2 = [1500, 2000, 3000, 4500, 6000, 7200];

  const w = 560, h = 200, px = 50, py = 20;
  const chartW = w - px * 2, chartH = h - py * 2;
  
  // Determine max value dynamically (min limit to ensure proper axis ticks look)
  const maxVal = Math.max(...values1, ...values2, 8000);

  const toX = (i) => px + (i / (values1.length - 1)) * chartW;
  const toY = (v) => py + chartH - (v / maxVal) * chartH;

  const path1 = values1.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');
  const path2 = values2.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(v)}`).join(' ');

  const area1 = path1 + ` L${toX(values1.length - 1)},${h - py} L${px},${h - py} Z`;

  const gridLines = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const formatYLabel = (v) => {
    if (v === 0) return `${currencySymbol}0`;
    return `${currencySymbol}${(v / 1000).toFixed(1)}K`;
  };

  const formatValue = (v) => {
    return `${currencySymbol}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {/* Grid */}
      {gridLines.map(v => (
        <g key={v}>
          <line x1={px} y1={toY(v)} x2={w - px} y2={toY(v)} className="chart-grid-line" />
          <text x={px - 8} y={toY(v) + 4} textAnchor="end" className="chart-axis-label">
            {formatYLabel(v)}
          </text>
        </g>
      ))}

      {/* X axis labels */}
      {months.map((m, i) => (
        <text key={m} x={toX(i)} y={h - 2} textAnchor="middle" className="chart-axis-label">
          {m}
        </text>
      ))}

      {/* Area fill */}
      <path d={area1} fill="url(#dashBlueGrad)" className="chart-area-fill" />

      {/* Gradient */}
      <defs>
        <linearGradient id="dashBlueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Lines */}
      <path d={path2} className="chart-line chart-line-blue" opacity="0.4" />
      <path d={path1} className="chart-line chart-line-cyan" />

      {/* Dashed vertical indicator line on hover */}
      {hoveredIdx !== null && (
        <line
          x1={toX(hoveredIdx)}
          y1={py}
          x2={toX(hoveredIdx)}
          y2={h - py}
          stroke="#22d3ee"
          strokeWidth="1"
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      )}

      {/* Dots */}
      {values1.map((v, i) => (
        <circle 
          key={`dot-${i}`} 
          cx={toX(i)} 
          cy={toY(v)} 
          className="chart-dot" 
          fill="#22d3ee" 
          r={hoveredIdx === i ? 6 : 4}
          style={{ transition: 'r 0.15s ease' }}
        />
      ))}

      {/* Interactive Hover Columns */}
      {values1.map((v, i) => (
        <rect
          key={`hover-rect-${i}`}
          x={toX(i) - (chartW / (values1.length - 1)) / 2}
          y={py}
          width={chartW / (values1.length - 1)}
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
            x={toX(hoveredIdx) - 60}
            y={Math.max(toY(values1[hoveredIdx]) - 48, 2)}
            width="120"
            height="38"
            rx="6"
            fill="#0f172a"
            stroke="var(--border)"
            strokeWidth="1.5"
          />
          {/* Tooltip Text - Month */}
          <text
            x={toX(hoveredIdx)}
            y={Math.max(toY(values1[hoveredIdx]) - 35, 15)}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontWeight="600"
          >
            {months[hoveredIdx]}
          </text>
          {/* Tooltip Text - Value */}
          <text
            x={toX(hoveredIdx)}
            y={Math.max(toY(values1[hoveredIdx]) - 20, 30)}
            textAnchor="middle"
            fill="#22d3ee"
            fontSize="11"
            fontWeight="700"
          >
            {formatValue(values1[hoveredIdx])}
          </text>
        </g>
      )}
    </svg>
  );
};

const DonutChart = ({ leads = [] }) => {
  // Group leads by source dynamically
  const sourceCounts = {};
  leads.forEach(l => {
    const src = l.source || 'Other';
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });

  const total = leads.length;
  const colors = ['#3b82f6', '#22d3ee', '#8b5cf6', '#10b981', '#f59e0b', '#64748b'];
  
  const chartData = Object.keys(sourceCounts).map((src, i) => {
    const count = sourceCounts[src];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      label: src,
      value: pct,
      color: colors[i % colors.length]
    };
  }).filter(d => d.value > 0);

  // If no data, use a fallback mock representation
  const data = chartData.length > 0 ? chartData : [
    { label: 'Website', value: 40, color: '#3b82f6' },
    { label: 'Referral', value: 25, color: '#22d3ee' },
    { label: 'LinkedIn', value: 20, color: '#8b5cf6' },
    { label: 'Other', value: 15, color: '#64748b' }
  ];

  const cx = 80, cy = 80, r = 60, strokeW = 20;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut-container">
      <svg className="donut-svg" viewBox="0 0 160 160">
        {data.map((d) => {
          const dashLen = (d.value / 100) * circumference;
          const dashOff = circumference - dashLen;
          const rotation = (offset / 100) * 360 - 90;
          offset += d.value;
          return (
            <circle key={d.label}
              cx={cx} cy={cy} r={r}
              fill="none" stroke={d.color} strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${dashOff}`}
              transform={`rotate(${rotation} ${cx} ${cy})`}
              style={{ transition: 'all 0.8s ease' }}
            />
          );
        })}
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">100%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="9">Source Share</text>
      </svg>

      <div className="donut-legend">
        {data.map(d => (
          <div key={d.label} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ backgroundColor: d.color }} />
            <span style={{ fontSize: '12px' }}>{d.label}</span>
            <span className="donut-legend-value">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Dashboard Page ─── */

const Dashboard = () => {
  const userStr = localStorage.getItem('crm_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currencySymbol = currentUser?.currency_symbol || '₹';

  const [leads, setLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const leadsRes = await fetch(`${apiBaseUrl}/leads`);
      const leadsData = await leadsRes.json();
      
      const actRes = await fetch(`${apiBaseUrl}/activities`);
      const actData = await actRes.json();

      if (leadsData.success && leadsData.data) {
        setLeads(leadsData.data);
      }
      if (actData.success && actData.data) {
        setActivities(actData.data);
      }
    } catch (err) {
      console.warn('API error in Dashboard, falling back to mock data:', err);
      // Fallback mock leads
      const mockLeads = [
        { id: 1, name: 'John Smith', status: 'New', source: 'Website', value: 5000, agent: 'Emily Davis' },
        { id: 2, name: 'Sarah Chen', status: 'Contacted', source: 'Referral', value: 12500, agent: 'Emily Davis' },
        { id: 3, name: 'Michael Brown', status: 'Qualified', source: 'LinkedIn', value: 8200, agent: 'Alex Lee' },
        { id: 4, name: 'John Smith', status: 'Closed', source: 'Website', value: 15000, agent: 'Emily Davis' },
        { id: 5, name: 'Emily Davis', status: 'Qualified', source: 'LinkedIn', value: 9500, agent: 'Alex Lee' },
      ];
      setLeads(mockLeads);
      
      const mockActivities = [
        { agent_name: 'Emily Davis', activity_type: 'Call', details: 'Discussed technical onboarding.', logged_at: '2026-06-12 11:30' },
        { agent_name: 'Alex Lee', activity_type: 'Email', details: 'Sent calendar invitation.', logged_at: '2026-06-12 10:15' }
      ];
      setActivities(mockActivities);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute stats
  const totalLeads = leads.length;
  
  // Pipeline Value (Sum of New, Contacted, Qualified deals)
  const openLeads = leads.filter(l => l.status === 'New' || l.status === 'Contacted' || l.status === 'Qualified');
  const pipelineValue = openLeads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0);

  // Conversion rate (Closed Won / (Closed Won + Closed Lost))
  const closedWon = leads.filter(l => l.status === 'Closed' || l.status === 'Won');
  const closedLost = leads.filter(l => l.status === 'Lost');
  const totalClosed = closedWon.length + closedLost.length;
  const conversionRate = totalClosed > 0 
    ? ((closedWon.length / totalClosed) * 100).toFixed(1) 
    : '0.0';

  const salesDoneLeads = leads.filter(l => (l.status === 'Closed' || l.status === 'Won') && l.sales_status === 'Sales Done');
  const salesDoneValue = salesDoneLeads.reduce((sum, l) => sum + parseFloat(l.value || 0), 0);

  return (
    <div>
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card blue animate-in">
          <div className="stat-icon blue"><Users size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Leads</span>
            <h3>{totalLeads}</h3>
            <span className="stat-change">Active in database</span>
          </div>
        </div>

        <div className="stat-card green animate-in">
          <div className="stat-icon green"><TrendingUp size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Conversion Rate</span>
            <h3>{conversionRate}%</h3>
            <span className="stat-change">Won deals ratio</span>
          </div>
        </div>

        <div className="stat-card orange animate-in">
          <div className="stat-icon orange"><IndianRupee size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Sales Pipeline Value</span>
            <h3>{currencySymbol}{pipelineValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <span className="stat-change">Estimated open deals</span>
          </div>
        </div>

        <div className="stat-card purple animate-in">
          <div className="stat-icon purple"><Award size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Sales Done</span>
            <h3>{currencySymbol}{salesDoneValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
            <span className="stat-change">{salesDoneLeads.length} deals completed</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card animate-in">
          <div className="chart-header">
            <h3>Sales Trend (Last 6 Months)</h3>
            <div className="chart-toggle">
              <button className="active">Trend Overlay</button>
            </div>
          </div>
          <div className="chart-area">
            <SalesChart leads={leads} currencySymbol={currencySymbol} />
          </div>
        </div>

        <div className="chart-card animate-in">
          <div className="chart-header">
            <h3>Lead Sources Share</h3>
          </div>
          <DonutChart leads={leads} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-card animate-in">
        <h3>Recent Interactions Feed</h3>
        <table className="activity-table">
          <thead>
            <tr>
              <th>Agent / Performer</th>
              <th>Activity Detail</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {activities.length > 0 ? (
              activities.slice(0, 5).map((item, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.agent_name || 'System'}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--accent-blue)', marginRight: '8px' }}>
                      [{item.activity_type}]
                    </span>
                    {item.details}
                  </td>
                  <td>{item.logged_at}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No recent activities recorded. Log some interactions in Sales Associate workspace to see them here!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
