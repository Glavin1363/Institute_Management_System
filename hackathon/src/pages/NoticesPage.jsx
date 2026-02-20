import React, { useState } from 'react';
import { dbGetNotices, dbPostNotice, dbDeleteNotice } from '../data/db';
import { useAuth } from '../context/AuthContext';
import NoticesSection from '../components/NoticesSection';

const CATEGORIES = ['General', 'Exam', 'Event', 'Deadline'];

export default function NoticesPage() {
    const { user } = useAuth();
    const [notices, setNotices] = useState(dbGetNotices());
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [urgent, setUrgent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');

    const canPost = user.role === 'admin' || user.role === 'faculty';
    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setLoading(true);
        await new Promise(r => setTimeout(r, 500));
        dbPostNotice({ title: title.trim(), content: content.trim(), category, urgent }, user);
        setNotices(dbGetNotices());
        setTitle(''); setContent(''); setCategory('General'); setUrgent(false);
        setShowForm(false); setLoading(false);
        showToast('Notice published successfully!');
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this notice permanently?')) {
            dbDeleteNotice(id);
            setNotices(dbGetNotices());
            showToast('Notice deleted.');
        }
    };

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1>📢 Department Circulars</h1>
                        <p>Official notices from faculty and administration.</p>
                    </div>
                    {canPost && (
                        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
                            {showForm ? '✕ Cancel' : '+ Post Notice'}
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content">
                {/* Post form */}
                {canPost && showForm && (
                    <div className="glass-card anim-up" style={{ padding: 32, marginBottom: 32 }}>
                        <h3 style={{ marginBottom: 24, fontFamily: "'Space Grotesk', sans-serif" }}>📝 New Circular</h3>
                        <form onSubmit={handlePost} className="form-stack">
                            <div className="form-group">
                                <label className="form-label">Notice Title *</label>
                                <input className="form-input" placeholder="e.g. Internal Assessment Postponed"
                                    value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Content *</label>
                                <textarea className="form-textarea" rows={4}
                                    placeholder="Write the full notice…"
                                    value={content} onChange={e => setContent(e.target.value)} required />
                            </div>
                            <div className="g-2" style={{ gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                        background: urgent ? 'rgba(239,68,68,0.1)' : 'var(--bg-surface)',
                                        padding: '11px 16px', borderRadius: 'var(--r-sm)',
                                        border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                                        transition: 'all 0.2s'
                                    }}>
                                        <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)}
                                            style={{ width: 16, height: 16, accentColor: 'var(--danger)' }} />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: urgent ? '#f87171' : 'var(--text-2)' }}>
                                            🔴 Mark as Urgent
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? <><span className="spinner" /> Posting…</> : '📢 Publish Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <NoticesSection notices={notices} showActions={canPost} onDelete={handleDelete} />
            </div>

            {toast && <div className="toast toast-success">✓ {toast}</div>}
        </div>
    );
}
