import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetFiles, dbGetTotalUnread, dbUpdateUser } from '../data/db';
import srinivasLogo from '../assets/srinivas.jpg';

export default function Sidebar({ currentPage, setPage }) {
    const { user, logout, setUser } = useAuth();
    const pendingCount = dbGetFiles({ status: 'pending' }).length;
    const unreadCount = dbGetTotalUnread(user.id);
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [previewObj, setPreviewObj] = useState(user.avatar);
    const [uploading, setUploading] = useState(false);

    const handleAvatarChange = (e) => {
        const fn = e.target.files[0];
        if (!fn) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPreviewObj(ev.target.result);
        };
        reader.readAsDataURL(fn);
    };

    const handleSaveProfile = async () => {
        if (!previewObj) return;
        setUploading(true);
        await new Promise(r => setTimeout(r, 600));
        const res = dbUpdateUser(user.id, { avatar: previewObj });
        if (res.success) {
            setUser(res.user);
            setShowProfileModal(false);
        }
        setUploading(false);
    };

    const navGroups = [
        {
            label: 'Main',
            items: [
                { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
                { key: 'timetable', label: 'Timetable', icon: '🕒' },
                { key: 'attendance', label: 'Attendance', icon: '✅' },
                { key: 'notices', label: 'Circulars', icon: '📢' },
                { key: 'calendar', label: 'Exam Calendar', icon: '📅' },
                { key: 'repository', label: 'Repository', icon: '📚' },
                { key: 'classrooms', label: 'Classrooms', icon: '🏫' },
                { key: 'chat', label: 'Messages', icon: '💬', badge: unreadCount || null },
            ],
        },
        {
            label: 'Learning',
            items: [
                { key: 'quiz', label: user.role === 'student' ? 'Join Quiz' : 'Quiz Rooms', icon: '🎯' },
                { key: 'results', label: 'Results Tool', icon: '📈' },
            ],
        },
        ...(isStaff ? [{
            label: 'Staff',
            items: [
                { key: 'review', label: 'Review Uploads', icon: '🔍', badge: pendingCount || null },
                ...(user.role === 'admin' ? [
                    { key: 'manage-faculty', label: 'Manage Faculty', icon: '👩‍🏫' },
                    { key: 'admin', label: 'Admin Panel', icon: '🛡' },
                ] : []),
            ],
        }] : []),
    ];

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <img src={srinivasLogo} alt="Srinivas University" className="logo-img" />
                <div>
                    <div className="logo-text-main">Srinivas University</div>
                    <div className="logo-text-sub">Department Portal</div>
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {navGroups.map(group => (
                    <div key={group.label}>
                        <div className="nav-section-label">{group.label}</div>
                        {group.items.map(item => (
                            <div key={item.key}
                                className={`nav-item ${currentPage === item.key ? 'active' : ''}`}
                                onClick={() => setPage(item.key)}>
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                                {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                            </div>
                        ))}
                    </div>
                ))}
            </nav>

            {/* User footer */}
            <div className="sidebar-footer" style={{ cursor: 'pointer' }} onClick={(e) => {
                if (!e.target.closest('.logout-btn')) setShowProfileModal(true);
            }}>
                <div className="user-ava" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {user.avatar && user.avatar.length > 5 ? (
                        <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        user.avatar || user.name[0]
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="user-nm">{user.name}</div>
                    <div className="user-rl">{user.role === 'admin' ? 'HOD / Admin' : user.role}</div>
                </div>
                <button className="logout-btn" onClick={() => logout(user)} title="Logout">↩</button>
            </div>

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-hdr">
                            <div className="modal-title">👤 Profile Settings</div>
                            <button className="modal-close" onClick={() => setShowProfileModal(false)}>✕</button>
                        </div>
                        <div className="form-stack">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 120, height: 120, borderRadius: '50%', background: 'var(--bg-layer-2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem',
                                    color: 'var(--text-1)', overflow: 'hidden', border: '2px solid var(--primary)'
                                }}>
                                    {previewObj && previewObj.length > 5 ? (
                                        <img src={previewObj} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        user.avatar || user.name[0]
                                    )}
                                </div>

                                <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
                                    🖼️ Choose Picture
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                                </label>
                            </div>

                            <div className="form-group" style={{ marginTop: 16 }}>
                                <label className="form-label">Full Name</label>
                                <input className="form-input" value={user.name} disabled />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" value={user.email} disabled />
                            </div>
                            {user.role === 'student' && (
                                <div className="g-2" style={{ gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Program</label>
                                        <input className="form-input" value={user.program || 'BCA'} disabled />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Section</label>
                                        <input className="form-input" value={user.section || 'A'} disabled />
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleSaveProfile} disabled={uploading}>
                                {uploading ? '⏳ Saving...' : '💾 Save Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
