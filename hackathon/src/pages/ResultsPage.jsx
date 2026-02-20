import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetResults, dbSaveResults } from '../data/db';

const SUBJECTS = [
    { code: 'Maths', name: 'Mathematics' },
    { code: 'BCA401', name: 'Analysis of Algorithms' },
    { code: 'BCA402', name: 'Operating Systems' },
];

export default function ResultsPage() {
    const { user } = useAuth();
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const [assessmentName, setAssessmentName] = useState('Midterm Exam');
    const [program, setProgram] = useState('BCA Sem 4');
    const [studentGroup, setStudentGroup] = useState('A');
    const [course, setCourse] = useState('BCA401');

    const [students, setStudents] = useState([]);
    const [resultsMap, setResultsMap] = useState({}); // studentId -> { theory, viva, comments, total, grade }
    const [toast, setToast] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch students
    const fetchStudentsForStaff = () => {
        const allUsers = JSON.parse(localStorage.getItem('acportal_users') || '[]');
        // In a real app we'd filter by program/group, here we just filter by role
        const s = allUsers.filter(u => u.role === 'student');
        setStudents(s);

        // Fetch existing results for this assessment + course
        const existingIdMatches = dbGetResults({ courseId: course }).filter(r => r.assessmentName === assessmentName);
        const map = {};
        s.forEach(stu => {
            const ex = existingIdMatches.find(e => e.studentId === stu.id);
            map[stu.id] = ex || { theory: '', viva: '', comments: '', total: '', grade: '' };
        });
        setResultsMap(map);
    };

    useEffect(() => {
        if (isStaff) fetchStudentsForStaff();
        // eslint-disable-next-line
    }, [course, assessmentName, program, studentGroup, isStaff]);

    const handleInputChange = (studentId, field, value) => {
        setResultsMap(prev => {
            const row = { ...prev[studentId], [field]: value };

            // Auto-calculate Total and Grade if Theory/Viva change
            if (field === 'theory' || field === 'viva') {
                const t = parseFloat(row.theory) || 0;
                const v = parseFloat(row.viva) || 0;
                row.total = (t + v).toString();

                const max = 45; // Assuming Theory 30 + Viva 15
                const perc = ((t + v) / max) * 100;
                if (perc >= 90) row.grade = 'O';
                else if (perc >= 80) row.grade = 'A+';
                else if (perc >= 70) row.grade = 'A';
                else if (perc >= 60) row.grade = 'B+';
                else if (perc >= 50) row.grade = 'B';
                else row.grade = 'F';
            }
            return { ...prev, [studentId]: row };
        });
    };

    const handleSave = () => {
        setLoading(true);
        const records = students.map(s => {
            const res = resultsMap[s.id];
            return {
                assessmentName,
                courseId: course,
                program,
                studentGroup,
                studentId: s.id,
                theoryScore: res.theory,
                vivaScore: res.viva,
                comments: res.comments,
                totalScore: res.total,
                grade: res.grade
            };
        });

        setTimeout(() => {
            dbSaveResults(records, user);
            setLoading(false);
            setToast('Results published successfully!');
            setTimeout(() => setToast(''), 3000);
        }, 500);
    };

    // ─── STUDENT VIEW ───
    const myResults = dbGetResults({ studentId: user.id });

    return (
        <div className="anim-fade" style={{ paddingBottom: 60 }}>
            <div className="page-header">
                <div>
                    <h1>📈 Assessment Results</h1>
                    <p>{isStaff ? 'Enter scores, grades, and feedback for students.' : 'Review your assessment scores and feedback.'}</p>
                </div>
            </div>

            <div className="page-content">
                {isStaff ? (
                    <div className="glass-card" style={{ padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
                        {/* Top Filters exactly matching user description */}
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Program</label>
                                <input type="text" className="form-input" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--border)' }} value={program} onChange={e => setProgram(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Student Group</label>
                                <input type="text" className="form-input" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--border)' }} value={studentGroup} onChange={e => setStudentGroup(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Assessment Name</label>
                                <input type="text" className="form-input" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--border)' }} value={assessmentName} onChange={e => setAssessmentName(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Course</label>
                                <select className="form-select" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--border)' }} value={course} onChange={e => setCourse(e.target.value)}>
                                    {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Table matching user description */}
                        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                            <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Student ID</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Student Name</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', textAlign: 'center', width: 120 }}>Theory Score (30)</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', textAlign: 'center', width: 120 }}>Viva Score (15)</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Comments</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', textAlign: 'center', width: 120 }}>Total Marks (45)</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', textAlign: 'center', width: 100 }}>Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((stu) => {
                                        const r = resultsMap[stu.id] || {};
                                        return (
                                            <tr key={stu.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-2)', fontSize: '0.85rem' }}>{stu.usn || stu.id.split('-').pop()}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-1)', fontSize: '0.85rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="user-ava" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>{stu.avatar}</div>
                                                        {stu.name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input type="number" className="form-input" style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.85rem' }} min="0" max="30" value={r.theory || ''} onChange={(e) => handleInputChange(stu.id, 'theory', e.target.value)} placeholder="0-30" />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input type="number" className="form-input" style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.85rem' }} min="0" max="15" value={r.viva || ''} onChange={(e) => handleInputChange(stu.id, 'viva', e.target.value)} placeholder="0-15" />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '0.85rem' }} value={r.comments || ''} onChange={(e) => handleInputChange(stu.id, 'comments', e.target.value)} placeholder="Remarks..." />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input type="text" className="form-input" style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.2)', color: 'var(--primary)' }} readOnly value={r.total || ''} placeholder="-" />
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input type="text" className="form-input" style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.85rem', fontWeight: 800, background: 'rgba(0,0,0,0.2)' }} readOnly value={r.grade || ''} placeholder="-" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-outline" onClick={() => fetchStudentsForStaff()}>
                                🔃 Refresh
                            </button>
                            <button className="btn btn-primary" onClick={handleSave} disabled={loading} style={{ minWidth: 140 }}>
                                {loading ? 'Saving...' : '💾 Save & Publish'}
                            </button>
                        </div>
                    </div>
                ) : (
                    // STUDENT VIEW
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {myResults.length === 0 ? (
                            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                <span className="empty-icon">📂</span>
                                <h3 style={{ color: 'var(--text-2)' }}>No Results Published</h3>
                                <p>Your professors haven't published any assessment results yet.</p>
                            </div>
                        ) : (
                            myResults.map(res => (
                                <div key={res.id} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>{res.courseId}</div>
                                            <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-1)' }}>{res.assessmentName}</h3>
                                        </div>
                                        <div style={{ background: 'var(--bg-layer-2)', display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                                            {res.grade || '-'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Theory Score</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-1)' }}>{res.theoryScore || 0} <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>/ 30</span></div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Viva Score</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-1)' }}>{res.vivaScore || 0} <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>/ 15</span></div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600 }}>Total Marks</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-1)' }}>{res.totalScore || 0} <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>/ 45</span></div>
                                        </div>
                                    </div>

                                    {res.comments && (
                                        <div style={{ background: 'rgba(99,102,241,0.08)', padding: '12px 16px', borderRadius: 8, borderLeft: '3px solid var(--primary)', fontSize: '0.85rem', color: 'var(--text-2)', fontStyle: 'italic' }}>
                                            "{res.comments}"
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {toast && <div className="toast toast-success" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>✓ {toast}</div>}
        </div>
    );
}
