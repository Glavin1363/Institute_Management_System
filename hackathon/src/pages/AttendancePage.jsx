import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetAttendance, dbSaveAttendance } from '../data/db';

const SUBJECTS = [
    { code: 'BCA301', name: 'Computer Organization', sem: '3' },
    { code: 'BCA302', name: 'Data Structures', sem: '3' },
    { code: 'BCA401', name: 'Analysis of Algorithms', sem: '4' },
    { code: 'BCA402', name: 'Operating Systems', sem: '4' },
    { code: 'BCA403', name: 'DBMS', sem: '4' },
];

export default function AttendancePage() {
    const { user } = useAuth();
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [course, setCourse] = useState('BCA401');
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // studentId -> status (Present, Absent)
    const [toast, setToast] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter students natively based on course parameter
    const fetchStudentsForStaff = () => {
        const allUsers = JSON.parse(localStorage.getItem('acportal_users') || '[]');
        const targetCourse = SUBJECTS.find(s => s.code === course);
        const s = allUsers.filter(u => u.role === 'student' && (!targetCourse || u.semester === targetCourse.sem));
        setStudents(s);

        // Fetch existing attendance
        const existing = dbGetAttendance({ date, courseId: course });
        const map = {};
        s.forEach(stu => {
            const ex = existing.find(e => e.studentId === stu.id);
            map[stu.id] = ex ? ex.status : 'Present'; // default to present to save time
        });
        setAttendanceMap(map);
    };

    useEffect(() => {
        if (isStaff) fetchStudentsForStaff();
        // eslint-disable-next-line
    }, [course, date, isStaff]);

    const handleSave = () => {
        setLoading(true);
        const records = students.map(s => ({
            date,
            courseId: course,
            studentId: s.id,
            status: attendanceMap[s.id]
        }));

        setTimeout(() => {
            dbSaveAttendance(records, user);
            setLoading(false);
            setToast('Attendance saved successfully!');
            setTimeout(() => setToast(''), 3000);
        }, 500);
    };

    const toggleStatus = (id) => {
        setAttendanceMap(prev => ({
            ...prev,
            [id]: prev[id] === 'Present' ? 'Absent' : 'Present'
        }));
    };

    // ─── Student View ──────────────────────────────────────────────
    const myAttendance = dbGetAttendance({ studentId: user.id }) || [];
    // Group by course
    const stuSummary = {};
    myAttendance.forEach(a => {
        if (!stuSummary[a.courseId]) stuSummary[a.courseId] = { total: 0, attended: 0, history: [] };
        stuSummary[a.courseId].total += 1;
        if (a.status === 'Present') stuSummary[a.courseId].attended += 1;
        stuSummary[a.courseId].history.push(a);
    });

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div>
                    <h1>✅ Daily Attendance</h1>
                    <p>{isStaff ? 'Record and maintain student attendance logs.' : 'Track your class attendance and records.'}</p>
                </div>
            </div>

            <div className="page-content">
                {isStaff ? (
                    // FACULTY VIEW
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                                <label className="form-label">Date</label>
                                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                                <label className="form-label">Course / Subject</label>
                                <select className="form-select" value={course} onChange={e => setCourse(e.target.value)}>
                                    {SUBJECTS.map(s => <option key={s.code} value={s.code}>{s.code} – {s.name} (Sem {s.sem})</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="section-hdr">
                            <h3>Mark Students</h3>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : '💾 Save Attendance'}
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: '0.8rem', width: 60 }}>#</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: '0.8rem' }}>USN</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: '0.8rem' }}>Name</th>
                                        <th style={{ padding: '14px 16px', color: 'var(--text-3)', fontSize: '0.8rem', textAlign: 'right' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((stu, i) => {
                                        const isPresent = attendanceMap[stu.id] === 'Present';
                                        return (
                                            <tr key={stu.id} style={{ borderBottom: '1px solid var(--border)', background: !isPresent ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-3)' }}>{i + 1}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-2)' }}>{stu.usn || '—'}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-1)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="user-ava" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>{stu.avatar}</div>
                                                        {stu.name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => toggleStatus(stu.id)}
                                                        style={{
                                                            background: isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: isPresent ? '#10B981' : '#EF4444',
                                                            border: `1px solid ${isPresent ? '#10B981' : '#EF4444'}`,
                                                            padding: '4px 12px',
                                                            borderRadius: 20,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            transition: '0.2s'
                                                        }}>
                                                        {isPresent ? 'Present' : 'Absent'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: 30, textAlign: 'center', color: 'var(--text-4)' }}>No students enrolled in this semester.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // STUDENT VIEW
                    <div>
                        {Object.keys(stuSummary).length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📂</span>
                                <h3 style={{ color: 'var(--text-2)' }}>No Attendance Records Yet</h3>
                                <p>Your professors haven't taken any attendance for your courses.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {Object.keys(stuSummary).map(cId => {
                                    const sum = stuSummary[cId];
                                    const perc = Math.round((sum.attended / sum.total) * 100);
                                    return (
                                        <div key={cId} className="glass-card" style={{ padding: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-1)' }}>{cId} – {SUBJECTS.find(s => s.code === cId)?.name}</h3>
                                                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-3)', fontSize: '0.85rem' }}>Attended {sum.attended} out of {sum.total} classes</p>
                                                </div>
                                                <div style={{
                                                    background: perc < 75 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: perc < 75 ? '#EF4444' : '#10B981',
                                                    padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: '1.2rem'
                                                }}>
                                                    {perc}%
                                                </div>
                                            </div>

                                            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                                                <div style={{ width: `${perc}%`, height: '100%', background: perc < 75 ? '#EF4444' : '#10B981', borderRadius: 10 }}></div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                                {sum.history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(h => (
                                                    <div key={h.id} style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                                        padding: '6px 10px', borderRadius: 6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6
                                                    }}>
                                                        <span style={{ color: h.status === 'Present' ? '#10B981' : '#EF4444', fontWeight: 700 }}>{h.status === 'Present' ? '●' : '○'}</span>
                                                        <span style={{ color: 'var(--text-2)' }}>{h.date}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {toast && <div className="toast toast-success">✓ {toast}</div>}
        </div>
    );
}
