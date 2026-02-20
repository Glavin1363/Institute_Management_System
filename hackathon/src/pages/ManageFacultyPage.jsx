import React, { useState } from 'react';
import { dbGetFaculty, dbAddFaculty, dbDeleteFaculty } from '../data/db';

export default function ManageFacultyPage() {
    const [faculty, setFaculty] = useState(dbGetFaculty());
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim() || !email.trim() || !password) { setError('All fields are required.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 500));
        const res = dbAddFaculty(name, email, password);
        if (res.success) {
            setFaculty(dbGetFaculty());
            setName(''); setEmail(''); setPassword('');
            showToast(`✅ Faculty "${name.trim()}" added successfully!`);
        } else {
            setError(res.error);
        }
        setLoading(false);
    };

    const handleDelete = (id, fname) => {
        setConfirmDelete({ id, name: fname });
    };

    const confirmDeleteNow = () => {
        dbDeleteFaculty(confirmDelete.id);
        setFaculty(dbGetFaculty());
        showToast(`🗑️ Faculty "${confirmDelete.name}" removed.`);
        setConfirmDelete(null);
    };

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>👩‍🏫 Manage Faculty</h1>
                <p>Register new faculty accounts and manage existing ones. Faculty can log in using their assigned credentials.</p>
            </div>

            <div className="page-content">
                <div className="g-2" style={{ gap: 32, alignItems: 'start' }}>

                    {/* Add Faculty Form */}
                    <div className="glass-card" style={{ padding: 28 }}>
                        <h3 style={{ marginBottom: 20, color: 'var(--text-1)' }}>➕ Add New Faculty</h3>
                        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {error && <div className="alert alert-error">⚠️ {error}</div>}

                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className="form-input" placeholder="e.g. Prof. Ravi Kumar"
                                    value={name} onChange={e => setName(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address *</label>
                                <div className="input-with-icon">
                                    <span className="inp-icon">✉️</span>
                                    <input className="form-input" type="email" placeholder="faculty@example.com"
                                        value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <div className="input-with-icon">
                                    <span className="inp-icon">🔒</span>
                                    <input
                                        className="form-input"
                                        type={showPwd ? 'text' : 'password'}
                                        placeholder="Min 6 characters"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required
                                        style={{ paddingRight: 48 }}
                                    />
                                    <button type="button" onClick={() => setShowPwd(p => !p)}
                                        style={{
                                            position: 'absolute', right: 12, top: '50%',
                                            transform: 'translateY(-50%)', background: 'none',
                                            border: 'none', cursor: 'pointer', fontSize: '1rem',
                                        }}
                                        title={showPwd ? 'Hide password' : 'Show password'}
                                    >{showPwd ? '🙈' : '👁️'}</button>
                                </div>
                            </div>

                            <button className="btn btn-primary" type="submit" disabled={loading}
                                style={{ width: '100%', marginTop: 4 }}>
                                {loading ? <><span className="spinner" /> Adding…</> : '✅ Register Faculty'}
                            </button>
                        </form>

                        <div style={{
                            marginTop: 20, padding: '14px 16px',
                            background: 'rgba(99,102,241,0.06)', borderRadius: 12,
                            border: '1px solid rgba(99,102,241,0.15)',
                            fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.7,
                        }}>
                            ℹ️ <strong>Note:</strong> Faculty will log in at the main login page by selecting the <em>Faculty</em> role, then entering their email and password.
                        </div>
                    </div>

                    {/* Faculty List */}
                    <div>
                        <div className="section-hdr" style={{ marginBottom: 16 }}>
                            <h2>🎓 Registered Faculty</h2>
                            <span className="badge badge-primary">{faculty.length} member{faculty.length !== 1 ? 's' : ''}</span>
                        </div>

                        {faculty.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">👩‍🏫</span>
                                <h3 style={{ color: 'var(--text-2)' }}>No faculty registered yet</h3>
                                <p style={{ marginTop: 8 }}>Use the form to add the first faculty member.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {faculty.map((f, i) => (
                                    <div key={f.id} className={`glass-card anim-up stagger-${(i % 4) + 1}`}
                                        style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{
                                            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                                            background: 'linear-gradient(135deg,#6366F1,#F472B6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, color: '#fff', fontSize: '0.95rem',
                                        }}>{f.avatar}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.92rem' }}>{f.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>✉️ {f.email}</div>
                                        </div>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDelete(f.id, f.name)}
                                            title="Remove faculty"
                                        >🗑️ Remove</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-hdr">
                            <div className="modal-title">⚠️ Confirm Removal</div>
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--text-2)', margin: '16px 0 24px' }}>
                            Are you sure you want to remove <strong>{confirmDelete.name}</strong>?
                            They will no longer be able to log in.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirmDeleteNow}>🗑️ Yes, Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast toast-success">{toast}</div>}
        </div>
    );
}
