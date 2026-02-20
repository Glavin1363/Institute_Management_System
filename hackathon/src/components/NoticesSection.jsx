import React from 'react';
import { isNewNotice } from '../data/db';

const CAT_COLORS = {
    Exam: { text: '#f87171', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.25)' },
    Event: { text: '#34d399', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)' },
    Deadline: { text: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)' },
    General: { text: '#a78bfa', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.25)' },
};

export default function NoticesSection({ notices, showActions = false, onDelete }) {
    if (!notices || notices.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No notices yet. Check back soon.</p>
            </div>
        );
    }

    return (
        <div>
            {notices.map((n, i) => {
                const isNew = isNewNotice(n.postedDate);
                const cat = n.category || 'General';
                const col = CAT_COLORS[cat] || CAT_COLORS.General;

                return (
                    <div key={n.id} className={`notice-card ${cat.toLowerCase()} anim-up stagger-${Math.min(i + 1, 5)}`}>
                        <div className="notice-meta">
                            {isNew && <span className="badge badge-new">✨ NEW</span>}
                            {n.urgent && <span className="badge badge-danger">🔴 Urgent</span>}
                            <span className="badge" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                                {cat}
                            </span>
                        </div>
                        <div className="notice-title">{n.title}</div>
                        <div className="notice-body">{n.content}</div>
                        <div className="notice-footer">
                            <span>By <strong>{n.postedBy}</strong></span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span>🕒 {new Date(n.postedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                {showActions && onDelete && (
                                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(n.id)}>Delete</button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
