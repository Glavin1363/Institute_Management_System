import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    dbGetQuizRoomsForUser, dbCreateQuizRoom, dbDeleteQuizRoom, dbCloseQuizRoom,
    dbGetQuizByCode, dbGetAttempts, dbGetMyAttempt, dbSubmitQuizAttempt,
} from '../data/db';

// ─── Main Quiz Page ───────────────────────────────────────────────────────

export default function QuizPage() {
    const { user } = useAuth();
    const isTeacher = user.role === 'faculty' || user.role === 'admin';

    return isTeacher ? <TeacherQuizView /> : <StudentQuizView />;
}

// ─── Student View ─────────────────────────────────────────────────────────

function StudentQuizView() {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [room, setRoom] = useState(null);
    const [error, setError] = useState('');
    const [phase, setPhase] = useState('join'); // join | attempt | result

    const handleJoin = (e) => {
        e.preventDefault();
        setError('');
        const found = dbGetQuizByCode(code);
        if (!found) { setError('Invalid room code. Please check and try again.'); return; }
        if (found.status === 'closed') { setError('This quiz room is closed.'); return; }
        const prev = dbGetMyAttempt(found.id, user.id);
        if (prev) { setRoom(found); setPhase('result'); return; }
        setRoom(found);
        setPhase('attempt');
    };

    if (phase === 'attempt' && room) {
        return <QuizAttempt room={room} onDone={(attempt) => setPhase('result')} />;
    }

    if (phase === 'result' && room) {
        const attempt = dbGetMyAttempt(room.id, user.id);
        return <QuizResult room={room} attempt={attempt} onBack={() => { setRoom(null); setPhase('join'); setCode(''); }} />;
    }

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>🎯 Quiz Room</h1>
                <p>Enter your quiz room code to begin.</p>
            </div>
            <div className="page-content">
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="glass-card anim-up" style={{ padding: 36, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎯</div>
                        <h3 style={{ marginBottom: 24, color: 'var(--text-1)' }}>Join a Quiz</h3>
                        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
                        <form onSubmit={handleJoin}>
                            <input
                                className="form-input"
                                placeholder="Enter 6-character room code"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.2em', fontWeight: 800, marginBottom: 16 }}
                                required
                            />
                            <button className="btn btn-primary btn-xl" type="submit" style={{ width: '100%' }}>
                                🚀 Join Quiz
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Quiz Attempt ─────────────────────────────────────────────────────────

function QuizAttempt({ room, onDone }) {
    const { user } = useAuth();
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const questions = room.questions || [];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (submitted) return;
        setSubmitted(true);
        const attempt = dbSubmitQuizAttempt(room.id, answers, room, user);
        onDone(attempt);
    };

    const answered = Object.keys(answers).length;

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>📝 {room.title}</h1>
                <p>By {room.teacherName} &nbsp;·&nbsp; {questions.length} questions</p>
            </div>
            <div className="page-content">
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 28 }}>
                        {questions.map((q, qi) => (
                            <div key={qi} className="glass-card anim-up" style={{ padding: 24 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, fontSize: '0.95rem' }}>
                                    Q{qi + 1}. {q.question}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {q.options.map((opt, oi) => (
                                        <label key={oi} style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                                            borderRadius: 8, cursor: 'pointer',
                                            background: answers[qi] === oi ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
                                            border: `1px solid ${answers[qi] === oi ? 'var(--primary)' : 'var(--border)'}`,
                                            transition: 'all 0.2s', fontSize: '0.88rem'
                                        }}>
                                            <input type="radio" name={`q${qi}`} value={oi}
                                                checked={answers[qi] === oi}
                                                onChange={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                                                style={{ accentColor: 'var(--primary)' }} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>
                            {answered} of {questions.length} answered
                        </span>
                        <button className="btn btn-primary btn-xl" type="submit" disabled={submitted}>
                            {submitted ? '✅ Submitted' : '📤 Submit Quiz'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Quiz Result ──────────────────────────────────────────────────────────

function QuizResult({ room, attempt, onBack }) {
    const pct = attempt ? Math.round((attempt.score / attempt.total) * 100) : 0;
    const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
    const emoji = pct >= 75 ? '🏆' : pct >= 50 ? '👍' : '📚';

    return (
        <div className="anim-fade">
            <div className="page-header">
                <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Back</button>
                <h1>🎯 Quiz Result</h1>
            </div>
            <div className="page-content">
                <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="glass-card anim-up" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>{emoji}</div>
                        <h2 style={{ color, fontSize: '2.5rem', fontWeight: 900, marginBottom: 4 }}>
                            {attempt ? `${attempt.score}/${attempt.total}` : '—'}
                        </h2>
                        <div style={{ fontSize: '1.1rem', color: 'var(--text-2)', marginBottom: 8 }}>
                            {pct}% &nbsp;·&nbsp; {room.title}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: 24 }}>
                            {pct >= 75 ? 'Excellent work!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
                        </div>

                        {/* Progress bar */}
                        <div style={{ background: 'var(--bg-surface)', borderRadius: 999, height: 12, overflow: 'hidden', marginBottom: 24 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 1s ease' }} />
                        </div>

                        {attempt && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                                Submitted: {new Date(attempt.submittedAt).toLocaleString('en-IN')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Teacher View ─────────────────────────────────────────────────────────

function TeacherQuizView() {
    const { user } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [toast, setToast] = useState('');

    const refresh = () => setRooms(dbGetQuizRoomsForUser(user));
    useEffect(() => { refresh(); }, []);

    const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

    const handleDelete = (id) => {
        if (!window.confirm('Delete this quiz room?')) return;
        dbDeleteQuizRoom(id, user);
        refresh();
        showToast('Quiz room deleted.');
    };

    const handleClose = (id) => {
        dbCloseQuizRoom(id, user);
        refresh();
        showToast('Quiz room closed.');
    };

    if (viewing) {
        return <QuizRoomDetail room={viewing} onBack={() => { setViewing(null); refresh(); }} />;
    }

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>🎯 Quiz Rooms</h1>
                        <p>Create quiz rooms and share the code with students.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(v => !v)}>
                        {showCreate ? '✕ Cancel' : '+ Create Quiz Room'}
                    </button>
                </div>
            </div>

            <div className="page-content">
                {showCreate && (
                    <CreateQuizRoomForm user={user}
                        onCreated={() => { setShowCreate(false); refresh(); showToast('Quiz room created!'); }}
                        onCancel={() => setShowCreate(false)} />
                )}

                {rooms.length === 0 && !showCreate ? (
                    <div className="empty-state"><span className="empty-icon">🎯</span><p>No quiz rooms yet. Create one to get started.</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {rooms.map(r => {
                            const attempts = dbGetAttempts(r.id);
                            return (
                                <div key={r.id} className="glass-card" style={{ padding: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
                                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setViewing(r)}>
                                        <div style={{ fontWeight: 800, color: 'var(--text-1)', marginBottom: 6, fontSize: '1rem' }}>{r.title}</div>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                            {/* Room code chip */}
                                            <span style={{
                                                fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 900,
                                                background: 'rgba(99,102,241,0.15)', color: 'var(--primary)',
                                                padding: '3px 14px', borderRadius: 8, letterSpacing: '0.15em'
                                            }}>{r.code}</span>
                                            <span className={`badge ${r.status === 'open' ? 'badge-success' : ''}`}
                                                style={r.status === 'open' ? { background: 'rgba(16,185,129,0.15)', color: '#10B981' } : {}}>
                                                {r.status === 'open' ? '🟢 Open' : '🔴 Closed'}
                                            </span>
                                            <span className="badge badge-primary">{r.questions?.length || 0} questions</span>
                                            <span className="badge badge-primary">{attempts.length} attempts</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {r.status === 'open' && (
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleClose(r.id)}>🔒 Close</button>
                                        )}
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(r.id)}>🗑</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {toast && <div className="toast toast-success">✓ {toast}</div>}
        </div>
    );
}

// ─── Create Quiz Room ─────────────────────────────────────────────────────

function CreateQuizRoomForm({ user, onCreated, onCancel }) {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([
        { question: '', options: ['', '', '', ''], correctIndex: 0 }
    ]);

    const addQuestion = () => setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctIndex: 0 }]);
    const removeQuestion = (qi) => setQuestions(prev => prev.filter((_, i) => i !== qi));

    const updateQuestion = (qi, field, val) => {
        setQuestions(prev => {
            const copy = [...prev];
            copy[qi] = { ...copy[qi], [field]: val };
            return copy;
        });
    };

    const updateOption = (qi, oi, val) => {
        setQuestions(prev => {
            const copy = [...prev];
            const opts = [...copy[qi].options];
            opts[oi] = val;
            copy[qi] = { ...copy[qi], options: opts };
            return copy;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const valid = questions.every(q => q.question.trim() && q.options.every(o => o.trim()));
        if (!valid) { alert('Please fill all questions and options.'); return; }
        dbCreateQuizRoom({ title, questions }, user);
        onCreated();
    };

    return (
        <div className="glass-card anim-up" style={{ padding: 28, marginBottom: 28 }}>
            <h3 style={{ marginBottom: 20, fontFamily: "'Space Grotesk', sans-serif" }}>🎯 New Quiz Room</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: 24 }}>
                    <label className="form-label">Quiz Title *</label>
                    <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Unit 1 MCQ Test" />
                </div>

                <div style={{ marginBottom: 16, fontWeight: 700, color: 'var(--text-2)', fontSize: '0.88rem' }}>
                    Questions ({questions.length})
                </div>

                {questions.map((q, qi) => (
                    <div key={qi} className="glass-card" style={{ padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-2)' }}>Q{qi + 1}</div>
                            {questions.length > 1 && (
                                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '2px 8px' }}
                                    onClick={() => removeQuestion(qi)}>✕</button>
                            )}
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <input className="form-input" placeholder="Question text..." value={q.question}
                                onChange={e => updateQuestion(qi, 'question', e.target.value)} required />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {q.options.map((opt, oi) => (
                                <div key={oi} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi}
                                        onChange={() => updateQuestion(qi, 'correctIndex', oi)}
                                        style={{ accentColor: 'var(--primary)', marginTop: 2 }}
                                        title="Mark as correct answer" />
                                    <input className="form-input" style={{ flex: 1, padding: '8px 12px' }}
                                        placeholder={`Option ${oi + 1}${q.correctIndex === oi ? ' (correct)' : ''}`}
                                        value={opt} onChange={e => updateOption(qi, oi, e.target.value)} required />
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 8 }}>
                            Select the radio button next to the correct answer.
                        </div>
                    </div>
                ))}

                <button type="button" className="btn btn-ghost btn-sm" onClick={addQuestion} style={{ marginBottom: 24 }}>
                    + Add Question
                </button>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                    <button type="submit" className="btn btn-primary">🎯 Create Quiz Room</button>
                </div>
            </form>
        </div>
    );
}

// ─── Quiz Room Detail (teacher sees attempts) ─────────────────────────────

function QuizRoomDetail({ room, onBack }) {
    const attempts = dbGetAttempts(room.id);
    const avg = attempts.length > 0
        ? (attempts.reduce((s, a) => s + a.score, 0) / attempts.length / room.questions.length * 100).toFixed(0)
        : null;

    return (
        <div className="anim-fade">
            <div className="page-header">
                <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 12 }}>← Back to Quiz Rooms</button>
                <h1>🎯 {room.title}</h1>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.15em' }}>{room.code}</span>
                    <span className="badge badge-primary">{room.questions.length} questions</span>
                    <span className={`badge ${room.status === 'open' ? '' : ''}`}
                        style={{ background: room.status === 'open' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: room.status === 'open' ? '#10B981' : '#f87171' }}>
                        {room.status === 'open' ? '🟢 Open' : '🔴 Closed'}
                    </span>
                </div>
            </div>

            <div className="page-content">
                <div className="g-3" style={{ marginBottom: 28, gap: 16 }}>
                    <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{attempts.length}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>Attempts</div>
                    </div>
                    <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10B981' }}>{avg !== null ? `${avg}%` : '—'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>Avg Score</div>
                    </div>
                    <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F59E0B' }}>
                            {attempts.length > 0 ? `${Math.max(...attempts.map(a => a.score))}/${room.questions.length}` : '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>Top Score</div>
                    </div>
                </div>

                <div className="section-hdr" style={{ marginBottom: 14 }}><h3>📊 Student Results</h3></div>
                {attempts.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📊</span><p>No attempts yet. Share the room code with students.</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    {['Student', 'USN', 'Score', '%', 'Submitted'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map(a => {
                                    const pct = Math.round(a.score / a.total * 100);
                                    const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
                                    return (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 14px', color: 'var(--text-1)', fontWeight: 600 }}>{a.studentName}</td>
                                            <td style={{ padding: '10px 14px', color: 'var(--text-3)' }}>{a.studentUsn || '—'}</td>
                                            <td style={{ padding: '10px 14px', fontWeight: 700, color }}>{a.score}/{a.total}</td>
                                            <td style={{ padding: '10px 14px' }}>
                                                <span style={{ background: `${color}22`, color, padding: '2px 10px', borderRadius: 99, fontWeight: 700, fontSize: '0.8rem' }}>{pct}%</span>
                                            </td>
                                            <td style={{ padding: '10px 14px', color: 'var(--text-3)' }}>{new Date(a.submittedAt).toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
