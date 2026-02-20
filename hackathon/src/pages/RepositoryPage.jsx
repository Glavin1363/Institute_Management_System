import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { dbGetFiles, dbUploadFile } from '../data/db';
import { useAuth } from '../context/AuthContext';
import { fileEmoji } from './DashboardPage';

const SEMS = ['1', '2', '3', '4', '5', '6'];
const SUBJECTS = [
    { code: 'BCA301', name: 'Computer Organization' },
    { code: 'BCA302', name: 'Data Structures' },
    { code: 'BCA401', name: 'Analysis of Algorithms' },
    { code: 'BCA402', name: 'Operating Systems' },
    { code: 'BCA403', name: 'DBMS' },
    { code: 'BCA501', name: 'Computer Networks' },
    { code: 'BCA502', name: 'Software Engineering' },
    { code: 'BCA601', name: 'Machine Learning' },
    { code: 'BCA602', name: 'Cloud Computing' },
];
const PROFESSORS = ['Prof. Sharma', 'Prof. Meena Agarwal', 'Dr. Rajesh Kumar (HOD)'];
const ALLOWED = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

const fileIconClass = (t) => {
    t = (t || '').toLowerCase();
    if (t === 'pdf') return 'fi-pdf';
    if (t === 'ppt' || t === 'pptx') return 'fi-ppt';
    if (t === 'doc' || t === 'docx') return 'fi-doc';
    if (t === 'jpg' || t === 'jpeg' || t === 'png') return 'fi-img';
    return 'fi-url';
};

function PreviewModal({ file, onClose }) {
    const isImage = ['jpg', 'jpeg', 'png'].includes((file.type || '').toLowerCase());
    const isPdf = file.type?.toLowerCase() === 'pdf';
    const hasData = file.url && file.url.startsWith('data:');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 820, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                onClick={e => e.stopPropagation()}>
                <div className="modal-hdr">
                    <div className="modal-title">👁 {file.name}</div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '0 0 4px' }}>
                    {!hasData ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                            <div style={{ fontSize: '3rem' }}>{fileEmoji(file.type)}</div>
                            <p style={{ marginTop: 12 }}>No preview available for this file.<br />Click <strong>Download</strong> to save it.</p>
                        </div>
                    ) : isImage ? (
                        <img src={file.url} alt={file.name}
                            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
                    ) : isPdf ? (
                        <iframe src={file.url} title={file.name}
                            style={{ width: '100%', height: '70vh', border: 'none' }} />
                    ) : (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                            <div style={{ fontSize: '3rem' }}>{fileEmoji(file.type)}</div>
                            <p style={{ marginTop: 12 }}>Browser cannot preview <strong>.{file.type}</strong> files inline.<br />Click <strong>Download</strong> to open it.</p>
                        </div>
                    )}
                </div>
                {hasData && (
                    <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                        <a className="btn btn-primary btn-sm"
                            href={file.url}
                            download={`${file.name.replace(/[^a-zA-Z0-9._\-]/g, '_')}.${file.type}`}
                            style={{ textDecoration: 'none' }}>
                            ⬇ Download
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

function ResourceCard({ file }) {
    const [showPreview, setShowPreview] = useState(false);
    const [blobUrl, setBlobUrl] = useState(null);

    const ext = file.type === 'url' ? 'txt' : (file.type || 'bin');
    const filename = `${file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_')}.${ext}`;
    const hasRealFile = file.url && file.url.startsWith('data:');

    // Convert data URL → Blob → blob:// URL once on mount
    // Rendering an <a href={blobUrl} download={filename}> is the ONLY method
    // Chrome reliably uses the `download` attribute for. No programmatic clicks needed.
    React.useEffect(() => {
        if (!hasRealFile) return;
        try {
            const [header, b64] = file.url.split(',');
            const mime = header.match(/:(.*?);/)[1];
            const binary = atob(b64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: mime });
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
            return () => URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Blob creation failed:', e);
        }
    }, [file.url]);

    return (
        <>
            <div className="resource-card anim-up">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div className={`file-type-icon ${fileIconClass(file.type)}`}>{fileEmoji(file.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="res-name">{file.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                            <span className="badge badge-primary">{(file.type || '').toUpperCase()}</span>
                            <span className="badge badge-cyan">Sem {file.semester}</span>
                            <span className="badge badge-info">Unit {file.unit}</span>
                        </div>
                    </div>
                </div>

                {file.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.65, marginTop: -4 }}>
                        {file.description}
                    </p>
                )}

                <div className="res-meta">
                    <div className="res-meta-row">📖 <span>{file.subject} – {file.subjectName}</span></div>
                    <div className="res-meta-row">👤 <span>{file.uploadedBy}</span></div>
                    <div className="res-meta-row">📦 <span>{file.size}</span>  ⬇ <span>{file.downloads} downloads</span></div>
                    <div className="res-meta-row">🕒 <span>{new Date(file.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                </div>

                <div className="res-actions">
                    {blobUrl ? (
                        // Rendered <a> with blob:// href — Chrome ALWAYS uses `download` attr for this case
                        <a
                            className="btn btn-primary btn-sm"
                            href={blobUrl}
                            download={filename}
                            style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                        >
                            ⬇ Download
                        </a>
                    ) : (
                        <button className="btn btn-primary btn-sm"
                            style={{ flex: 1, opacity: hasRealFile ? 0.7 : 0.45, cursor: 'not-allowed' }} disabled>
                            {hasRealFile ? '⏳ Preparing…' : '⬇ No File'}
                        </button>
                    )}
                    <button className="btn btn-ghost btn-sm btn-icon" title="Preview"
                        onClick={() => setShowPreview(true)}>
                        👁
                    </button>
                </div>
            </div>

            {showPreview && <PreviewModal file={file} onClose={() => setShowPreview(false)} />}
        </>
    );
}

function UploadModal({ user, onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [subName, setSubName] = useState('');
    const [sem, setSem] = useState('4');
    const [unit, setUnit] = useState('1');
    const [desc, setDesc] = useState('');
    const [file, setFile] = useState(null);
    const [fileDataUrl, setFileDataUrl] = useState('');
    const [isUrl, setIsUrl] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragging, setDragging] = useState(false);

    const pickSubject = (code) => {
        setSubject(code);
        setSubName(SUBJECTS.find(s => s.code === code)?.name || '');
    };

    const handleFile = (f) => {
        if (!f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (!ALLOWED.includes(ext)) { setError(`".${ext}" not allowed. Use: PDF, PPT/PPTX, DOC/DOCX, JPG/PNG`); return; }
        setError(''); setFile(f);
        if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
        // Read file as base64 so it can be stored and later downloaded
        const reader = new FileReader();
        reader.onload = (e) => setFileDataUrl(e.target.result);
        reader.readAsDataURL(f);
    };

    const submit = async (e) => {
        e.preventDefault(); setError('');
        if (!name.trim() || !subject) { setError('Title and subject are required.'); return; }
        if (!isUrl && !file) { setError('Please select a file.'); return; }
        if (isUrl && !url.trim()) { setError('Please enter a URL.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 800));
        dbUploadFile({
            name: name.trim(), subject, subjectName: subName, semester: sem, unit,
            type: isUrl ? 'url' : file.name.split('.').pop().toLowerCase(),
            size: isUrl ? '—' : `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            description: desc.trim(),
            url: isUrl ? url : (fileDataUrl || '#'),
        }, user);
        onSuccess(user.role === 'student'
            ? `"${name}" submitted for review!`
            : `"${name}" published successfully!`);
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-hdr">
                    <div className="modal-title">⬆️ Upload Study Material</div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {user.role === 'student' && (
                    <div className="alert alert-info" style={{ marginBottom: 20 }}>
                        ℹ️ Your upload will need HOD/Faculty approval before going live.
                    </div>
                )}

                <form onSubmit={submit} className="form-stack">
                    {error && <div className="alert alert-error">⚠️ {error}</div>}

                    {/* Type toggle */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className={`btn btn-sm ${!isUrl ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setIsUrl(false)}>📄 File Upload</button>
                        {(user.role !== 'student') && (
                            <button type="button" className={`btn btn-sm ${isUrl ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setIsUrl(true)}>🔗 Reference Link</button>
                        )}
                    </div>

                    {!isUrl ? (
                        <div
                            className={`upload-zone ${dragging ? 'dragging' : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}>
                            <input type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={e => handleFile(e.target.files[0])} />
                            <span className="upload-icon">{file ? fileEmoji(file.name.split('.').pop()) : '📁'}</span>
                            <h4>{file ? file.name : 'Drag & drop or click to select'}</h4>
                            <p>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Accepted formats below'}</p>
                            <div className="file-type-chips">
                                {[['PDF', 'rgba(239,68,68,0.15)', 'rgba(239,68,68,0.4)', '#f87171'],
                                ['PPT', 'rgba(245,158,11,0.15)', 'rgba(245,158,11,0.4)', '#fbbf24'],
                                ['DOC', 'rgba(96,165,250,0.15)', 'rgba(96,165,250,0.4)', '#93c5fd'],
                                ['JPG/PNG', 'rgba(16,185,129,0.15)', 'rgba(16,185,129,0.4)', '#6ee7b7']].map(([l, bg, bd, c]) => (
                                    <span key={l} className="file-chip" style={{ background: bg, borderColor: bd, color: c }}>{l}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">URL *</label>
                            <input className="form-input" placeholder="https://example.com/resource"
                                value={url} onChange={e => setUrl(e.target.value)} />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input className="form-input" placeholder="e.g. Data Structures – Unit 1 Notes"
                            value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div className="g-2" style={{ gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <select className="form-select" value={subject} onChange={e => pickSubject(e.target.value)} required>
                                <option value="">Select subject…</option>
                                {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select className="form-select" value={sem} onChange={e => setSem(e.target.value)}>
                                {SEMS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Unit / Module</label>
                        <select className="form-select" value={unit} onChange={e => setUnit(e.target.value)}>
                            {[1, 2, 3, 4, 5].map(u => <option key={u} value={u}>Unit {u}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description (optional)</label>
                        <textarea className="form-textarea" rows={3}
                            placeholder="Brief description of this material…"
                            value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <><span className="spinner" /> Uploading…</> :
                                user.role === 'student' ? '📤 Submit for Review' : '🚀 Publish Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function RepositoryPage() {
    const { user } = useAuth();
    const [filterSem, setFilterSem] = useState('');
    const [filterSub, setFilterSub] = useState('');
    const [filterProf, setFilterProf] = useState('');
    const [query, setQuery] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [toast, setToast] = useState('');
    const [, rerender] = useState(0);

    const filters = { approvedOnly: true };
    if (filterSem) filters.semester = filterSem;
    if (filterSub) filters.subject = filterSub;
    if (filterProf) filters.professor = filterProf;
    if (query) filters.query = query;
    const files = dbGetFiles(filters);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1>📚 Smart Repository</h1>
                        <p>Filter, discover, and download department study materials.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                        ⬆ Upload Material
                    </button>
                </div>
            </div>

            <div className="page-content">
                {/* Filter bar */}
                <div className="filter-bar">
                    <div className="form-group" style={{ flex: 2, minWidth: 180 }}>
                        <label className="form-label">🔍 Search</label>
                        <input className="form-input" placeholder="Search files, subjects, uploaders…"
                            value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Semester</label>
                        <select className="form-select" value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                            <option value="">All Sems</option>
                            {SEMS.map(s => <option key={s} value={s}>Sem {s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject</label>
                        <select className="form-select" value={filterSub} onChange={e => setFilterSub(e.target.value)}>
                            <option value="">All Subjects</option>
                            {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Professor</label>
                        <select className="form-select" value={filterProf} onChange={e => setFilterProf(e.target.value)}>
                            <option value="">All Professors</option>
                            {PROFESSORS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 'none' }}>
                        <label className="form-label">&nbsp;</label>
                        <button className="btn btn-ghost"
                            onClick={() => { setFilterSem(''); setFilterSub(''); setFilterProf(''); setQuery(''); }}>
                            ✕ Clear
                        </button>
                    </div>
                </div>

                <div className="section-hdr">
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-3)', fontWeight: 600 }}>
                        {files.length} resource{files.length !== 1 ? 's' : ''} found
                    </div>
                </div>

                {files.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <h3 style={{ color: 'var(--text-2)' }}>No materials found</h3>
                        <p style={{ marginTop: 8 }}>Adjust filters or upload the first resource!</p>
                    </div>
                ) : (
                    <div className="resource-grid">
                        {files.map(f => <ResourceCard key={f.id} file={f} />)}
                    </div>
                )}
            </div>

            {showUpload && (
                <UploadModal user={user} onClose={() => setShowUpload(false)}
                    onSuccess={(msg) => { setShowUpload(false); rerender(n => n + 1); showToast(msg); }} />
            )}

            {toast && (
                <div className="toast toast-success">✓ {toast}</div>
            )}
        </div>
    );
}
