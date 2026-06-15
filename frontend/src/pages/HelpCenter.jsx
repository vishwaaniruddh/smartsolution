import React from 'react';
import {
  Search, BookOpen, Users, Wrench, GitBranch,
  BarChart3, Puzzle, MessageCircle
} from 'lucide-react';

const categories = [
  { icon: BookOpen, label: 'Getting\nStarted' },
  { icon: Users, label: 'Account\nManagement' },
  { icon: Wrench, label: 'Troubleshooting' },
  { icon: GitBranch, label: 'Sales\nPipeline' },
  { icon: BarChart3, label: 'Reporting &\nAnalytics' },
  { icon: Puzzle, label: 'API &\nIntegrations' },
];

const articles = [
  'CRM Help & Support Center',
  'Account Management variables',
  'How to Set Up form for Sales + Pipeline',
  'CRM\'s Help & Support Center',
  'How to expect Cosemancy for Help & Support Center',
  'How to Use Sales Widget mfider',
];

const forums = [
  { name: 'Community Forums Initiome', count: 1 },
  { name: 'Community Forums Tasners', count: 0 },
  { name: 'Community Community Events', count: 0 },
  { name: 'Community Forums Reforms', count: 6 },
  { name: 'Community Forums India', count: 0 },
  { name: 'Community Forums Jacksonville', count: 7 },
];

const HelpCenter = () => {
  return (
    <div>
      {/* Hero */}
      <div className="help-hero">
        <h1>CRM Help &amp; Support Center</h1>
        <div className="help-search">
          <input type="text" placeholder="Search our knowledge base..." />
          <button>Search</button>
        </div>

        <div className="help-categories">
          {categories.map((cat, i) => (
            <div className="help-category" key={i}>
              <cat.icon size={28} />
              <span style={{ whiteSpace: 'pre-line' }}>{cat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="help-content-grid">
        {/* Recent Articles */}
        <div className="help-section">
          <h3>Recent Articles</h3>
          <ul className="help-article-list">
            {articles.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>

        {/* Community Forums */}
        <div className="help-section">
          <h3>Community Forums</h3>
          {forums.map((f, i) => (
            <div className="community-link" key={i}>
              <span>{f.name}</span>
              {f.count > 0 && <span className="community-count">{f.count}</span>}
            </div>
          ))}
        </div>

        {/* Raise a Ticket */}
        <div className="help-section">
          <h3>Raise a Ticket</h3>
          <div className="help-ticket-form">
            <input type="text" placeholder="Subject" />
            <textarea placeholder="Description" />
            <select>
              <option>Category</option>
              <option>Bug Report</option>
              <option>Feature Request</option>
              <option>General Inquiry</option>
            </select>
            <input type="file" style={{ fontSize: '12px', color: 'var(--text-muted)' }} />
            <button className="submit-ticket-btn">Submit Ticket</button>
          </div>
        </div>
      </div>

      {/* Chat Support Button */}
      <button className="chat-support-btn">
        <MessageCircle size={18} /> Chat with Support
      </button>
    </div>
  );
};

export default HelpCenter;
