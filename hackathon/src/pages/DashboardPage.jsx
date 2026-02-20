import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetNotices, dbGetFiles } from '../data/db';
import NoticesSection from '../components/NoticesSection';

export const fileEmoji = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') return '📕';
    if (t === 'pptx' || t === 'ppt') return '📊';
    if (t === 'docx' || t === 'doc') return '📝';
    if (t === 'jpg' || t === 'jpeg' || t === 'png') return '🖼️';
    if (t === 'url') return '🔗';
    return '📄';
};

function AnimatedCounter({ value }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const duration = 800;
        const start = performance.now();
        const target = parseInt(value) || 0;
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [value]);
    return <span ref={ref}>0</span>;
}

export default function DashboardPage({ setPage }) {
    const { user } = useAuth();
    const notices = dbGetNotices();
    const files = dbGetFiles({ approvedOnly: true });
    const pending = dbGetFiles({ status: 'pending' });
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const roleColor = user.role === 'admin' ? '#F472B6' : user.role === 'faculty' ? '#10B981' : '#60A5FA';
    const roleLabel = user.role === 'admin' ? 'HOD / Admin' : user.role === 'faculty' ? 'Faculty' : `Student — Sem ${user.semester || '?'}`;

    const stats = [
        { val: files.length, lbl: 'Total Resources', icon: '📄', cls: 'si-purple', action: () => setPage('repository') },
        { val: notices.length, lbl: 'Active Notices', icon: '📢', cls: 'si-green', action: () => setPage('notices') },
        ...(isStaff ? [{ val: pending.length, lbl: 'Pending Review', icon: '⏳', cls: 'si-pink', action: () => setPage('review') }] : []),
        { val: `${files.reduce((a, f) => a + (f.downloads || 0), 0)}+`, lbl: 'Total Downloads', icon: '⬇️', cls: 'si-cyan', action: () => setPage('repository') },
    ];

    return (
        <div className="anim-fade">
            <div className="page-header">
                {/* Welcome Banner */}
                <div className="welcome-banner">
                    <div>
                        <h1 style={{ color: '#fff', marginBottom: 10 }}>
                            Welcome back, {user.name.split(' ')[0]}! 👋
                        </h1>
                        <div className="welcome-subtitle">
                            <span style={{ background: roleColor, color: '#fff', padding: '3px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800 }}>
                                {roleLabel}
                            </span>
                            <span>Here's your department at a glance.</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                            🕒 {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Stats */}
                <div className="g-4" style={{ marginBottom: 36 }}>
                    {stats.map((s, i) => (
                        <div key={i} className={`glass-card stat-card stagger-${i + 1} anim-up`}
                            style={{ cursor: 'pointer' }} onClick={s.action}>
                            <div className={`stat-icon-wrap ${s.cls}`}>{s.icon}</div>
                            <div>
                                <div className="stat-val">
                                    {typeof s.val === 'number' ? <AnimatedCounter value={s.val} /> : s.val}
                                </div>
                                <div className="stat-lbl">{s.lbl}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Content grid */}
                <div className="g-2" style={{ gap: 32, alignItems: 'start' }}>
                    {/* Notices */}
                    <div className="anim-in stagger-3">
                        <div className="section-hdr">
                            <h2>📢 Department Circulars</h2>
                            {isStaff && (
                                <button className="btn btn-primary btn-sm" onClick={() => setPage('notices')}>+ Post Notice</button>
                            )}
                        </div>
                        <NoticesSection notices={notices.slice(0, 3)} showActions={false} />
                        {notices.length > 3 && (
                            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setPage('notices')}>
                                View all {notices.length} →
                            </button>
                        )}
                    </div>

                    {/* Recent files */}
                    <div className="anim-in stagger-4">
                        <div className="section-hdr">
                            <h2>🆕 Recent Uploads</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setPage('repository')}>Browse All →</button>
                        </div>
                        {files.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📭</span>
                                <p>No resources yet. Be the first to upload!</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {files.slice(0, 6).map((f, i) => (
                                    <div key={f.id}
                                        className={`glass-card stagger-${i + 1} anim-up`}
                                        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                                        onClick={() => setPage('repository')}>
                                        <span style={{ fontSize: '1.6rem' }}>{fileEmoji(f.type)}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                                            <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 3 }}>{f.subject} • {f.uploadedBy}</div>
                                        </div>
                                        <span className="badge badge-primary">{(f.type || '').toUpperCase()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
