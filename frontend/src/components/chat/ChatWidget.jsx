import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, UserCircle, Search, Minimize2, Maximize2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiBaseUrl } from '../../utils/env';

const ChatWidget = () => {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch contacts
  const fetchContacts = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/chat?action=contacts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('crm_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat contacts:', err);
    }
  };

  // Fetch messages history
  const fetchHistory = async (userId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/chat?action=history&user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('crm_token')}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    }
  };

  // Listen for open-chat events from other components
  useEffect(() => {
    const handleOpenChat = (e) => {
      const { user } = e.detail;
      setIsOpen(true);
      setIsMinimized(false);
      
      if (user) {
        setActiveChatUser(user);
        fetchHistory(user.id);
      } else {
        setActiveChatUser(null);
        fetchContacts();
      }
    };

    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  // Polling mechanism
  useEffect(() => {
    if (isOpen && !isMinimized) {
      if (activeChatUser) {
        // Poll for active chat history
        pollIntervalRef.current = setInterval(() => {
          fetchHistory(activeChatUser.id);
        }, 3000);
      } else {
        // Poll for contacts (to get unread counts)
        pollIntervalRef.current = setInterval(() => {
          fetchContacts();
        }, 5000);
        fetchContacts(); // initial fetch
      }
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, isMinimized, activeChatUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChatUser) return;

    const msgText = message;
    setMessage('');
    
    // Optimistic UI update
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: currentUser.id,
      receiver_id: activeChatUser.id,
      message: msgText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`${apiBaseUrl}/chat?action=message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('crm_token')}` 
        },
        body: JSON.stringify({
          receiver_id: activeChatUser.id,
          message: msgText
        })
      });
      const data = await res.json();
      if (data.success) {
        // Replace temp message with actual message from server
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.data : m));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const filteredContacts = contacts.filter(c => 
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: isMinimized ? 'auto' : '0',
      bottom: isMinimized ? '20px' : '0',
      right: isMinimized ? '20px' : '0',
      width: isMinimized ? 'auto' : '380px',
      height: isMinimized ? 'auto' : '100vh',
      backgroundColor: 'var(--bg-card)',
      borderRadius: isMinimized ? 'var(--radius-lg)' : '0',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
      borderLeft: '1px solid var(--border)',
      border: isMinimized ? '1px solid var(--border)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9999,
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--gradient-blue)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer'
      }} onClick={() => setIsMinimized(!isMinimized)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={18} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>
            {activeChatUser ? `Chat: ${activeChatUser.first_name}` : 'Internal Chat'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {activeChatUser ? (
            // Chat Window Mode
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ 
                padding: '10px 16px', 
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-main)'
              }}>
                <button 
                  onClick={() => { setActiveChatUser(null); fetchContacts(); }}
                  style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <Search size={16} />
                </button>
                {activeChatUser.profile_photo ? (
                  <img 
                    src={activeChatUser.profile_photo.startsWith('http') ? activeChatUser.profile_photo : `${apiBaseUrl}/${activeChatUser.profile_photo}`}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <UserCircle size={32} style={{ color: 'var(--text-secondary)' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{activeChatUser.first_name} {activeChatUser.last_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{activeChatUser.role}</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-main)' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginTop: '20px' }}>
                    No messages yet. Send a message to start the conversation!
                  </div>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: isMe ? 'white' : 'var(--text-primary)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-lg)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      maxWidth: '80%',
                      fontSize: '13px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {msg.message}
                      <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px', textAlign: isMe ? 'right' : 'left' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ 
                      flex: 1, 
                      padding: '10px 14px', 
                      borderRadius: '20px', 
                      border: '1px solid var(--border)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontSize: '13px'
                    }}
                  />
                  <button type="submit" style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    background: 'var(--accent-blue)', 
                    color: 'white', 
                    border: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: message.trim() ? 1 : 0.6
                  }}>
                    <Send size={16} style={{ marginLeft: '-2px' }} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Contact List Mode
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search contacts..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px 8px 30px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--border)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontSize: '12px'
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
                {filteredContacts.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No contacts found.
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <div 
                      key={contact.id} 
                      onClick={() => { setActiveChatUser(contact); fetchHistory(contact.id); }}
                      style={{ 
                        padding: '12px 16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                    >
                      <div style={{ position: 'relative' }}>
                        {contact.profile_photo ? (
                          <img 
                            src={contact.profile_photo.startsWith('http') ? contact.profile_photo : `${apiBaseUrl}/${contact.profile_photo}`}
                            alt=""
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <UserCircle size={40} style={{ color: 'var(--text-secondary)' }} />
                        )}
                        {contact.unread_count > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'var(--accent-red)',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--bg-card)'
                          }}>
                            {contact.unread_count}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{contact.first_name} {contact.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{contact.role}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;
