import React, { useState } from 'react';
import { dbGetFiles, dbApproveFile, dbRejectFile } from '../data/db';
import { useAuth } from '../context/AuthContext';
import { fileEmoji } from './DashboardPage';

export default function ReviewPage() {
    const { user } = useAuth();
    const [, rerender] = useState(0);
    const [toast, setToast] = useState({ msg: '', type: 'success' });

    const pending = dbGetFiles({ status: 'pending' });
    const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast({ msg: '', type: 'success' }), 3500); };

    const handleApprove = (file) => {
        dbApproveFile(file.id);
        rerender(n => n + 1);
        showToast(`✓ Approved: "${file.name}" is now live.`, 'success');
    };

    const handleReject = (file) => {
        if (window.confirm(`Reject and delete "${file.name}"? This cannot be undone.`)) {
            dbRejectFile(file.id); rerender(n => n + 1);
            showToast(`Rejected: "${file.name}" removed.`, 'danger');
        }
    };

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>🔍 Review Uploads</h1>
                <p>Approve or reject student-submitted materials before they go live in the repository.</p>
            </div>

            <div className="page-content">
                {pending.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <div style={{ fontSize: '5rem', marginBottom: 20, animation: 'float-emoji 4s ease-in-out infinite' }}>🎉</div>
                        <h3 style={{ color: 'var(--secondary)', marginBottom: 10 }}>All clear!</h3>
                        <p>No uploads pending review. Everything is up to date.</p>
                    </div>
                ) : (
                    <>
                        <div className="alert alert-warn anim-up" style={{ marginBottom: 24 }}>
                            ⚠️ <strong>{pending.length}</strong> file{pending.length !== 1 ? 's' : ''} awaiting your review.
                        </div>
                        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
                            <table className="review-table">
                                <thead>
                                    <tr>
                                        <th>File</th>
                                        <th>Subject / Sem</th>
                                        <th>Submitted By</th>
                                        <th>Date</th>
                                        <th>Size</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pending.map((file, i) => (
                                        <tr key={file.id} className={`anim-up stagger-${Math.min(i + 1, 5)}`}>
                                            <td className="file-name-col">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <span style={{ fontSize: '1.5rem' }}>{fileEmoji(file.type)}</span>
                                                    <div>
                                                        <div>{file.name}</div>
                                                        <span className="badge badge-pending" style={{ marginTop: 4 }}>{(file.type || '').toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{file.subject}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{file.subjectName} • Sem {file.semester}</div>
                                            </td>
                                            <td>
                                                <div>{file.uploadedBy}</div>
                                                <span className="badge badge-info" style={{ marginTop: 4 }}>Student</span>
                                            </td>
                                            <td>
                                                <div>{new Date(file.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                                                    {new Date(file.uploadDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td>{file.size}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-ghost btn-sm"
                                                        onClick={() => alert(`Preview: ${file.name}\n\nDescription: ${file.description || 'None'}\nUploaded by: ${file.uploadedBy}\nUnit: ${file.unit}`)}>
                                                        👁 View
                                                    </button>
                                                    <button className="btn btn-success btn-sm" onClick={() => handleApprove(file)}>✓ Approve</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(file)}>✕ Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {toast.msg && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-danger'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
