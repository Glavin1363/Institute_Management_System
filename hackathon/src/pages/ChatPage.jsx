import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    dbGetChatContacts, dbGetMessages, dbSendMessage,
    dbMarkMessagesRead, dbGetTotalUnread, dbGetUnreadCount
} from '../data/db';

export default function ChatPage() {
    const { user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [unreadMap, setUnreadMap] = useState({});
    const bottomRef = useRef(null);
    const pollRef = useRef(null);

    const loadContacts = () => {
        const c = dbGetChatContacts(user);
        setContacts(c);
        // Build unread map
        const map = {};
        c.forEach(ct => { map[ct.id] = dbGetUnreadCount(user.id, ct.id); });
        setUnreadMap(map);
    };

    const loadMessages = (contactId) => {
        const msgs = dbGetMessages(user.id, contactId);
        setMessages(msgs);
        dbMarkMessagesRead(user.id, contactId);
        setUnreadMap(prev => ({ ...prev, [contactId]: 0 }));
    };

    useEffect(() => {
        loadContacts();
        pollRef.current = setInterval(() => {
            loadContacts();
            if (selected) loadMessages(selected.id);
        }, 1500);
        return () => clearInterval(pollRef.current);
    }, [selected]);

    useEffect(() => {
        if (selected) loadMessages(selected.id);
    }, [selected]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelect = (c) => { setSelected(c); };

    const handleSend = (e) => {
        e.preventDefault();
        if (!text.trim() || !selected) return;
        dbSendMessage(selected.id, text, user);
        setText('');
        loadMessages(selected.id);
    };

    const roleColor = (role) => role === 'admin' ? '#F472B6' : role === 'faculty' ? '#10B981' : '#60A5FA';
    const roleLabel = (role) => role === 'admin' ? 'Admin' : role === 'faculty' ? 'Faculty' : 'Student';

    const totalUnread = Object.values(unreadMap).reduce((s, v) => s + v, 0);

    return (
        <div className="anim-fade" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="page-header" style={{ paddingBottom: 16 }}>
                <h1>💬 Messages {totalUnread > 0 && <span className="nav-badge" style={{ fontSize: '0.75rem', marginLeft: 8 }}>{totalUnread}</span>}</h1>
                {user.role === 'student' && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>You can message your teachers and admin.</p>
                )}
            </div>

            <div style={{ display: 'flex', gap: 20, height: 'calc(100% - 80px)', minHeight: 400 }}>
                {/* Contacts list */}
                <div style={{
                    width: 260, flexShrink: 0, overflowY: 'auto',
                    background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                    borderRadius: 16, border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Contacts
                    </div>
                    {contacts.length === 0 && (
                        <div style={{ padding: 20, color: 'var(--text-3)', fontSize: '0.83rem' }}>No contacts available.</div>
                    )}
                    {contacts.map(c => {
                        const isActive = selected?.id === c.id;
                        const unread = unreadMap[c.id] || 0;
                        return (
                            <div key={c.id}
                                onClick={() => handleSelect(c)}
                                style={{
                                    padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                                    transition: 'all 0.2s',
                                }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                    background: roleColor(c.role), display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.85rem'
                                }}>{c.avatar || c.name[0]}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: roleColor(c.role), fontWeight: 600 }}>{roleLabel(c.role)}</div>
                                </div>
                                {unread > 0 && (
                                    <span style={{
                                        background: 'var(--primary)', color: '#fff', borderRadius: 99,
                                        fontSize: '0.7rem', fontWeight: 800, padding: '1px 7px', flexShrink: 0
                                    }}>{unread}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Chat panel */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                    borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden'
                }}>
                    {!selected ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
                            <span style={{ fontSize: '3rem' }}>💬</span>
                            <div>Select a contact to start chatting</div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: roleColor(selected.role), display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.9rem'
                                }}>{selected.avatar || selected.name[0]}</div>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{selected.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: roleColor(selected.role), fontWeight: 600 }}>{roleLabel(selected.role)}</div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {messages.length === 0 && (
                                    <div style={{ color: 'var(--text-3)', textAlign: 'center', fontSize: '0.85rem', marginTop: 40 }}>
                                        No messages yet. Say hi! 👋
                                    </div>
                                )}
                                {messages.map(m => {
                                    const isMe = m.senderId === user.id;
                                    return (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                            <div style={{
                                                maxWidth: '72%', padding: '10px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: isMe ? 'var(--primary)' : 'var(--bg-surface)',
                                                color: isMe ? '#fff' : 'var(--text-1)', fontSize: '0.88rem', lineHeight: 1.5,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}>
                                                {m.text}
                                                <div style={{ fontSize: '0.68rem', marginTop: 4, opacity: 0.65, textAlign: 'right' }}>
                                                    {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                                <input
                                    className="form-input"
                                    style={{ flex: 1, borderRadius: 99, padding: '10px 18px' }}
                                    placeholder={`Message ${selected.name}…`}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    autoFocus
                                />
                                <button className="btn btn-primary" type="submit" style={{ borderRadius: 99, padding: '0 20px' }}>Send →</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
