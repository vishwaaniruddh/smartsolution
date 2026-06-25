import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, UserCircle, Send, Info, X, Check, CheckCheck, MessageSquare, Paperclip, FileText, Image as ImageIcon, Phone, Video as VideoIcon, ChevronLeft } from 'lucide-react';
import { apiBaseUrl } from '../utils/env.js';
import { useAuth } from '../context/AuthContext';

const GlobalChatPage = () => {
  const { user: currentUser } = useAuth();
  const { setCallState, setCallData, socket } = useOutletContext() || {};
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [attachment, setAttachment] = useState(null);
  
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    // Override .page-content styles globally while chat is open
    const style = document.createElement('style');
    style.innerHTML = `
      .page-content {
        padding: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      }
    `;
    document.head.appendChild(style);

    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.head.removeChild(style);
    };
  }, []);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const activeChatUserRef = useRef(activeChatUser);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/chat?action=contacts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('crm_token')}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat contacts:', err);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    activeChatUserRef.current = activeChatUser;
    setPartnerTyping(false);
    if (activeChatUser) {
      fetchHistory(activeChatUser.id);
      // Mark read locally in contacts count
      setContacts(prev => prev.map(c => c.id === activeChatUser.id ? { ...c, unread_count: 0 } : c));
    }
  }, [activeChatUser]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const currentActiveUser = activeChatUserRef.current;
      
      // If the message is part of current active conversation
      if (currentActiveUser && (message.sender_id === currentActiveUser.id || message.sender_id === currentUser?.id)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          
          const tempIndex = prev.findIndex(m => 
            m.id.toString().startsWith('temp-') && 
            m.message === message.message && 
            m.sender_id === message.sender_id
          );
          
          if (tempIndex !== -1) {
            return prev.map((m, idx) => idx === tempIndex ? message : m);
          }
          return [...prev, message];
        });

        // Trigger mark_read request to PHP if incoming from partner
        if (message.sender_id === currentActiveUser.id) {
          fetch(`${apiBaseUrl}/chat?action=mark_read`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('crm_token')}` 
            },
            body: JSON.stringify({ sender_id: currentActiveUser.id })
          }).catch(err => console.warn('Failed to send read receipt:', err));
        }
      } else {
        // Increment unread count for contacts list
        setContacts(prev => prev.map(c => {
          if (c.id === message.sender_id) {
            return {
              ...c,
              unread_count: (c.unread_count || 0) + 1,
              last_message_time: message.created_at
            };
          }
          return c;
        }));
      }

      // Update last message time for sorting
      setContacts(prev => {
        return prev.map(c => {
          if (c.id === message.sender_id || c.id === message.receiver_id) {
            return {
              ...c,
              last_message_time: message.created_at
            };
          }
          return c;
        });
      });
    };

    const handleMessageRead = (data) => {
      const currentActiveUser = activeChatUserRef.current;
      if (currentActiveUser && data.reader_id === currentActiveUser.id) {
        setMessages(prev => prev.map(m => {
          if (m.sender_id === currentUser?.id) {
            return { ...m, is_read: 1 };
          }
          return m;
        }));
      }
    };

    const handleTyping = (data) => {
      const currentActiveUser = activeChatUserRef.current;
      if (currentActiveUser && data.from === currentActiveUser.id) {
        setPartnerTyping(data.isTyping);
      }
    };

    const handleUserOnline = (data) => {
      setContacts(prev => prev.map(c => c.id === data.userId ? { ...c, isOnline: true } : c));
    };

    const handleUserOffline = (data) => {
      setContacts(prev => prev.map(c => c.id === data.userId ? { ...c, isOnline: false } : c));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_read', handleMessageRead);
    socket.on('typing', handleTyping);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_read', handleMessageRead);
      socket.off('typing', handleTyping);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [currentUser, socket]);

  const handleCallInitiate = async (isVideo) => {
    if (!activeChatUser) return;
    if (setCallState && setCallData) {
      setCallState('dialing');
      setCallData({
        peerId: activeChatUser.id,
        peerName: `${activeChatUser.first_name} ${activeChatUser.last_name}`,
        isVideo,
        isIncoming: false,
        callerName: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Someone'
      });

      // Automatically send a chat message indicating a call was started
      try {
        const formData = new FormData();
        formData.append('receiver_id', activeChatUser.id);
        formData.append('message', isVideo ? '📹 Video call initiated' : '📞 Voice call initiated');
        
        const res = await fetch(`${apiBaseUrl}/chat?action=message`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('crm_token')}` 
          },
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          // Add the message to our local state so we see it immediately
          setMessages(prev => [...prev, data.data]);
        }
      } catch (err) {
        console.error('Failed to send call notification message:', err);
      }
    }
  };

  const handleTextareaChange = (e) => {
    setMessageText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';

    if (socket && activeChatUser) {
      socket.emit('typing', { to: activeChatUser.id, isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { to: activeChatUser.id, isTyping: false });
      }, 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachment) || !activeChatUser) return;

    const msgText = messageText;
    const currentAttachment = attachment;
    
    setMessageText('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const textarea = document.getElementById('chat-textarea');
    if (textarea) textarea.style.height = 'auto';
    
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender_id: currentUser.id,
      receiver_id: activeChatUser.id,
      message: msgText,
      created_at: new Date().toISOString(),
      attachment_name: currentAttachment ? currentAttachment.name : null,
      attachment_path: currentAttachment ? 'uploading...' : null
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const formData = new FormData();
      formData.append('receiver_id', activeChatUser.id);
      formData.append('message', msgText);
      if (currentAttachment) {
        formData.append('attachment', currentAttachment);
      }

      const res = await fetch(`${apiBaseUrl}/chat?action=message`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('crm_token')}` 
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.data : m));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const isImageFile = (fileName) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  const filteredContacts = contacts.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  }).sort((a, b) => {
    const dateA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
    const dateB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="animate-in" style={{ 
      flex: 1,
      width: '100%',
      display: 'flex', 
      background: 'var(--bg-main)', 
      overflow: 'hidden' 
    }}>
      
      {/* Left Panel: Contacts List */}
      <div style={{
        width: isMobile ? '100%' : '320px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: (isMobile && activeChatUser) ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>Chats</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading contacts...</div>
          ) : filteredContacts.length > 0 ? (
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
                  borderBottom: '1px solid var(--border-light)',
                  background: activeChatUser?.id === contact.id ? 'var(--bg-hover)' : 'transparent',
                  transition: 'background 0.1s'
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {contact.profile_photo ? (
                    <img 
                      src={contact.profile_photo.startsWith('http') ? contact.profile_photo : `${apiBaseUrl}/${contact.profile_photo}`}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : null}
                  <div style={{ 
                    display: contact.profile_photo ? 'none' : 'flex',
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--gradient-blue)', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '14px', 
                    fontWeight: 600 
                  }}>
                    {contact.first_name?.charAt(0)}{contact.last_name?.charAt(0)}
                  </div>
                  {contact.unread_count > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: 'var(--accent-red)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 4px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-card)'
                    }}>
                      {contact.unread_count}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {contact.first_name} {contact.last_name}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {contact.role === 'Superadmin' ? 'System Platform' : contact.tenant_name || 'System'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {contact.email}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No contacts found.</div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div style={{
        flex: 1,
        background: 'var(--bg-main)',
        display: (isMobile && !activeChatUser) ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {activeChatUser ? (
          <>
            {/* Chat Header */}
            <div style={{ 
              padding: '12px 20px', 
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && (
                  <button
                    onClick={() => setActiveChatUser(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '-4px'
                    }}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  {activeChatUser.profile_photo ? (
                    <img 
                      src={activeChatUser.profile_photo.startsWith('http') ? activeChatUser.profile_photo : `${apiBaseUrl}/${activeChatUser.profile_photo}`}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : null}
                  <div style={{ 
                    display: activeChatUser.profile_photo ? 'none' : 'flex',
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: 'var(--gradient-blue)', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '13px', 
                    fontWeight: 600 
                  }}>
                    {activeChatUser.first_name?.charAt(0)}{activeChatUser.last_name?.charAt(0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activeChatUser.first_name} {activeChatUser.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {partnerTyping ? (
                      <span style={{ color: '#00a884', fontWeight: 600 }}>typing...</span>
                    ) : (
                      `${activeChatUser.role} • ${activeChatUser.tenant_name || 'System Platform'}`
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => handleCallInitiate(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none'; }}
                  title="Voice Call"
                >
                  <Phone size={16} />
                </button>
                <button 
                  onClick={() => handleCallInitiate(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none'; }}
                  title="Video Call"
                >
                  <VideoIcon size={16} />
                </button>
                <button 
                  onClick={() => setShowInfoModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none'; }}
                  title="Contact Info"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ 
              flex: 1, 
              padding: '24px 40px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l.83.83v58.34h-58.34v-.83l57.51-58.34zM53.8 0H60v6.2l-6.2-6.2zM0 60l6.2-6.2H0v6.2zM0 52.97l52.97-52.97h1.66L0 54.63v-1.66zM0 45.9l45.9-45.9h1.66L0 47.56v-1.66zM0 38.83l38.83-38.83h1.66L0 40.49v-1.66zM0 31.76l31.76-31.76h1.66L0 33.42v-1.66zM0 24.69l24.69-24.69h1.66L0 26.35v-1.66zM0 17.62l17.62-17.62h1.66L0 19.28v-1.66zM0 10.55l10.55-10.55h1.66L0 12.21v-1.66zM0 3.48l3.48-3.48h1.66L0 5.14v-1.66z\' fill=\'%23ffffff\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto', fontSize: '13px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                  Start of conversation with {activeChatUser.first_name}
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === currentUser?.id;
                const hasAttachment = !!msg.attachment_path;
                const isImage = isImageFile(msg.attachment_name);
                
                return (
                  <div key={msg.id} style={{ 
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    background: isMe ? '#005c4b' : 'var(--bg-card)',
                    color: isMe ? '#e9edef' : 'var(--text-primary)',
                    padding: hasAttachment && isImage ? '4px 4px 6px 4px' : '6px 8px 6px 12px',
                    borderRadius: '8px',
                    borderTopRightRadius: isMe ? '0px' : '8px',
                    borderTopLeftRadius: !isMe ? '0px' : '8px',
                    maxWidth: '65%',
                    fontSize: '14px',
                    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                    lineHeight: '1.4',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}>
                    {hasAttachment && (
                      <div style={{ marginBottom: msg.message ? '6px' : '0' }}>
                        {msg.attachment_path === 'uploading...' ? (
                          <div style={{ padding: '20px', textAlign: 'center', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                            Uploading {msg.attachment_name}...
                          </div>
                        ) : isImage ? (
                          <a href={`${apiBaseUrl}/${msg.attachment_path}`} target="_blank" rel="noreferrer">
                            <img 
                              src={`${apiBaseUrl}/${msg.attachment_path}`} 
                              alt="attachment" 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '300px', 
                                borderRadius: '6px', 
                                display: 'block', 
                                cursor: 'pointer',
                                objectFit: 'contain'
                              }} 
                            />
                          </a>
                        ) : (
                          <a 
                            href={`${apiBaseUrl}/${msg.attachment_path}`} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              background: isMe ? 'rgba(0,0,0,0.15)' : 'var(--bg-hover)', 
                              padding: '12px', 
                              borderRadius: '6px',
                              textDecoration: 'none',
                              color: 'inherit'
                            }}
                          >
                            <div style={{ width: '40px', height: '40px', background: isMe ? '#00a884' : 'var(--accent-blue)', color: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText size={20} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {msg.attachment_name}
                              </div>
                              <div style={{ fontSize: '11px', opacity: 0.8, textTransform: 'uppercase' }}>
                                Document
                              </div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                    
                    {msg.message && (
                      <span style={{ paddingRight: '50px', paddingLeft: (hasAttachment && isImage) ? '8px' : '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {msg.message}
                      </span>
                    )}
                    
                    <div style={{ 
                      fontSize: '10px', 
                      color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', 
                      textAlign: 'right', 
                      marginTop: (hasAttachment && isImage && !msg.message) ? '-24px' : '-10px',
                      marginBottom: (hasAttachment && isImage && !msg.message) ? '4px' : '-2px',
                      marginRight: (hasAttachment && isImage && !msg.message) ? '4px' : '0',
                      float: 'right',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      background: (hasAttachment && isImage && !msg.message) ? 'rgba(0,0,0,0.5)' : 'transparent',
                      padding: (hasAttachment && isImage && !msg.message) ? '2px 6px' : '0',
                      borderRadius: '10px',
                      zIndex: 1
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <CheckCheck size={12} style={{ color: msg.is_read ? '#53bdeb' : 'currentColor' }} />}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Attachment Preview Banner */}
            {attachment && (
              <div style={{ 
                padding: '12px 20px', 
                background: 'var(--bg-main)', 
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, maxWidth: '400px' }}>
                  {isImageFile(attachment.name) ? (
                    <img src={URL.createObjectURL(attachment)} alt="preview" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : <FileText size={20} style={{ color: 'var(--text-secondary)' }} />}
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {attachment.name}
                  </span>
                  <button type="button" onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div style={{ padding: '12px 20px', background: 'var(--bg-card)', borderTop: attachment ? 'none' : '1px solid var(--border)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: attachment ? 'var(--accent-blue)' : 'var(--text-secondary)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                  }}
                  title="Attach file"
                >
                  <Paperclip size={24} />
                </button>
                <textarea 
                  id="chat-textarea"
                  placeholder={attachment ? "Add a caption..." : "Type a message"} 
                  value={messageText}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  onPaste={(e) => {
                    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                      setAttachment(e.clipboardData.files[0]);
                    }
                  }}
                  rows={1}
                  style={{ 
                    flex: 1, 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    border: 'none',
                    background: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '14px',
                    resize: 'none',
                    minHeight: '44px',
                    maxHeight: '150px',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    overflowY: 'auto'
                  }}
                />
                <button type="submit" style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: (messageText.trim() || attachment) ? '#00a884' : 'var(--bg-hover)', 
                  color: (messageText.trim() || attachment) ? 'white' : 'var(--text-muted)', 
                  border: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  cursor: (messageText.trim() || attachment) ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }}>
                  <Send size={18} style={{ marginLeft: (messageText.trim() || attachment) ? '-2px' : '0' }} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-main)' }}>
            <div style={{ 
              width: '240px', 
              height: '240px', 
              borderRadius: '50%', 
              background: 'var(--bg-card)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '32px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <MessageSquare size={80} style={{ color: 'var(--border)', opacity: 0.5 }} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '12px' }}>SAR Web</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Send and receive messages securely across your organization.</p>
          </div>
        )}
      </div>

      {/* Contact Info Modal */}
      {showInfoModal && activeChatUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            width: '360px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setShowInfoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                <X size={20} />
              </button>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Contact info</h3>
              <div style={{ width: '20px' }}></div>
            </div>
            
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-main)' }}>
              {activeChatUser.profile_photo ? (
                <img 
                  src={activeChatUser.profile_photo.startsWith('http') ? activeChatUser.profile_photo : `${apiBaseUrl}/${activeChatUser.profile_photo}`}
                  alt=""
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', marginBottom: '16px', boxShadow: 'var(--shadow-md)' }}
                />
              ) : null}
              <div style={{ 
                display: activeChatUser.profile_photo ? 'none' : 'flex',
                width: '140px', 
                height: '140px', 
                borderRadius: '50%', 
                background: 'var(--gradient-blue)', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontSize: '48px', 
                fontWeight: 600,
                marginBottom: '16px',
                boxShadow: 'var(--shadow-md)'
              }}>
                {activeChatUser.first_name?.charAt(0)}{activeChatUser.last_name?.charAt(0)}
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {activeChatUser.first_name} {activeChatUser.last_name}
              </h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '12px' }}>{activeChatUser.email}</div>
            </div>
            
            <div style={{ padding: '20px', background: 'var(--bg-card)' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Role</div>
                <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{activeChatUser.role}</div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tenant Organization</div>
                <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                  {activeChatUser.role === 'Superadmin' ? 'System Platform' : (activeChatUser.tenant_name || 'System')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Phone Number</div>
                <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{activeChatUser.contact || 'Not provided'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GlobalChatPage;
