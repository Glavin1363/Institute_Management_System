import React from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetFiles, dbGetTotalUnread } from '../data/db';
import srinivasLogo from '../assets/srinivas.jpg';

export default function Sidebar({ currentPage, setPage }) {
    const { user, logout } = useAuth();
    const pendingCount = dbGetFiles({ status: 'pending' }).length;
    const unreadCount = dbGetTotalUnread(user.id);
    const isStaff = user.role === 'admin' || user.role === 'faculty';

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
            <div className="sidebar-footer">
                <div className="user-ava">{user.avatar || user.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="user-nm">{user.name}</div>
                    <div className="user-rl">{user.role === 'admin' ? 'HOD / Admin' : user.role}</div>
                </div>
                <button className="logout-btn" onClick={() => logout(user)} title="Logout">↩</button>
            </div>
        </aside>
    );
}
