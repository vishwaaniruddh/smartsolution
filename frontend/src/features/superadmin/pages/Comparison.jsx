import React, { useState } from 'react';
import { 
  Scale, Check, X, Info, Layers, CircleDollarSign, 
  CheckSquare, Zap, Building, HelpCircle, ArrowRight, 
  Award, ShieldAlert, Sparkles, TrendingUp, DollarSign
} from 'lucide-react';

const Comparison = () => {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'deepdive' | 'analytics'
  const [matrixFilter, setMatrixFilter] = useState('All'); // 'All' | 'Core CRM' | 'Advanced' | 'Security'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tabs for the Deep Dive section
  const [deepDiveTab, setDeepDiveTab] = useState('payments'); // 'payments' | 'webforms' | 'workspace' | 'pricing'

  // Calculator state
  const [userCount, setUserCount] = useState(25);
  const [selectedBlueprintPhase, setSelectedBlueprintPhase] = useState(1);

  // Platform scores for radar chart (max 100)
  const platformScores = {
    sar: { name: 'SAR Workforce', color: '#22d3ee', fill: 'rgba(34, 211, 238, 0.15)', stroke: '#22d3ee', lead_mgmt: 82, value: 96, ease: 92, payments: 98, pipeline: 90, autonomy: 95 },
    hubspot: { name: 'HubSpot', color: '#ff7a59', fill: 'rgba(255, 122, 89, 0.15)', stroke: '#ff7a59', lead_mgmt: 98, value: 40, ease: 95, payments: 45, pipeline: 95, autonomy: 85 },
    zoho: { name: 'Zoho CRM', color: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e', lead_mgmt: 92, value: 78, ease: 70, payments: 50, pipeline: 88, autonomy: 80 },
    odoo: { name: 'Odoo CRM', color: '#a855f7', fill: 'rgba(168, 85, 247, 0.15)', stroke: '#a855f7', lead_mgmt: 88, value: 82, ease: 62, payments: 65, pipeline: 85, autonomy: 75 }
  };

  const [selectedRadarPlatform, setSelectedRadarPlatform] = useState('sar');

  // Matrix data structure
  const comparisonFeatures = [
    // Core CRM Features
    {
      id: 'lead-tracking',
      category: 'Core CRM',
      name: 'Lead Tracking & Progression',
      desc: 'Track leads from creation to conversion with customizable pipeline stages and audit logs.',
      sar: { status: 'excellent', text: 'Full Kanban, custom pipelines, logs' },
      hubspot: { status: 'excellent', text: 'Highly visual drag-&-drop' },
      zoho: { status: 'good', text: 'Detailed tracking but cluttered UI' },
      odoo: { status: 'good', text: 'Basic Kanban, modular setup required' }
    },
    {
      id: 'agent-workspace',
      category: 'Core CRM',
      name: 'Agent-Scoped Workspaces',
      desc: 'Role-based access limiting Sales Associates to their own leads, tasks, and pipelines.',
      sar: { status: 'excellent', text: 'Built-in role shielding' },
      hubspot: { status: 'good', text: 'Available on paid team plans' },
      zoho: { status: 'good', text: 'Configurable via profiles' },
      odoo: { status: 'fair', text: 'Requires group permissions config' }
    },
    {
      id: 'lead-sources',
      category: 'Core CRM',
      name: 'Lead Source ROI Management',
      desc: 'Track and analyze lead conversion rates and revenue generated per marketing source.',
      sar: { status: 'excellent', text: 'Dynamic sources, direct ROI reports' },
      hubspot: { status: 'excellent', text: 'Excellent multi-touch attribution' },
      zoho: { status: 'good', text: 'Standard source analytics' },
      odoo: { status: 'fair', text: 'Basic tracking via UTM codes' }
    },
    {
      id: 'b2b-hierarchy',
      category: 'Core CRM',
      name: 'B2B Account & Contact Hierarchy',
      desc: 'Map multiple contacts to a single parent company account with visual structural trees.',
      sar: { status: 'fair', text: 'Simple schema lookup; manual pairing' },
      hubspot: { status: 'excellent', text: 'Excellent visual account-contact link' },
      zoho: { status: 'excellent', text: 'Robust Accounts vs Contacts modules' },
      odoo: { status: 'excellent', text: 'Unified parent/child contacts structure' }
    },
    {
      id: 'lead-forms',
      category: 'Core CRM',
      name: 'Embeddable Web Lead Forms',
      desc: 'Visual form builder creating HTML forms to embed on websites and capture leads automatically.',
      sar: { status: 'poor', text: 'No native code-free form generator' },
      hubspot: { status: 'excellent', text: 'Drag-and-drop webform creator' },
      zoho: { status: 'excellent', text: 'Web-to-Lead form wizard' },
      odoo: { status: 'good', text: 'Website builder contact form sync' }
    },
    {
      id: 'round-robin',
      category: 'Core CRM',
      name: 'Auto-Routing & Round-Robin',
      desc: 'Automatic lead assignment to active agents using round-robin, territories, or load capacity.',
      sar: { status: 'fair', text: 'Manual assignment/delegation only' },
      hubspot: { status: 'excellent', text: 'Advanced routing workflows' },
      zoho: { status: 'excellent', text: 'Assignment rules with criteria' },
      odoo: { status: 'good', text: 'Basic round-robin CRM rules' }
    },
    {
      id: 'email-sync',
      category: 'Core CRM',
      name: 'Two-Way Email Box Sync',
      desc: 'Sync agent Gmail/Outlook via IMAP/OAuth to automatically log email history on lead timelines.',
      sar: { status: 'poor', text: 'No native IMAP/OAuth inbox tracking' },
      hubspot: { status: 'excellent', text: 'Seamless Gmail/Outlook sync' },
      zoho: { status: 'excellent', text: 'Zoho Mail / IMAP sync' },
      odoo: { status: 'good', text: 'Mail server alias tracking' }
    },
    // Advanced CRM Features
    {
      id: 'partial-payments',
      category: 'Advanced',
      name: 'Partial Payment & Milestones',
      desc: 'Record multiple partial payments and track paid vs outstanding amounts per lead.',
      sar: { status: 'excellent', text: 'Native milestone ledger per deal' },
      hubspot: { status: 'poor', text: 'Requires custom integrations' },
      zoho: { status: 'fair', text: 'Requires Zoho Books integration' },
      odoo: { status: 'good', text: 'Possible via Sales module sync' }
    },
    {
      id: 'payment-methods',
      category: 'Advanced',
      name: 'Multi-Method Payment Ledger',
      desc: 'Log cash, bank transfer, UPI, credit card, and cheques directly inside CRM.',
      sar: { status: 'excellent', text: 'Native logging and receipts' },
      hubspot: { status: 'fair', text: 'Limited to Stripe/HubSpot Pay' },
      zoho: { status: 'good', text: 'Supported via Zoho Pay integrations' },
      odoo: { status: 'excellent', text: 'Wide payment gateways support' }
    },
    {
      id: 'voip-calling',
      category: 'Advanced',
      name: 'VoIP Click-to-Call',
      desc: 'Make voice calls directly from CRM browser and auto-save audio records on lead cards.',
      sar: { status: 'poor', text: 'Requires external phone; no logs' },
      hubspot: { status: 'excellent', text: 'Native browser calling & recording' },
      zoho: { status: 'excellent', text: 'Built-in Zoho PhoneBridge dialer' },
      odoo: { status: 'good', text: 'Asterisk / VoIP integration module' }
    },
    {
      id: 'signatures',
      category: 'Advanced',
      name: 'Document Signatures (e-Sign)',
      desc: 'Native digital signature workflows to sign contracts and auto-close won deals.',
      sar: { status: 'poor', text: 'No document signature verification' },
      hubspot: { status: 'excellent', text: 'Native HubSpot Signatures' },
      zoho: { status: 'good', text: 'Integrated Zoho Sign module' },
      odoo: { status: 'excellent', text: 'Native Sign application module' }
    },
    {
      id: 'crm-quotes',
      category: 'Advanced',
      name: 'Product Quotations in CRM',
      desc: 'Compile itemized product deals pulling from active Inventory and converting directly to PDF.',
      sar: { status: 'fair', text: 'Quotes created manually in Accounting' },
      hubspot: { status: 'excellent', text: 'Quotes module with Stripe sync' },
      zoho: { status: 'excellent', text: 'Integrated quotes and PDF engine' },
      odoo: { status: 'excellent', text: 'Seamless CRM to Sales quote flow' }
    },
    {
      id: 'lead-scoring',
      category: 'Advanced',
      name: 'Rule-Based Lead Scoring',
      desc: 'Automatically calculate a hotness ranking (0-100) based on lead activities and attributes.',
      sar: { status: 'poor', text: 'No automatic activity or lead scoring' },
      hubspot: { status: 'excellent', text: 'Predictive ML lead scoring' },
      zoho: { status: 'excellent', text: 'Zia AI lead prediction scores' },
      odoo: { status: 'good', text: 'Custom rule-based scoring module' }
    },
    {
      id: 'email-sequences',
      category: 'Advanced',
      name: 'Automated Sales Sequences',
      desc: 'Set up auto-triggered follow-up emails and drip campaigns based on pipeline stage transitions.',
      sar: { status: 'poor', text: 'No native sequence/drip email triggers' },
      hubspot: { status: 'excellent', text: 'Highly sophisticated sales sequence builder' },
      zoho: { status: 'excellent', text: 'Zoho Cadences and drip campaign triggers' },
      odoo: { status: 'good', text: 'Marketing campaign drip modules' }
    },
    {
      id: 'pipeline-forecasting',
      category: 'Advanced',
      name: 'Pipeline Forecasting & Weighted Goals',
      desc: 'Predict sales revenue using stage-weighted deal values and historical close probabilities.',
      sar: { status: 'poor', text: 'Manual spreadsheets only; no close metrics' },
      hubspot: { status: 'excellent', text: 'Predictive deal forecasting reports' },
      zoho: { status: 'excellent', text: 'AI close probability forecasting' },
      odoo: { status: 'good', text: 'Stage-weighted deal probability matrix' }
    },
    {
      id: 'cost-structure',
      category: 'Advanced',
      name: 'Cost Structure & Multi-Tenancy',
      desc: 'Flat enterprise licensing with unlimited/scalable users vs per-user licensing taxes.',
      sar: { status: 'excellent', text: 'Flat multi-tenant org license' },
      hubspot: { status: 'poor', text: 'Extremely high per-user cost scaling' },
      zoho: { status: 'fair', text: 'Per-user scaling with feature walls' },
      odoo: { status: 'good', text: 'Odoo One pricing is reasonable' }
    },
    // Security & Trust Features
    {
      id: 'sso-mfa',
      category: 'Security',
      name: 'SAML SSO & Multi-Factor Auth (MFA)',
      desc: 'Enforce single sign-on integration (Google Workspace, Okta) and mandatory authenticator app 2FA.',
      sar: { status: 'poor', text: 'Simple passwords only; no native MFA or SAML SSO' },
      hubspot: { status: 'excellent', text: 'Mandatory 2FA enforcement, SAML SSO integration' },
      zoho: { status: 'excellent', text: 'Zoho Accounts SSO, MFA, active session limits' },
      odoo: { status: 'good', text: 'SAML/OAuth providers config, MFA module support' }
    },
    {
      id: 'field-audit',
      category: 'Security',
      name: 'Field-Level Change History Logs',
      desc: 'Track and review past values, editors, and timestamps for every individual data field change.',
      sar: { status: 'poor', text: 'Pipeline state logs only; no field history tracking' },
      hubspot: { status: 'excellent', text: 'Property history tracking for all data fields' },
      zoho: { status: 'excellent', text: 'Detailed field audit trail reporting' },
      odoo: { status: 'good', text: 'Chatter logs field revisions, custom track active fields' }
    },
    {
      id: 'backup-dr',
      category: 'Security',
      name: 'Daily redundant backups & SLA Uptime',
      desc: 'Ensure system availability with 99.9% uptime SLA commitments and daily encrypted backup archives.',
      sar: { status: 'poor', text: 'Manual server database dumps; no SLA uptime commitment' },
      hubspot: { status: 'excellent', text: 'Hourly encrypted backups, multi-region failovers' },
      zoho: { status: 'excellent', text: 'Automated daily backups, hot-standby DR setup' },
      odoo: { status: 'good', text: 'Odoo.sh automated daily backups and restore logs' }
    },
    {
      id: 'api-throttling',
      category: 'Security',
      name: 'API Rate Throttling & Granular Token Scopes',
      desc: 'Prevent denial of service attacks with strict API limits and define narrow read/write key permissions.',
      sar: { status: 'poor', text: 'Basic endpoint authentication; no rate limiting' },
      hubspot: { status: 'excellent', text: 'Granular OAuth scopes, standard request limits' },
      zoho: { status: 'excellent', text: 'Fine-grained api scopes, daily client rate limits' },
      odoo: { status: 'good', text: 'Standard key permissions, simple call rate control' }
    }
  ];

  // Helper to render rating badges
  const renderRating = (val) => {
    switch (val.status) {
      case 'excellent':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: 'var(--accent-green)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <Check size={12} strokeWidth={3} /> Excellent
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>{val.text}</span>
          </div>
        );
      case 'good':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: 'rgba(59, 130, 246, 0.15)', 
              color: 'var(--accent-blue)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <Check size={12} /> Good
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>{val.text}</span>
          </div>
        );
      case 'fair':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: 'rgba(245, 158, 11, 0.15)', 
              color: 'var(--accent-yellow)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.2)'
            }}>
              <Info size={12} /> Fair
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>{val.text}</span>
          </div>
        );
      case 'poor':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: 'rgba(239, 68, 68, 0.15)', 
              color: 'var(--accent-red)', 
              padding: '2px 8px', 
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <X size={12} strokeWidth={3} /> Limited
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>{val.text}</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Filter matrix items
  const filteredFeatures = comparisonFeatures.filter(feature => {
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          feature.desc.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (matrixFilter === 'All') return matchesSearch;
    return matchesSearch && feature.category === matrixFilter;
  });

  // Calculate pricing comparison details
  const getPricingData = () => {
    const sarCost = 150; // Flat monthly cost
    const hubspotCost = Math.round(500 + userCount * 90); // Starter bundle + extra user seats
    const zohoCost = Math.round(userCount * 40); // Enterprise level
    const odooCost = Math.round(userCount * 25); // Odoo online pricing standard

    return [
      { name: 'SAR Workforce', cost: sarCost, type: 'Flat Platform Fee', color: 'var(--accent-cyan)' },
      { name: 'Odoo CRM', cost: odooCost, type: '€24.90/User/Mo + App Cost', color: 'var(--accent-purple)' },
      { name: 'Zoho CRM', cost: zohoCost, type: '$40/User/Mo Enterprise', color: 'var(--accent-green)' },
      { name: 'HubSpot CRM', cost: hubspotCost, type: '$90/User/Mo Enterprise', color: 'var(--accent-orange)' }
    ];
  };

  // Calculate Radar coordinates
  const getRadarPoints = (platform) => {
    const center = 150;
    const maxRadius = 100;
    const scores = platformScores[platform];
    
    // 6 metrics: lead_mgmt, value, ease, payments, pipeline, autonomy
    const keys = ['lead_mgmt', 'value', 'ease', 'payments', 'pipeline', 'autonomy'];
    const points = keys.map((key, i) => {
      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2; // Offset by -90deg so first is at top
      const val = scores[key];
      const r = (val / 100) * maxRadius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="stat-card cyan" onClick={() => { setActiveTab('matrix'); setMatrixFilter('All'); }}>
          <div className="stat-icon cyan">
            <Sparkles size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">CRM Feature Match Rate</div>
            <h3>45.0%</h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>9 of 20 standard capabilities</span>
          </div>
        </div>

        <div className="stat-card green" onClick={() => setActiveTab('analytics')}>
          <div className="stat-icon green">
            <CircleDollarSign size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Relative Cost Efficiency</div>
            <h3>91%</h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-green)' }}>Cost savings vs HubSpot</span>
          </div>
        </div>

        <div className="stat-card blue" onClick={() => { setActiveTab('deepdive'); setDeepDiveTab('webforms'); }}>
          <div className="stat-icon blue">
            <CheckSquare size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Core CRM Coverage</div>
            <h3>5 / 8</h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-blue)' }}>Lead & Sales pipeline depth</span>
          </div>
        </div>

        <div className="stat-card red" onClick={() => { setActiveTab('deepdive'); setDeepDiveTab('security'); }}>
          <div className="stat-icon red">
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Security & Trust Alignment</div>
            <h3>0 / 4</h3>
            <span style={{ fontSize: '12px', color: 'var(--accent-red)' }}>Enterprise compliance score</span>
          </div>
        </div>
      </div>

      {/* Main Tab Controller */}
      <div className="scrollable-tabs-container">
        <button
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'matrix' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'matrix' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Feature Matrix
        </button>
        <button
          onClick={() => setActiveTab('deepdive')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'deepdive' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'deepdive' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Ecosystem Deep-Dive
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'analytics' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Market Positioning & Costs
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          style={{
            padding: '10px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roadmap' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeTab === 'roadmap' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Strategic Betterment Roadmap
        </button>
      </div>

      {/* TAB CONTENT: MATRIX */}
      {activeTab === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header & Filter Controls */}
          <div className="leads-page-header" style={{ marginBottom: 0 }}>
            <div className="scrollable-filters-container">
              {['All', 'Core CRM', 'Advanced', 'Security'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMatrixFilter(cat)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-md)',
                    background: matrixFilter === cat ? 'var(--bg-hover)' : 'transparent',
                    color: matrixFilter === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    border: matrixFilter === cat ? '1px solid var(--accent-cyan)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat} Features
                </button>
              ))}
            </div>

            <div className="leads-toolbar" style={{ margin: 0 }}>
              <div className="leads-search">
                <input
                  type="text"
                  placeholder="Search comparison matrix..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="leads-table-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="leads-table" style={{ width: '100%', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Capability / Feature</th>
                    <th style={{ width: '18.75%', textAlign: 'center', color: 'var(--accent-cyan)' }}>Our CRM</th>
                    <th style={{ width: '18.75%', textAlign: 'center' }}>Odoo CRM</th>
                    <th style={{ width: '18.75%', textAlign: 'center' }}>HubSpot CRM</th>
                    <th style={{ width: '18.75%', textAlign: 'center' }}>Zoho CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>{item.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.desc}</span>
                        </div>
                      </td>
                      <td style={{ background: 'rgba(34, 211, 238, 0.02)', borderLeft: '1px solid rgba(34, 211, 238, 0.1)', borderRight: '1px solid rgba(34, 211, 238, 0.1)' }}>
                        {renderRating(item.sar)}
                      </td>
                      <td>{renderRating(item.odoo)}</td>
                      <td>{renderRating(item.hubspot)}</td>
                      <td>{renderRating(item.zoho)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Key Takeaways */}
          <div style={{ 
            background: 'rgba(34, 211, 238, 0.05)', 
            border: '1px dashed rgba(34, 211, 238, 0.2)', 
            padding: '20px', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} /> Key CRM Advantage Highlights
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              <div>
                <strong>🥇 Milestone Payments:</strong> While Odoo/Zoho require separate modular setup or external books, and HubSpot has no native support, we support multi-method partial payments built straight into the lead card.
              </div>
              <div>
                <strong>📊 Role Visibility Shielding:</strong> Standard CRM platforms charge extra to customize view/edit privileges per agent. Our workspace restricts agents to their assigned leads automatically by design.
              </div>
              <div>
                <strong>💸 Total Cost Ownership:</strong> Standard CRM suites demand $40-$100+ per user per month. Our platform uses a flat organizational licensing system, eliminating user seat tax.
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: DEEP DIVE TABS */}
      {activeTab === 'deepdive' && (
        <div className="comparison-deepdive-layout">
          
          {/* Left Sub-Navigation */}
          <div className="comparison-subnav-container">
            <button
              onClick={() => setDeepDiveTab('payments')}
              className={`comparison-subnav-btn ${deepDiveTab === 'payments' ? 'active' : ''}`}
            >
              <span>Milestone & Payments Ledger</span>
              <ArrowRight size={14} className="subnav-arrow" style={{ opacity: deepDiveTab === 'payments' ? 1 : 0 }} />
            </button>
            
            <button
              onClick={() => setDeepDiveTab('webforms')}
              className={`comparison-subnav-btn ${deepDiveTab === 'webforms' ? 'active' : ''}`}
            >
              <span>Webforms & Auto-Routing</span>
              <ArrowRight size={14} className="subnav-arrow" style={{ opacity: deepDiveTab === 'webforms' ? 1 : 0 }} />
            </button>
 
            <button
              onClick={() => setDeepDiveTab('workspace')}
              className={`comparison-subnav-btn ${deepDiveTab === 'workspace' ? 'active' : ''}`}
            >
              <span>Agent Workspace Shielding</span>
              <ArrowRight size={14} className="subnav-arrow" style={{ opacity: deepDiveTab === 'workspace' ? 1 : 0 }} />
            </button>
 
            <button
              onClick={() => setDeepDiveTab('pricing')}
              className={`comparison-subnav-btn ${deepDiveTab === 'pricing' ? 'active' : ''}`}
            >
              <span>Licensing Structure Dynamics</span>
              <ArrowRight size={14} className="subnav-arrow" style={{ opacity: deepDiveTab === 'pricing' ? 1 : 0 }} />
            </button>
 
            <button
              onClick={() => setDeepDiveTab('security')}
              className={`comparison-subnav-btn ${deepDiveTab === 'security' ? 'active' : ''}`}
            >
              <span>Security, Trust & Reliability</span>
              <ArrowRight size={14} className="subnav-arrow" style={{ opacity: deepDiveTab === 'security' ? 1 : 0 }} />
            </button>
          </div>
 
          {/* Right Detail Pane */}
          <div className="comparison-detail-pane">
            
            {deepDiveTab === 'payments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Milestone & Partial Payments Ledger</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>How each platform manages payments received during the lead acquisition stage.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="comparison-grid-2col">
                    <div style={{ background: 'rgba(34, 211, 238, 0.03)', border: '1px solid rgba(34, 211, 238, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>Our Implementation</span>
                      <h4 style={{ color: 'var(--text-primary)', margin: '4px 0 8px', fontSize: '14px' }}>Native Multi-Method Ledger</h4>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Each lead has an embedded Payments Ledger. Managers can log payments (Cash, Bank Transfer, UPI, Credit Card, Cheque), assign receipts, and track partial milestone receipts. The lead's total value, received payment, and payment status (Unpaid/Partial/Paid) update automatically.
                      </p>
                    </div>

                    <div style={{ background: 'rgba(255, 122, 89, 0.03)', border: '1px solid rgba(255, 122, 89, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700, textTransform: 'uppercase' }}>HubSpot CRM</span>
                      <h4 style={{ color: 'var(--text-primary)', margin: '4px 0 8px', fontSize: '14px' }}>Stripe-Centric invoices Only</h4>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        HubSpot relies on HubSpot Payments (Stripe) or external invoices. It has no native multi-method partial payment ledger attached directly to standard deal object records. Out-of-band payment milestones are difficult to log without high-tier custom schemas.
                      </p>
                    </div>
                  </div>

                  <div className="comparison-grid-2col">
                    <div style={{ background: 'rgba(168, 85, 247, 0.03)', border: '1px solid rgba(168, 85, 247, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 700, textTransform: 'uppercase' }}>Odoo CRM</span>
                      <h4 style={{ color: 'var(--text-primary)', margin: '4px 0 8px', fontSize: '14px' }}>Module-Dependent Flow</h4>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Odoo CRM handles payments only when linked to Sales and Invoicing modules. If running CRM as a standalone module, milestone tracking is absent, requiring full-suite installation and workflow routing.
                      </p>
                    </div>

                    <div style={{ background: 'rgba(34, 197, 94, 0.03)', border: '1px solid rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: 700, textTransform: 'uppercase' }}>Zoho CRM</span>
                      <h4 style={{ color: 'var(--text-primary)', margin: '4px 0 8px', fontSize: '14px' }}>Zoho Books Integration Needed</h4>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Zoho CRM does not have a native transaction ledger for leads. Users must purchase and configure Zoho Books, then sync quotes and invoices. Standalone tracking is manual via custom text fields.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deepDiveTab === 'webforms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Webforms & Auto-Routing Systems</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Automating inbound lead ingestion and distribution channels.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ color: 'var(--accent-cyan)', fontSize: '13.5px', fontWeight: 600 }}>The Inbound Automation Deficit</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
                      Currently, our CRM relies on manual lead creation or manager delegation. We lack two key pillars of a scalable CRM:
                    </p>
                    <ul style={{ paddingLeft: '20px', margin: '10px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li><strong>Embeddable Webforms:</strong> Competitors let non-technical users build custom web contact forms that map submissions directly to lead fields. We require custom code or API hooks to ingest leads from external websites.</li>
                      <li><strong>Round-Robin assignment:</strong> Competitors automatically distribute leads to active sales representatives using territories or load balancing. Our system relies on manual dashboard delegation.</li>
                    </ul>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="leads-table" style={{ fontSize: '12px', minWidth: '700px' }}>
                      <thead>
                        <tr>
                          <th>Lead Capture & Routing Feature</th>
                          <th>SAR Workforce</th>
                          <th>Odoo</th>
                          <th>HubSpot</th>
                          <th>Zoho</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Webform Creator</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>None (Manual/Custom API)</td>
                          <td style={{ color: 'var(--accent-green)' }}>Website form drag-&-drop</td>
                          <td style={{ color: 'var(--accent-green)' }}>Visual form builder</td>
                          <td style={{ color: 'var(--accent-green)' }}>Web-to-lead wizard</td>
                        </tr>
                        <tr>
                          <td><strong>Assignment Rules</strong></td>
                          <td style={{ color: 'var(--accent-yellow)' }}>Manual Delegation only</td>
                          <td style={{ color: 'var(--accent-green)' }}>Basic CRM rules</td>
                          <td style={{ color: 'var(--accent-green)' }}>Advanced routing workflows</td>
                          <td style={{ color: 'var(--accent-green)' }}>Criteria assignment & territories</td>
                        </tr>
                        <tr>
                          <td><strong>Third-party Webhooks</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>None (Requires dev config)</td>
                          <td style={{ color: 'var(--accent-green)' }}>Supported via app hooks</td>
                          <td style={{ color: 'var(--accent-green)' }}>Robust API & native Zapier</td>
                          <td style={{ color: 'var(--accent-green)' }}>Zoho Flow & Webhooks</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {deepDiveTab === 'workspace' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Agent Workspace Shielding</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Data privacy and role security configurations.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  <p>
                    Security controls must ensure that junior agents do not access sensitive client data, company reports, or accounts. 
                  </p>
                  
                  <div className="comparison-grid-workspace" style={{ marginTop: '10px' }}>
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', marginBottom: '8px' }}>Security & Visibility Levels</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ background: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                          <strong>Superadmin:</strong> Platform-wide tenant management and global analytical overview.
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                          <strong>Admin & Manager:</strong> Full visibility of all tenant leads, delegations, sources, and accounting settings.
                        </div>
                        <div style={{ background: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                          <strong>Sales Associate (SA):</strong> Restrictive filter. Agents can only see, edit, and progression-track leads assigned to them.
                        </div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Comparison vs Competitors</h4>
                      <div>
                        <strong>SAR CRM:</strong> Access shielding is baked directly into the data models. A single boolean query filter ensures Sales Associates are locked out of general tenant data. No complex permissions to set up.
                      </div>
                      <div>
                        <strong>HubSpot:</strong> User permissions can be set to "Owned only". However, team dashboards, pricing pages, and pipeline setups are sometimes visible unless locked behind Professional/Enterprise tier permissions.
                      </div>
                      <div>
                        <strong>Odoo:</strong> Leverages Postgres-level security groups. Extremely detailed but requires complex access rights settings (security XML rules) which often break during updates.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {deepDiveTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Licensing Structure Dynamics</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Flat fees vs per-seat escalating taxes.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="comparison-grid-3col">
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>THE "USER TAX"</span>
                      <h4 style={{ color: 'var(--accent-red)', margin: '6px 0', fontSize: '16px' }}>Per-Seat Scaling</h4>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        HubSpot, Zoho, and Odoo charge on a per-user, per-month basis. Inviting your warehouse team or support agents to coordinate with sales results in a compounding monthly bill.
                      </p>
                    </div>
                    
                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>FEATURE GATING</span>
                      <h4 style={{ color: 'var(--accent-orange)', margin: '6px 0', fontSize: '16px' }}>Tier Lockouts</h4>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        Accessing custom properties (HubSpot), custom functions (Zoho), or custom fields requires upgrading the entire team subscription tier, forcing massive budget hikes.
                      </p>
                    </div>

                    <div style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>INTEGRATION COSTS</span>
                      <h4 style={{ color: 'var(--accent-yellow)', margin: '6px 0', fontSize: '16px' }}>Connector Fees</h4>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        Connecting HubSpot CRM to an external inventory system often requires Zapier, custom developer hours, or premium integration sync licenses ($100-$300/mo).
                      </p>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(34, 211, 238, 0.03)', border: '1px solid rgba(34, 211, 238, 0.1)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '12.5px' }}>
                    <h4 style={{ color: 'var(--accent-cyan)', fontSize: '14px', marginBottom: '8px' }}>SAR Workforce CRM Flat Licensing Model</h4>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      We offer a single flat organization license that provisions the CRM workspace for all agents. Organizations can scale their sales force from 5 to 500 users with zero seat taxes or tier lockout penalties. Since the platform operates on a multi-tenant framework, managers can assign roles and manage pipelines without billing penalties per login.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {deepDiveTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>Security, Trust & Reliability Gaps</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>How competitors build enterprise trust and protect customer data vs our gaps.</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <h4 style={{ color: 'var(--accent-red)', fontSize: '13.5px', fontWeight: 600 }}>Why Enterprise Clients Can't Trust Our Current System</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.6' }}>
                      Security is not just a feature; it is the foundation of client trust. Comparing our system against HubSpot, Zoho, and Odoo reveals severe structural deficits:
                    </p>
                    <ul style={{ paddingLeft: '20px', margin: '10px 0 0', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <li><strong>No MFA/SSO:</strong> We lack multi-factor authentication and SAML single sign-on. Users only authenticate with basic passwords, leaving tenant accounts vulnerable to brute force and credential stuffing.</li>
                      <li><strong>No Field-Level Change Logs:</strong> While we log stage transitions, we do not log individual field changes (e.g., if an agent changes a contact's phone number or budget, there is no historical record of who edited what or when).</li>
                      <li><strong>No Redundant Backups or SLA:</strong> We do not offer automated hot-standby database replication or self-serve recovery portals. Backups are manual server snapshots with no disaster recovery guarantees.</li>
                      <li><strong>API Rate Throttling Deficits:</strong> We do not rate-limit API keys or enforce granular token permissions, leaving endpoints vulnerable to resource exhaustion (DoS) attacks.</li>
                    </ul>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="leads-table" style={{ fontSize: '12px', minWidth: '700px' }}>
                      <thead>
                        <tr>
                          <th>Security & Compliance Dimension</th>
                          <th>SAR Workforce</th>
                          <th>Odoo</th>
                          <th>HubSpot</th>
                          <th>Zoho</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Auth Security</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>Basic passwords; No SSO/MFA</td>
                          <td>SAML, Google/MS OAuth, MFA supported</td>
                          <td style={{ color: 'var(--accent-green)' }}>SSO, Mandatory 2FA enforcement</td>
                          <td style={{ color: 'var(--accent-green)' }}>SSO, MFA, IP & Session restrictions</td>
                        </tr>
                        <tr>
                          <td><strong>Audit Trails</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>State logs only; no field history</td>
                          <td>Revisions logged in chatter feed</td>
                          <td style={{ color: 'var(--accent-green)' }}>Field-level history database</td>
                          <td style={{ color: 'var(--accent-green)' }}>Full audit trails & exportable reports</td>
                        </tr>
                        <tr>
                          <td><strong>DR & Backup SLA</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>Manual dumps; No SLA guarantee</td>
                          <td>Odoo.sh automated daily backups</td>
                          <td style={{ color: 'var(--accent-green)' }}>Hourly backups, 99.99% SLA</td>
                          <td style={{ color: 'var(--accent-green)' }}>Daily backups, hot-standby replication</td>
                        </tr>
                        <tr>
                          <td><strong>API Defenses</strong></td>
                          <td style={{ color: 'var(--accent-red)' }}>Basic authentication only</td>
                          <td>Standard key scoping</td>
                          <td style={{ color: 'var(--accent-green)' }}>Granular OAuth scopes & throttling</td>
                          <td style={{ color: 'var(--accent-green)' }}>Fine-grained scopes & daily limits</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS & CHARTS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="comparison-charts-layout">
            
            {/* Visual 1: Dimensions Comparison Radar */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>CRM Capabilities Assessment Radar</h3>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {Object.keys(platformScores).map(key => (
                    <button
                      key={key}
                      onClick={() => setSelectedRadarPlatform(key)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        borderRadius: '4px',
                        border: '1px solid ' + (selectedRadarPlatform === key ? platformScores[key].color : 'var(--border)'),
                        background: selectedRadarPlatform === key ? 'rgba(255,255,255,0.05)' : 'transparent',
                        color: selectedRadarPlatform === key ? platformScores[key].color : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      {platformScores[key].name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', width: '100%' }}>
                <svg viewBox="0 0 300 300" style={{ width: '100%', height: 'auto', maxWidth: '300px' }}>
                  {/* Radar Axes and Web Circles */}
                  {[20, 40, 60, 80, 100].map((r) => {
                    // Draw web circles
                    const points = [];
                    for (let i = 0; i < 6; i++) {
                      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                      const x = 150 + r * Math.cos(angle);
                      const y = 150 + r * Math.sin(angle);
                      points.push(`${x},${y}`);
                    }
                    return (
                      <polygon
                        key={r}
                        points={points.join(' ')}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray={r === 100 ? 'none' : '3,3'}
                      />
                    );
                  })}

                  {/* Draw Axis Lines */}
                  {Array.from({ length: 6 }).map((_, i) => {
                    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                    const x = 150 + 100 * Math.cos(angle);
                    const y = 150 + 100 * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1="150"
                        y1="150"
                        x2={x}
                        y2={y}
                        stroke="var(--border)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Axis Labels */}
                  {(() => {
                    const labels = [
                      { text: 'Lead Management', x: 150, y: 35, anchor: 'middle' },
                      { text: 'Value for Money', x: 250, y: 95, anchor: 'start' },
                      { text: 'Ease of Use', x: 250, y: 215, anchor: 'start' },
                      { text: 'Payments & Ledger', x: 150, y: 275, anchor: 'middle' },
                      { text: 'Sales Pipeline', x: 50, y: 215, anchor: 'end' },
                      { text: 'Agent Autonomy', x: 50, y: 95, anchor: 'end' }
                    ];
                    return labels.map((lbl) => (
                      <text
                        key={lbl.text}
                        x={lbl.x}
                        y={lbl.y}
                        fill="var(--text-secondary)"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor={lbl.anchor}
                        fontFamily="Inter"
                      >
                        {lbl.text}
                      </text>
                    ));
                  })()}

                  {/* Static Shapes of platforms in background (translucent lines) */}
                  {Object.keys(platformScores).map(pKey => {
                    if (pKey === selectedRadarPlatform) return null;
                    return (
                      <polygon
                        key={pKey}
                        points={getRadarPoints(pKey)}
                        fill="none"
                        stroke={platformScores[pKey].stroke}
                        strokeWidth="1"
                        opacity="0.3"
                      />
                    );
                  })}

                  {/* Active Selected Platform Radar Polygon */}
                  <polygon
                    points={getRadarPoints(selectedRadarPlatform)}
                    fill={platformScores[selectedRadarPlatform].fill}
                    stroke={platformScores[selectedRadarPlatform].stroke}
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.4s ease' }}
                  />

                  {/* Vertices indicator dots */}
                  {(() => {
                    const keys = ['lead_mgmt', 'value', 'ease', 'payments', 'pipeline', 'autonomy'];
                    const scores = platformScores[selectedRadarPlatform];
                    return keys.map((key, i) => {
                      const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                      const val = scores[key];
                      const r = (val / 100) * 100;
                      const x = 150 + r * Math.cos(angle);
                      const y = 150 + r * Math.sin(angle);
                      return (
                        <circle
                          key={key}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="var(--bg-card)"
                          stroke={scores.stroke}
                          strokeWidth="2"
                          style={{ transition: 'all 0.4s ease' }}
                        />
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>

            {/* Visual 2: Cost Scaling Calculator & Chart */}
            <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="chart-header">
                  <h3>Monthly Cost Scaling Calculator</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Slide to adjust tenant user count</span>
                </div>
                
                {/* User slider */}
                <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Active Workspace Users</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{userCount} Users</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    value={userCount}
                    onChange={(e) => setUserCount(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: 'var(--accent-cyan)',
                      background: 'var(--border-light)',
                      height: '6px',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>5 Users</span>
                    <span>50 Users</span>
                    <span>100 Users</span>
                    <span>150 Users</span>
                  </div>
                </div>

                {/* Bars Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {getPricingData().map((item) => {
                    // Max cost for scaling bars width (let max correspond to HubSpot cost at 150 users: ~14000)
                    const maxVal = Math.round(500 + 150 * 90);
                    const percentage = Math.max(8, (item.cost / maxVal) * 100);
                    return (
                      <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                          <span style={{ fontWeight: 700, color: item.color }}>${item.cost.toLocaleString()} / mo</span>
                        </div>
                        <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${percentage}%`, 
                            height: '100%', 
                            background: item.color, 
                            borderRadius: '6px',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{item.type}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ 
                borderTop: '1px solid var(--border)', 
                paddingTop: '14px', 
                marginTop: '16px', 
                fontSize: '11px', 
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={14} style={{ color: 'var(--accent-yellow)' }} />
                <span>Note: Competitor pricing estimates reflect standard enterprise list tiers, excluding onboarding fees or custom support packages.</span>
              </div>
            </div>
            
          </div>
          
          {/* Detailed Market Positioning Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <span style={{ color: 'var(--accent-orange)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>vs HubSpot</span>
              <h4 style={{ color: 'var(--text-primary)', margin: '6px 0', fontSize: '14px' }}>Eliminate the "Seat Tax"</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                HubSpot forces upgrades by locking core features (like teams, custom reporting, and custom object attributes) behind high-tier monthly packages ($1,200/mo+ starting) and escalating per-user licensing taxes. Our flat-tier module catalog provides ultimate feature access at one fixed price.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <span style={{ color: 'var(--accent-purple)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>vs Odoo</span>
              <h4 style={{ color: 'var(--text-primary)', margin: '6px 0', fontSize: '14px' }}>Zero-friction configuration</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Odoo CRM requires manual package mapping, module routing configuration, and database maintenance. Simple connections like converting a won opportunity into a milestone payments invoice require complex database configurations. Our ERP integrations are built-in from day one.
              </p>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <span style={{ color: 'var(--accent-green)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>vs Zoho CRM</span>
              <h4 style={{ color: 'var(--text-primary)', margin: '6px 0', fontSize: '14px' }}>Modern, clean UI / UX</h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Zoho CRM has a cluttered, dated interface and separates features into disjointed applications (Zoho Books, Zoho Creator, Zoho People), causing database fragmentation. We offer a unified tenant-wide layout and modern interface (glassmorphism) that improves agent productivity.
              </p>
            </div>
            
          </div>

        </div>
      )}

      {/* TAB CONTENT: BETTERMENT ROADMAP */}
      {activeTab === 'roadmap' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Executive Pitch Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)', 
            border: '1px solid rgba(245, 158, 11, 0.2)', 
            padding: '24px', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '20px'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(245, 158, 11, 0.15)', 
              color: 'var(--accent-yellow)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              flexShrink: 0
            }}>
              <ShieldAlert size={24} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ color: 'var(--text-white)', fontSize: '16px', fontWeight: 700 }}>Honest Product CRM Gaps</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                While our CRM excels at visual Kanban tracking, agent access shielding, and milestone payments ledger, it has critical functional gaps in automation and communications. Outlining these gaps transparently is essential for planning our CRM development investments.
              </p>
            </div>
          </div>

          {/* Roadmap Phases Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '20px' }}>
            
            {/* Phase 1 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.2)' }}>PHASE 1 (CRITICAL)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inbound & Access Security</span>
              </div>
              <h4 style={{ color: 'var(--text-white)', fontSize: '15px', fontWeight: 600 }}>Webforms, Routing & Basic MFA</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Automate the initial intake of inbound opportunities and enforce account security.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                <li><strong>Embeddable Form Builder:</strong> Let users visual-build forms to embed on external websites.</li>
                <li><strong>Auto-Routing Algorithms:</strong> Automatically distribute leads via round-robin assignment.</li>
                <li><strong>MFA Authenticator Apps:</strong> Implement mandatory Google/Microsoft Authenticator app 2FA.</li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>PHASE 2 (HIGH)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Communications & Audit</span>
              </div>
              <h4 style={{ color: 'var(--text-white)', fontSize: '15px', fontWeight: 600 }}>Email/VoIP Sync & Field Auditing</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Increase sales agent productivity while tracking field-level changes.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                <li><strong>Two-Way Email Sync:</strong> Connect Gmail/Outlook via IMAP to log history on lead cards.</li>
                <li><strong>VoIP Click-to-Call:</strong> Native browser dialing with automated call recordings.</li>
                <li><strong>Field-Level Change Logs:</strong> Audit trails tracking historical values for all lead properties.</li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(59, 130, 246, 0.2)' }}>PHASE 3 (MEDIUM)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enterprise Scale & DR</span>
              </div>
              <h4 style={{ color: 'var(--text-white)', fontSize: '15px', fontWeight: 600 }}>e-Sign, SLA Backups & SAML SSO</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Support corporate security standards and automate deal contracts closing.
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
                <li><strong>SAML SSO Integration:</strong> Authenticate users using enterprise identity providers (Okta, Google Workspace).</li>
                <li><strong>Automated Backup Recovery:</strong> Daily hot-standby backups with SLA-guaranteed system recovery.</li>
                <li><strong>Quote PDF & e-Signature:</strong> Visual quote PDF builder and integrated digital contract signatures.</li>
              </ul>
            </div>

          </div>

          {/* Blueprint Selector Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <h3 style={{ color: 'var(--text-white)', fontSize: '18px', fontWeight: 700 }}>Technical Implementation Blueprints</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Select a phase below to inspect the step-by-step development specifications, database schema modifications, and UI/UX design directives.
            </p>
          </div>

          {/* Selector Tabs */}
          <div className="scrollable-tabs-container" style={{ 
            background: 'var(--bg-sidebar)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-md)', 
            padding: '4px',
            gap: '6px',
            alignItems: 'center',
            width: 'fit-content',
            maxWidth: '100%'
          }}>
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedBlueprintPhase(num)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedBlueprintPhase === num ? 'var(--bg-hover)' : 'transparent',
                  color: selectedBlueprintPhase === num ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                Phase {num} Specifications
              </button>
            ))}
          </div>

          {/* Detailed Specifications Panel */}
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {selectedBlueprintPhase === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h4 style={{ color: 'var(--accent-cyan)', fontSize: '16px', fontWeight: 700 }}>Phase 1: Inbound Automation & Access Security</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '4px' }}>
                    Critical focus on visual lead ingestion tools, automated routing distribution, and securing login boundaries.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
                  {/* UI UX design specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase' }}>1. UI/UX DESIGN SPEC</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>Visual Form Builder & MFA Screen</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>Canvas Area:</strong> Center grid displaying fields like Name, Email, Custom input fields; left sidebar containing draggable field objects.</li>
                      <li><strong>Embed Code Drawer:</strong> Slide-out drawer rendering iframe copy codes.</li>
                      <li><strong>TOTP QR Portal:</strong> Setup screen displaying base64 QR code and key secret with verify input.</li>
                    </ul>
                  </div>

                  {/* Backend & API specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700, textTransform: 'uppercase' }}>2. BACKEND & API SERVICES</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>Ingestion Endpoint & Auto Routing</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>POST /api/webforms/submit/:formId:</strong> Webhook endpoint validating CSRF-exempt inputs, parsing metadata, and instantiating Lead records.</li>
                      <li><strong>TOTP Verification Middleware:</strong> Auth controller verifying OTP codes using speakeasy library.</li>
                      <li><strong>Round-Robin Assign service:</strong> Background job fetching active agent queue indices and auto-assigning lead owner IDs.</li>
                    </ul>
                  </div>
                </div>

                {/* Database changes */}
                <div style={{ background: 'rgba(34, 211, 238, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(34, 211, 238, 0.2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>3. DATABASE SCHEMA MODIFICATIONS (SQL Blueprint)</span>
                  <pre style={{ 
                    marginTop: '10px', 
                    fontSize: '11.5px', 
                    color: 'var(--text-primary)', 
                    background: 'var(--bg-body)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)', 
                    overflowX: 'auto',
                    fontFamily: 'Courier New, monospace',
                    lineHeight: '1.4'
                  }}>
{`-- Webforms Configurations Table
CREATE TABLE webforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  schema JSONB NOT NULL, -- UI layout specs & mappings
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead Round-Robin routing rules
CREATE TABLE lead_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  routing_type VARCHAR(50) DEFAULT 'round-robin', -- capacity-based
  assigned_agents JSONB NOT NULL, -- Array of user IDs
  is_active BOOLEAN DEFAULT TRUE
);

-- Enforce MFA attributes on Users
ALTER TABLE users 
  ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN mfa_secret VARCHAR(255);`}
                  </pre>
                </div>
              </div>
            )}

            {selectedBlueprintPhase === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h4 style={{ color: 'var(--accent-cyan)', fontSize: '16px', fontWeight: 700 }}>Phase 2: Agent Communication & Field Compliance</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '4px' }}>
                    Focus on synchronizing agent communications, enabling direct click-to-dial, and logging granular property change history.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
                  {/* UI UX design specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase' }}>1. UI/UX DESIGN SPEC</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>Email Timeline Composer & Dialer UI</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>Inline Email Composer:</strong> Tabbed box within lead card with template selectors, rich-text markdown, and draft recovery.</li>
                      <li><strong>VoIP Floating Widget:</strong> Minimizable bottom-right call status overlay showing active call timer, mute state, and audio waveform animations.</li>
                      <li><strong>Audit Changelog Tab:</strong> Sub-tab on lead profile showing chronologically ordered log items of changed fields.</li>
                    </ul>
                  </div>

                  {/* Backend & API specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700, textTransform: 'uppercase' }}>2. BACKEND & API SERVICES</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>IMAP Daemon, Twilio Voice & Diff logs</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>OAuth IMAP Sync Workers:</strong> Node background workers connecting using access tokens to fetch email diffs and map to matching leads.</li>
                      <li><strong>Twilio Voice WebRTC capability:</strong> Generate client tokens and handle Call Status Webhooks to capture audio urls.</li>
                      <li><strong>Express Diff Middleware:</strong> Middleware evaluating request changes vs DB current state to write JSON audits.</li>
                    </ul>
                  </div>
                </div>

                {/* Database changes */}
                <div style={{ background: 'rgba(34, 211, 238, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(34, 211, 238, 0.2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>3. DATABASE SCHEMA MODIFICATIONS (SQL Blueprint)</span>
                  <pre style={{ 
                    marginTop: '10px', 
                    fontSize: '11.5px', 
                    color: 'var(--text-primary)', 
                    background: 'var(--bg-body)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)', 
                    overflowX: 'auto',
                    fontFamily: 'Courier New, monospace',
                    lineHeight: '1.4'
                  }}>
{`-- Email Sync Table
CREATE TABLE lead_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  sent_at TIMESTAMP
);

-- VoIP Call Logs
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  twilio_call_sid VARCHAR(255) UNIQUE,
  duration_seconds INT,
  recording_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Field-Level Audit Trails
CREATE TABLE field_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL,
  record_type VARCHAR(50) NOT NULL, -- 'lead', 'deal'
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}
                  </pre>
                </div>
              </div>
            )}

            {selectedBlueprintPhase === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <h4 style={{ color: 'var(--accent-cyan)', fontSize: '16px', fontWeight: 700 }}>Phase 3: Enterprise Scale & Disaster Recovery</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginTop: '4px' }}>
                    Implementing corporate SAML SSO boundaries, secure e-Sign quotes workflows, and high-availability database failovers.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
                  {/* UI UX design specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 700, textTransform: 'uppercase' }}>1. UI/UX DESIGN SPEC</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>Quotation Creator & e-Sign Portal</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>Itemized Proposal Creator:</strong> Product table UI enabling agents to add line items, modify discount cells, and preview print PDFs.</li>
                      <li><strong>e-Sign signing canvas:</strong> Signature drawer modal prompting client to draw signature on canvas, type signature, and verify details.</li>
                      <li><strong>SAML SSO Portal button:</strong> Login portal integration adding "Corporate Single Sign-On" corporate credentials router.</li>
                    </ul>
                  </div>

                  {/* Backend & API specs */}
                  <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 700, textTransform: 'uppercase' }}>2. BACKEND & API SERVICES</span>
                    <h5 style={{ color: 'var(--text-white)', margin: '6px 0 8px', fontSize: '13.5px' }}>PDF Engine, SAML SSO & DB backups scripts</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: 0 }}>
                      <li><strong>PDF Generation Microservice:</strong> Puppeteer service compiling HTML proposal grids into locked PDFs.</li>
                      <li><strong>Passport SAML integration:</strong> SAML authentication handler parsing Okta xml certificates and matching session attributes.</li>
                      <li><strong>Encrypted snapshot cron:</strong> Daily database cron executing encrypted hot dumps to AWS S3.</li>
                    </ul>
                  </div>
                </div>

                {/* Database changes */}
                <div style={{ background: 'rgba(34, 211, 238, 0.02)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(34, 211, 238, 0.2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>3. DATABASE SCHEMA MODIFICATIONS (SQL Blueprint)</span>
                  <pre style={{ 
                    marginTop: '10px', 
                    fontSize: '11.5px', 
                    color: 'var(--text-primary)', 
                    background: 'var(--bg-body)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)', 
                    overflowX: 'auto',
                    fontFamily: 'Courier New, monospace',
                    lineHeight: '1.4'
                  }}>
{`-- Itemized Quotes & PDF
CREATE TABLE product_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  quote_number VARCHAR(100) UNIQUE NOT NULL,
  items JSONB NOT NULL, -- [{product_id, qty, unit_price, discount}]
  subtotal DECIMAL(12,2) NOT NULL,
  tax DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, signed
  signature_data TEXT, -- Base64 PNG signature or SVG path
  signed_pdf_path VARCHAR(512),
  signed_at TIMESTAMP
);

-- SAML Enterprise Configuration values
ALTER TABLE tenants 
  ADD COLUMN saml_sso_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN saml_metadata_url VARCHAR(512),
  ADD COLUMN saml_entity_id VARCHAR(255);`}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Strategic Pitch Card */}
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border)', 
            padding: '24px', 
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h4 style={{ color: 'var(--accent-cyan)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Strategic Advantage of Gaps Resolution
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
              By resolving these gaps, we unlock the true value of our **Leads & Sales CRM**. HubSpot and Zoho are isolated ecosystems that charge heavy integration and licensing fees. Resolving our inbound webform automation and communications gaps allows us to offer a lightweight, highly-integrated sales system that is **80% cheaper to scale** for enterprise teams, while keeping agent operations unified.
            </p>
          </div>
        </div>
      )}
      
      {/* Footer Branding Panel */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)', 
        border: '1px solid rgba(34, 211, 238, 0.15)', 
        padding: '24px', 
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '650px' }}>
          <h4 style={{ color: 'var(--text-white)', fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--accent-cyan)' }} /> Unified CRM Workspace Advantage
          </h4>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Our software integrates Lead Tracking, deal management, and client payment ledger info into a singular workspace. By resolving standard CRM pipeline fragmentation, we empower agents and managers with unified operational control at a fraction of the global market cost.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Platform Status</div>
            <div style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%', display: 'inline-block' }} />
              Active and Synced
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Comparison;
