import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    dbGetClassroomsForUser, dbCreateClassroom, dbDeleteClassroom, dbUpdateClassroom,
    dbAddNoteToClassroom, dbDeleteNoteFromClassroom,
    dbGetAssignments, dbCreateAssignment, dbDeleteAssignment,
    dbGetSubmissions, dbGetMySubmission, dbSubmitAssignment,
    dbGetStudents
} from '../data/db';

const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
});

// ─── Classroom List (teacher / student) ────────────────────────────────────

function ClassroomsPage() {
    const { user } = useAuth();
    const isTeacher = user.role === 'faculty' || user.role === 'admin';
    const [classrooms, setClassrooms] = useState([]);
    const [selected, setSelected] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [toast, setToast] = useState('');

    const refresh = () => setClassrooms(dbGetClassroomsForUser(user));
    useEffect(() => { refresh(); }, []);

    const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

    const handleDelete = (id) => {
        if (!window.confirm('Delete this classroom?')) return;
        dbDeleteClassroom(id, user);
        refresh();
        showToast('Classroom deleted.');
    };

    if (selected) {
        return (
            <ClassroomDetail
                classroom={selected}
                onBack={() => { setSelected(null); refresh(); }}
                isTeacher={isTeacher}
                showToast={showToast}
            />
        );
    }

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>🏫 Classrooms</h1>
                        <p>{isTeacher ? 'Manage your classes and assignments.' : 'View your enrolled classes.'}</p>
                    </div>
                    {isTeacher && (
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Classroom</button>
                    )}
                </div>
            </div>

            <div className="page-content">
                {showCreate && (
                    <CreateClassroomForm user={user} onCreated={() => { setShowCreate(false); refresh(); showToast('Classroom created!'); }} onCancel={() => setShowCreate(false)} />
                )}

                {classrooms.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🏫</span>
                        <p>{isTeacher ? 'No classrooms yet. Create one to get started.' : 'You have not been added to any classroom yet.'}</p>
                    </div>
                ) : (
                    <div className="g-3" style={{ gap: 20 }}>
                        {classrooms.map((cls, i) => (
                            <div key={cls.id} className={`glass-card stagger-${(i % 4) + 1} anim-up`}
                                style={{ padding: 24, cursor: 'pointer', position: 'relative' }}
                                onClick={() => setSelected(cls)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📗</div>
                                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-1)', marginBottom: 4 }}>{cls.name}</div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{cls.subject}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 6 }}>
                                            👩‍🏫 {cls.teacherName} &nbsp;• &nbsp;👥 {cls.studentIds?.length || 0} students
                                        </div>
                                    </div>
                                    {isTeacher && (
                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }}
                                            style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>🗑</button>
                                    )}
                                </div>
                                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                                    <span className="badge badge-primary">{(cls.notes || []).length} notes</span>
                                    <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>Open →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {toast && <div className="toast toast-success">✓ {toast}</div>}
        </div>
    );
}

// ─── Create Classroom Form ────────────────────────────────────────────────

function CreateClassroomForm({ user, onCreated, onCancel }) {
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [studentQuery, setStudentQuery] = useState('');
    const [selected, setSelected] = useState([]);
    const allStudents = dbGetStudents();

    const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(studentQuery.toLowerCase()) ||
        (s.usn || '').toLowerCase().includes(studentQuery.toLowerCase())
    );

    const toggle = (s) => setSelected(prev =>
        prev.find(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !subject.trim()) return;
        dbCreateClassroom({ name, subject, studentIds: selected.map(s => s.id) }, user);
        onCreated();
    };

    return (
        <div className="glass-card anim-up" style={{ padding: 28, marginBottom: 28 }}>
            <h3 style={{ marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif" }}>📗 New Classroom</h3>
            <form onSubmit={handleSubmit}>
                <div className="g-2" style={{ gap: 16, marginBottom: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Class Name *</label>
                        <input className="form-input" placeholder="e.g. BCA 3rd Sem" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject *</label>
                        <input className="form-input" placeholder="e.g. Data Structures" value={subject} onChange={e => setSubject(e.target.value)} required />
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Add Students (search by name / USN)</label>
                    <input className="form-input" placeholder="Search student..." value={studentQuery} onChange={e => setStudentQuery(e.target.value)} />
                    <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {filtered.slice(0, 20).map(s => (
                            <label key={s.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                                background: selected.find(x => x.id === s.id) ? 'rgba(99,102,241,0.15)' : 'var(--bg-surface)',
                                cursor: 'pointer', border: '1px solid var(--border)', fontSize: '0.83rem'
                            }}>
                                <input type="checkbox" checked={!!selected.find(x => x.id === s.id)} onChange={() => toggle(s)} />
                                <span style={{ flex: 1 }}>{s.name}</span>
                                <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>{s.usn}</span>
                            </label>
                        ))}
                        {filtered.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', padding: '8px 12px' }}>No students found.</div>}
                    </div>
                    {selected.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-2)' }}>
                            Selected: {selected.map(s => s.name).join(', ')}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="btn btn-primary">✓ Create Classroom</button>
                </div>
            </form>
        </div>
    );
}

// ─── Classroom Detail ─────────────────────────────────────────────────────

function ClassroomDetail({ classroom, onBack, isTeacher, showToast }) {
    const { user } = useAuth();
    const [tab, setTab] = useState('assignments');
    const [classroomData, setClassroomData] = useState(classroom);

    const refreshClassroom = () => {
        // Re-fetch classroom from localStorage directly (avoids require() in ESM)
        const all = JSON.parse(localStorage.getItem('acportal_classrooms') || '[]');
        const fresh = all.find(c => c.id === classroom.id);
        if (fresh) setClassroomData(fresh);
    };

    return (
        <div className="anim-fade">
            <div className="page-header">
                <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Back to Classrooms</button>
                <h1>📗 {classroomData.name}</h1>
                <p style={{ color: 'var(--text-3)' }}>{classroomData.subject} &nbsp;·&nbsp; 👩‍🏫 {classroomData.teacherName}</p>
            </div>

            <div className="page-content">
                {/* Tabs */}
                <div className="role-tabs" style={{ marginBottom: 24, width: 'fit-content' }}>
                    {['assignments', 'notes', ...(isTeacher ? ['students'] : [])].map(t => (
                        <button key={t} type="button"
                            className={`role-tab ${tab === t ? 'active' : ''}`}
                            onClick={() => setTab(t)}>
                            {t === 'assignments' ? '📝 Assignments' : t === 'notes' ? '📄 Notes' : '👥 Students'}
                        </button>
                    ))}
                </div>

                {tab === 'assignments' && (
                    <AssignmentsTab classroomId={classroomData.id} isTeacher={isTeacher} showToast={showToast} />
                )}
                {tab === 'notes' && (
                    <NotesTab classroom={classroomData} isTeacher={isTeacher} showToast={showToast} onRefresh={refreshClassroom} />
                )}
                {tab === 'students' && isTeacher && (
                    <StudentsTab classroomId={classroomData.id} studentIds={classroomData.studentIds || []} />
                )}
            </div>
        </div>
    );
}

// ─── Assignments Tab ──────────────────────────────────────────────────────

function AssignmentsTab({ classroomId, isTeacher, showToast }) {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [viewing, setViewing] = useState(null);

    const refresh = () => setAssignments(dbGetAssignments(classroomId));
    useEffect(() => { refresh(); }, [classroomId]);

    const handleCreate = (data) => {
        dbCreateAssignment({ ...data, classroomId }, user);
        refresh();
        setShowCreate(false);
        showToast('Assignment created!');
    };

    const handleDelete = (id) => {
        if (!window.confirm('Delete this assignment?')) return;
        dbDeleteAssignment(id, user);
        refresh();
        showToast('Assignment deleted.');
    };

    if (viewing) {
        return <AssignmentDetail assignment={viewing} isTeacher={isTeacher} onBack={() => { setViewing(null); refresh(); }} showToast={showToast} />;
    }

    return (
        <div>
            {isTeacher && (
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(v => !v)}>
                        {showCreate ? '✕ Cancel' : '+ New Assignment'}
                    </button>
                </div>
            )}

            {showCreate && (
                <div className="glass-card anim-up" style={{ padding: 24, marginBottom: 20 }}>
                    <h4 style={{ marginBottom: 16 }}>📝 New Assignment</h4>
                    <CreateAssignmentForm onSubmit={handleCreate} onCancel={() => setShowCreate(false)} />
                </div>
            )}

            {assignments.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📝</span><p>No assignments yet.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assignments.map(a => {
                        const mySub = !isTeacher ? dbGetMySubmission(a.id, user.id) : null;
                        const allSubs = isTeacher ? dbGetSubmissions(a.id) : [];
                        return (
                            <div key={a.id} className="glass-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setViewing(a)}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{a.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                                        By {a.createdBy} &nbsp;·&nbsp; {a.dueDate ? `Due: ${new Date(a.dueDate).toLocaleDateString('en-IN')}` : 'No due date'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {isTeacher ? (
                                        <>
                                            <span className="badge badge-primary">{allSubs.length} submitted</span>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(a.id)}>🗑</button>
                                        </>
                                    ) : (
                                        <span className={`badge ${mySub ? 'badge-success' : ''}`}
                                            style={mySub ? { background: 'rgba(16,185,129,0.2)', color: '#10B981' } : {}}>
                                            {mySub ? '✅ Submitted' : '⏳ Pending'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CreateAssignmentForm({ onSubmit, onCancel }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit({ title, description, dueDate }); };
    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Assignment title" />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Description</label>
                <textarea className="form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Instructions..." />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Due Date</label>
                <input className="form-input" type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create</button>
            </div>
        </form>
    );
}

// ─── Assignment Detail (student submits / teacher views) ──────────────────

function AssignmentDetail({ assignment, isTeacher, onBack, showToast }) {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [mySub, setMySub] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const refresh = () => {
        if (isTeacher) setSubmissions(dbGetSubmissions(assignment.id));
        else setMySub(dbGetMySubmission(assignment.id, user.id));
    };
    useEffect(() => { refresh(); }, [assignment.id]);

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true);
        const data = await fileToBase64(file);
        dbSubmitAssignment(assignment.id, { name: file.name, data, type: file.type }, user);
        refresh();
        setFile(null);
        setUploading(false);
        showToast('Assignment submitted!');
    };

    return (
        <div>
            <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
            <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                <h3 style={{ color: 'var(--text-1)', marginBottom: 10 }}>📝 {assignment.title}</h3>
                {assignment.description && <p style={{ color: 'var(--text-2)', marginBottom: 10 }}>{assignment.description}</p>}
                {assignment.dueDate && (
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-3)' }}>
                        ⏰ Due: {new Date(assignment.dueDate).toLocaleString('en-IN')}
                    </div>
                )}
            </div>

            {isTeacher ? (
                <div>
                    <div className="section-hdr" style={{ marginBottom: 16 }}>
                        <h3>📬 Submissions ({submissions.length})</h3>
                    </div>
                    {submissions.length === 0 ? (
                        <div className="empty-state"><span className="empty-icon">📭</span><p>No submissions yet.</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {submissions.map(s => (
                                <div key={s.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9rem' }}>{s.studentName}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                                            {s.studentUsn} &nbsp;·&nbsp; {new Date(s.submittedAt).toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                    <a href={s.fileData} download={s.fileName}
                                        className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>
                                        ⬇ {s.fileName}
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="glass-card" style={{ padding: 24 }}>
                    <h4 style={{ marginBottom: 16, color: 'var(--text-1)' }}>📤 Your Submission</h4>
                    {mySub ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ color: '#10B981', fontWeight: 700, marginBottom: 4 }}>✅ Submitted</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                                    {mySub.fileName} &nbsp;·&nbsp; {new Date(mySub.submittedAt).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Re-submit</button>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-3)', marginBottom: 16, fontSize: '0.85rem' }}>Upload your assignment file below.</p>
                    )}
                    <div style={{ marginTop: 16 }}>
                        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
                        {!mySub && (
                            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>📎 Choose File</button>
                        )}
                        {file && <span style={{ marginLeft: 12, fontSize: '0.8rem', color: 'var(--text-2)' }}>{file.name}</span>}
                        {file && (
                            <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={uploading} style={{ marginLeft: 12 }}>
                                {uploading ? <><span className="spinner" /> Uploading…</> : '📤 Submit'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────

function NotesTab({ classroom, isTeacher, showToast, onRefresh }) {
    const { user } = useAuth();
    const [notes, setNotes] = useState(classroom.notes || []);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();

    const refresh = () => {
        const all = JSON.parse(localStorage.getItem('acportal_classrooms') || '[]');
        const fresh = all.find(c => c.id === classroom.id);
        if (fresh) setNotes(fresh.notes || []);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fileData = await fileToBase64(file);
        dbAddNoteToClassroom(classroom.id, { name: file.name, fileData, type: file.type }, user);
        refresh();
        setUploading(false);
        showToast('Note uploaded!');
    };

    const handleDelete = (noteId) => {
        dbDeleteNoteFromClassroom(classroom.id, noteId, user);
        refresh();
        showToast('Note deleted.');
    };

    return (
        <div>
            {isTeacher && (
                <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
                    <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <><span className="spinner" /> Uploading…</> : '📤 Upload Note'}
                    </button>
                </div>
            )}

            {notes.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📄</span><p>No notes uploaded yet.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notes.map(note => (
                        <div key={note.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: '1.8rem' }}>📄</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9rem' }}>{note.name}</div>
                                <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginTop: 2 }}>
                                    By {note.uploadedBy} &nbsp;·&nbsp; {new Date(note.uploadedAt).toLocaleDateString('en-IN')}
                                </div>
                            </div>
                            <a href={note.fileData} download={note.name} className="btn btn-ghost btn-sm">⬇ Download</a>
                            {isTeacher && (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(note.id)}>🗑</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Students Tab ─────────────────────────────────────────────────────────

function StudentsTab({ classroomId, studentIds }) {
    const allStudents = dbGetStudents();
    const enrolled = allStudents.filter(s => studentIds.includes(s.id));
    return (
        <div>
            <div style={{ marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-3)' }}>
                {enrolled.length} student{enrolled.length !== 1 ? 's' : ''} enrolled
            </div>
            {enrolled.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">👥</span><p>No students enrolled.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {enrolled.map(s => (
                        <div key={s.id} className="glass-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>{s.avatar}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.9rem' }}>{s.name}</div>
                                <div style={{ fontSize: '0.77rem', color: 'var(--text-3)', marginTop: 2 }}>{s.usn} &nbsp;·&nbsp; Sem {s.semester}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ClassroomsPage;
