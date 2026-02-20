import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    dbGetAllUsers, dbBulkImportUsers, dbDeleteFaculty, dbGetLogs,
    dbAddFaculty, dbChangePassword,
} from '../data/db';

const CSV_TEMPLATE = `name,email,role,usn,semester,password
John Doe,john@example.com,student,1DB22BCA001,3,password123
Jane Smith,jane@dept.edu,faculty,,,SecurePass@1`.trim();

export default function AdminPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState('users');

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>🛡 Admin Panel</h1>
                <p>Manage users, bulk import, and view audit logs.</p>
            </div>
            <div className="page-content">
                <div className="role-tabs" style={{ marginBottom: 28, width: 'fit-content' }}>
                    {[['users', '👥 User List'], ['import', '📥 Bulk Import'], ['logs', '📋 Audit Logs']].map(([k, lbl]) => (
                        <button key={k} type="button" className={`role-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{lbl}</button>
                    ))}
                </div>
                {tab === 'users' && <UserListTab user={user} />}
                {tab === 'import' && <BulkImportTab user={user} />}
                {tab === 'logs' && <AuditLogsTab />}
            </div>
        </div>
    );
}

// ─── User List ────────────────────────────────────────────────────────────

function UserListTab({ user: adminUser }) {
    const [users, setUsers] = useState(dbGetAllUsers());
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showAddFaculty, setShowAddFaculty] = useState(false);
    const [toast, setToast] = useState('');
    const [changePwdUserId, setChangePwdUserId] = useState(null);

    const refresh = () => setUsers(dbGetAllUsers());
    const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

    const filtered = users
        .filter(u => filter === 'all' || u.role === filter)
        .filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.usn || '').toLowerCase().includes(search.toLowerCase())
        );

    const handleDelete = (id, role) => {
        if (!window.confirm('Remove this user permanently?')) return;
        dbDeleteFaculty(id);
        refresh();
        showToast('User removed.');
    };

    const roleColor = (r) => r === 'admin' ? '#F472B6' : r === 'faculty' ? '#10B981' : '#60A5FA';
    const roleLabel = (r) => r === 'admin' ? 'Admin' : r === 'faculty' ? 'Faculty' : 'Student';

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="form-input" style={{ maxWidth: 260 }} placeholder="Search by name, email, USN..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="role-tabs" style={{ width: 'fit-content' }}>
                    {[['all', 'All'], ['student', 'Students'], ['faculty', 'Faculty']].map(([k, l]) => (
                        <button key={k} type="button" className={`role-tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
                    ))}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddFaculty(v => !v)} style={{ marginLeft: 'auto' }}>
                    {showAddFaculty ? '✕ Cancel' : '+ Add Faculty'}
                </button>
            </div>

            {showAddFaculty && (
                <AddFacultyForm onAdded={() => { setShowAddFaculty(false); refresh(); showToast('Faculty added!'); }} onCancel={() => setShowAddFaculty(false)} />
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 12 }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''} found</div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            {['Name', 'Email', 'Role', 'USN / Semester', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleColor(u.role), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>{u.avatar || u.name[0]}</div>
                                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{u.name}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--text-2)' }}>{u.email}</td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{ background: `${roleColor(u.role)}22`, color: roleColor(u.role), padding: '2px 10px', borderRadius: 99, fontWeight: 700, fontSize: '0.78rem' }}>{roleLabel(u.role)}</span>
                                </td>
                                <td style={{ padding: '10px 14px', color: 'var(--text-3)' }}>
                                    {u.usn ? `${u.usn} / Sem ${u.semester}` : '—'}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                    {u.role !== 'admin' && (
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ color: 'var(--primary)', fontSize: '0.78rem' }}
                                                onClick={() => setChangePwdUserId(changePwdUserId === u.id ? null : u.id)}
                                            >
                                                🔑 Change Pwd
                                            </button>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: '0.78rem' }} onClick={() => handleDelete(u.id, u.role)}>Remove</button>
                                        </div>
                                    )}
                                    {changePwdUserId === u.id && (
                                        <ChangePwdInline
                                            userId={u.id}
                                            userName={u.name}
                                            adminUser={adminUser}
                                            onDone={(msg) => { setChangePwdUserId(null); showToast(msg); }}
                                            onCancel={() => setChangePwdUserId(null)}
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {toast && <div className="toast toast-success">✓ {toast}</div>}
        </div>
    );
}

function ChangePwdInline({ userId, userName, adminUser, onDone, onCancel }) {
    const [newPwd, setNewPwd] = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setErr('');
        if (newPwd.length < 4) { setErr('Password must be at least 4 characters.'); return; }
        if (newPwd !== confirm) { setErr('Passwords do not match.'); return; }
        const res = dbChangePassword(userId, newPwd, adminUser);
        if (res.success) onDone(`Password changed for ${userName}`);
        else setErr(res.error);
    };

    return (
        <form onSubmit={handleSubmit} style={{
            marginTop: 8, padding: '12px 14px', background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8,
        }}>
            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)', marginBottom: 10 }}>
                🔑 Change password for {userName}
            </div>
            {err && <div style={{ color: 'var(--danger)', fontSize: '0.76rem', marginBottom: 8 }}>⚠️ {err}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input
                    className="form-input" type="password" placeholder="New password"
                    value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    style={{ flex: 1, minWidth: 140, fontSize: '0.82rem' }} required
                />
                <input
                    className="form-input" type="password" placeholder="Confirm"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    style={{ flex: 1, minWidth: 140, fontSize: '0.82rem' }} required
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>Save</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }} onClick={onCancel}>Cancel</button>
            </div>
        </form>
    );
}

function AddFacultyForm({ onAdded, onCancel }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const res = dbAddFaculty(name, email, password);
        if (res.success) onAdded();
        else setError(res.error);
    };

    return (
        <div className="glass-card anim-up" style={{ padding: 24, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 16 }}>👩‍🏫 Add Faculty Member</h4>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
            <form onSubmit={handleSubmit} className="g-3" style={{ gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Dr. Jane Smith" />
                </div>
                <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@dept.edu" />
                </div>
                <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 chars" />
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingBottom: 2 }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Add Faculty</button>
                </div>
            </form>
            <div style={{ marginTop: 10, textAlign: 'right' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

// ─── Bulk Import ──────────────────────────────────────────────────────────

function BulkImportTab({ user }) {
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);
    const fileRef = useRef();

    const downloadTemplate = () => {
        const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'acportal_import_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        return lines.slice(1).map(line => {
            const vals = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
            return obj;
        });
    };

    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(''); setResult(null); setProcessing(true);
        try {
            const text = await file.text();
            const rows = parseCSV(text);
            if (rows.length === 0) { setError('No data rows found in the CSV.'); setProcessing(false); return; }
            const res = dbBulkImportUsers(rows, user);
            setResult(res);
        } catch (err) {
            setError('Failed to parse the CSV file. Please use the template format.');
        }
        setProcessing(false);
        e.target.value = '';
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <div className="glass-card anim-up" style={{ padding: 28, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif" }}>📥 Bulk Import Users</h3>
                <p style={{ color: 'var(--text-2)', marginBottom: 24, fontSize: '0.87rem', lineHeight: 1.7 }}>
                    Download the CSV template, fill it with student and faculty details, then upload it here.
                    Duplicate emails are automatically skipped. All fields except <code style={{ color: 'var(--primary)' }}>usn</code> and <code style={{ color: 'var(--primary)' }}>semester</code> (for faculty) are required.
                </p>

                <div style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.8, overflowX: 'auto' }}>
                    <div style={{ color: 'var(--text-3)', marginBottom: 4, fontFamily: 'inherit', fontWeight: 700 }}>CSV Format:</div>
                    {CSV_TEMPLATE.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={downloadTemplate}>
                        ⬇ Download Template
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
                    <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={processing}>
                        {processing ? <><span className="spinner" /> Processing…</> : '📤 Upload & Import CSV'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {result && (
                <div className="glass-card anim-up" style={{ padding: 24 }}>
                    <h4 style={{ marginBottom: 16, color: 'var(--text-1)' }}>✅ Import Complete</h4>
                    <div className="g-3" style={{ gap: 12, marginBottom: result.errors?.length ? 16 : 0 }}>
                        <div style={{ padding: '14px 20px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>{result.created}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>Created</div>
                        </div>
                        <div style={{ padding: '14px 20px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>{result.skipped}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>Skipped (duplicate)</div>
                        </div>
                    </div>
                    {result.errors?.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.83rem', color: 'var(--danger)', marginBottom: 8 }}>Errors:</div>
                            {result.errors.map((e, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-2)', padding: '4px 0' }}>• {e}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Audit Logs ───────────────────────────────────────────────────────────

function AuditLogsTab() {
    const [logs, setLogs] = useState(dbGetLogs());
    const [filter, setFilter] = useState('');

    const filtered = logs.filter(l =>
        !filter ||
        l.action.toLowerCase().includes(filter.toLowerCase()) ||
        l.userName.toLowerCase().includes(filter.toLowerCase()) ||
        l.detail.toLowerCase().includes(filter.toLowerCase())
    );

    const actionColor = (action) => {
        if (action.includes('DELETE') || action.includes('REJECT')) return '#EF4444';
        if (action.includes('CREATE') || action.includes('REGISTER') || action.includes('SUBMIT')) return '#10B981';
        if (action.includes('LOGIN') || action.includes('LOGOUT')) return '#60A5FA';
        if (action.includes('IMPORT')) return '#F59E0B';
        return 'var(--text-3)';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <input className="form-input" style={{ maxWidth: 300 }} placeholder="Filter logs..." value={filter} onChange={e => setFilter(e.target.value)} />
                <button className="btn btn-ghost btn-sm" onClick={() => setLogs(dbGetLogs())}>↻ Refresh</button>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📋</span><p>No logs yet.</p></div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                {['Timestamp', 'Action', 'User', 'Role', 'Detail'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                                        {new Date(log.timestamp).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '9px 14px' }}>
                                        <span style={{ background: `${actionColor(log.action)}22`, color: actionColor(log.action), padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontSize: '0.77rem', fontFamily: 'monospace' }}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{log.userName}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-3)', textTransform: 'capitalize' }}>{log.role}</td>
                                    <td style={{ padding: '9px 14px', color: 'var(--text-2)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.detail || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
