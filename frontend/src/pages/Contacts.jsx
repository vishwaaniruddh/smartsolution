import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Search, Filter } from 'lucide-react';
import { apiBaseUrl } from '../utils/env.js';

const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#22d3ee'];

const getInitials = (name) => {
  if (!name) return 'LD';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
};

const Contacts = () => {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch leads to extract contacts
  const fetchContacts = () => {
    setLoading(true);
    fetch(`${apiBaseUrl}/leads`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setLeads(data.data);
        }
      })
      .catch((err) => {
        console.warn('API error fetching contacts, using mock leads:', err);
        const mockLeads = [
          { id: 1, name: 'Alice Smith', email: 'alice@acme.com', contact_number: '+1 (555) 019-2834', source: 'Website', value: 5000 },
          { id: 2, name: 'Bob Chen', email: 'bob@techflow.io', contact_number: '+1 (555) 019-5847', source: 'Referral', value: 12500 },
          { id: 3, name: 'Michael Brown', email: 'mbrown@apex.org', contact_number: '+1 (555) 019-0000', source: 'LinkedIn', value: 8200 },
          { id: 4, name: 'Jessica Taylor', email: 'jtaylor@ventures.net', contact_number: '+1 (555) 019-1111', source: 'LinkedIn', value: 9500 },
          { id: 5, name: 'Daniel Smith', email: 'daniel@smith.com', contact_number: '+1 (555) 019-2222', source: 'Website', value: 11000 },
        ];
        setLeads(mockLeads);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Parse contact info helper
  const parseContact = (lead) => {
    const email = lead.email || '';
    const phone = lead.contact_number || '';
    
    // Attempt to parse company name from email domain
    let company = 'Corporate Lead';
    if (email) {
      const parts = email.split('@');
      if (parts.length > 1) {
        const domain = parts[1].split('.')[0];
        company = domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    } else if (lead.source) {
      company = lead.source + ' Client';
    }

    return {
      id: lead.id,
      name: lead.name,
      email: email || 'n/a',
      phone: phone || 'n/a',
      company: company,
      location: lead.source === 'Website' ? 'Online Portal' : lead.source === 'Referral' ? 'Partner Network' : 'LinkedIn Referral',
      role: 'Business Lead'
    };
  };

  const contactsList = leads.map(parseContact);

  // Filter contacts by search term
  const filteredContacts = contactsList.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="leads-page-header">
        <div className="leads-toolbar">
          <div className="leads-search">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="leads-table-card">
        <h2>All Contacts ({filteredContacts.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Channel Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((c, i) => (
                  <tr key={c.id || i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: colors[i % colors.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0
                        }}>
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {c.email}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {c.phone}
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.company}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} style={{ color: 'var(--text-muted)' }} /> {c.location}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No contacts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Contacts;
