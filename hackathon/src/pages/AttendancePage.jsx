import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetAttendance, dbSaveAttendance } from '../data/db';

export default function AttendancePage() {
    const { user } = useAuth();
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const [parsedData, setParsedData] = useState([]);
    const [toast, setToast] = useState('');
    const [toastError, setToastError] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const showToast = (msg, isError = false) => {
        if (isError) {
            setToastError(msg);
            setTimeout(() => setToastError(''), 4000);
        } else {
            setToast(msg);
            setTimeout(() => setToast(''), 4000);
        }
    };

    const downloadTemplate = () => {
        const allUsers = JSON.parse(localStorage.getItem('acportal_users') || '[]');
        const students = allUsers.filter(u => u.role === 'student');

        let csv = "USN,Name,Date,Course,Status\n";
        const today = new Date().toISOString().slice(0, 10);

        // Provide 1 blank row or pre-fill with existing students so teacher can just edit "Status".
        if (students.length > 0) {
            students.forEach(s => {
                csv += `${s.usn || ''},${s.name},${today},BCA401,Present\n`;
            });
        } else {
            csv += `USN001,John Doe,${today},BCA401,Present\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_Template_${today}.csv`;
        a.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);

            if (lines.length < 2) {
                showToast('Invalid or empty CSV file.', true);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const usnIdx = headers.indexOf('usn');
            const dateIdx = headers.indexOf('date');
            const courseIdx = headers.indexOf('course');
            const statusIdx = headers.findIndex(h => h.includes('status') || h === 'present/absent');

            if (usnIdx === -1 || dateIdx === -1 || courseIdx === -1 || statusIdx === -1) {
                showToast('CSV must contain headers: USN, Date, Course, Status', true);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            const parsed = [];
            const allUsers = JSON.parse(localStorage.getItem('acportal_users') || '[]');

            let missingUsns = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 4) continue;

                const usn = cols[usnIdx];
                const date = cols[dateIdx];
                const course = cols[courseIdx];
                let status = cols[statusIdx] || 'Present';

                // Normalizing P / A / Present / Absent (case insensitive)
                const char = status.toLowerCase()[0];
                if (char === 'p') status = 'Present';
                else if (char === 'a') status = 'Absent';
                else status = 'Present';

                const stu = allUsers.find(u => u.usn === usn && u.role === 'student');
                // Allow proceeding if USN exists
                if (stu) {
                    parsed.push({
                        studentId: stu.id,
                        usn: stu.usn,
                        name: stu.name, // override file's name with DB name for safety
                        date,
                        courseId: course,
                        status
                    });
                } else {
                    missingUsns++;
                }
            }

            setParsedData(parsed);
            if (missingUsns > 0) {
                showToast(`Parsed ${parsed.length} records. ${missingUsns} rows ignored (USN not found).`, false);
            } else if (parsed.length > 0) {
                showToast(`File parsed successfully! ${parsed.length} records ready to save.`);
            } else {
                showToast(`No valid student USNs found in the file.`, true);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const handleSave = () => {
        if (parsedData.length === 0) return;
        setLoading(true);
        setTimeout(() => {
            dbSaveAttendance(parsedData, user);
            setLoading(false);
            setParsedData([]);
            showToast('Attendance records published successfully!');
        }, 600);
    };

    // ─── Student View ──────────────────────────────────────────────
    const myAttendance = dbGetAttendance({ studentId: user.id }) || [];
    const stuSummary = {};
    myAttendance.forEach(a => {
        if (!stuSummary[a.courseId]) stuSummary[a.courseId] = { total: 0, attended: 0, history: [] };
        stuSummary[a.courseId].total += 1;
        if (a.status === 'Present') stuSummary[a.courseId].attended += 1;
        stuSummary[a.courseId].history.push(a);
    });

    return (
        <div className="anim-fade" style={{ paddingBottom: 60 }}>
            <div className="page-header">
                <div>
                    <h1>✅ Daily Attendance</h1>
                    <p>{isStaff ? 'Bulk import attendance via CSV / Excel.' : 'Track your class attendance and records.'}</p>
                </div>
            </div>

            <div className="page-content">
                {isStaff ? (
                    // FACULTY VIEW
                    <div className="glass-card" style={{ padding: 24, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, padding: 24, background: 'rgba(99,102,241,0.05)', borderRadius: 12, border: '1px dashed rgba(99,102,241,0.3)' }}>
                            <div style={{ flex: 1, minWidth: 280 }}>
                                <div style={{ width: 40, height: 40, background: 'rgba(124, 58, 237, 0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 12 }}>📥</div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-1)' }}>1. Download Template</h3>
                                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.5 }}>Get a pre-filled matching template holding columns for USN, Name, Date, Course, and Status.</p>
                                <button className="btn btn-outline" onClick={downloadTemplate}>
                                    📄 Download CSV Template
                                </button>
                            </div>

                            <div style={{ width: 1, background: 'var(--border)', margin: '0 10px' }} className="hide-mobile"></div>

                            <div style={{ flex: 1, minWidth: 280 }}>
                                <div style={{ width: 40, height: 40, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: 12 }}>📤</div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', color: 'var(--text-1)' }}>2. Upload Records</h3>
                                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: 1.5 }}>Upload the edited .csv file here. We will parse it and show a preview before you publish it.</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                                    ⬆️ Select & Parse CSV
                                </button>
                            </div>
                        </div>

                        {parsedData.length > 0 && (
                            <div className="anim-up">
                                <div className="section-hdr" style={{ marginTop: 32, marginBottom: 16 }}>
                                    <h3>Preview Data ({parsedData.length} records)</h3>
                                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading} style={{ minWidth: 150 }}>
                                        {loading ? 'Publishing...' : '💾 Publish to Database'}
                                    </button>
                                </div>

                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                                    <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                                <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>USN</th>
                                                <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Name</th>
                                                <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Date</th>
                                                <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)' }}>Course</th>
                                                <th style={{ padding: '12px 16px', color: 'var(--text-2)', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedData.slice(0, 15).map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: row.i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                    <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-2)', fontSize: '0.85rem' }}>{row.usn}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-1)', fontSize: '0.85rem' }}>{row.name}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: '0.85rem' }}>{row.date}</td>
                                                    <td style={{ padding: '10px 16px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>{row.courseId}</td>
                                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                                        <span style={{
                                                            background: row.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: row.status === 'Present' ? '#10B981' : '#EF4444',
                                                            border: `1px solid ${row.status === 'Present' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                            padding: '4px 10px',
                                                            borderRadius: 12,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700
                                                        }}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {parsedData.length > 15 && (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem', fontStyle: 'italic', background: 'rgba(0,0,0,0.1)' }}>
                                                        + {parsedData.length - 15} more rows parsed...
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // STUDENT VIEW
                    <div>
                        {Object.keys(stuSummary).length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">📂</span>
                                <h3 style={{ color: 'var(--text-2)' }}>No Attendance Records Yet</h3>
                                <p>Your professors haven't updated any sheets for your courses.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                                {Object.keys(stuSummary).map(cId => {
                                    const sum = stuSummary[cId];
                                    const perc = Math.round((sum.attended / sum.total) * 100);
                                    return (
                                        <div key={cId} className="glass-card" style={{ padding: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                                                <div>
                                                    <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-1)' }}>{cId}</h3>
                                                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-3)', fontSize: '0.85rem' }}>Attended {sum.attended} out of {sum.total} classes</p>
                                                </div>
                                                <div style={{
                                                    background: perc < 75 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                    color: perc < 75 ? '#EF4444' : '#10B981',
                                                    padding: '8px 16px', borderRadius: 10, fontWeight: 800, fontSize: '1.2rem',
                                                    border: `1px solid ${perc < 75 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                                }}>
                                                    {perc}%
                                                </div>
                                            </div>

                                            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                                                <div style={{ width: `${perc}%`, height: '100%', background: perc < 75 ? '#EF4444' : '#10B981', borderRadius: 10 }}></div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {sum.history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(h => (
                                                    <div key={h.id} style={{
                                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                                        padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6
                                                    }}>
                                                        <span style={{ color: h.status === 'Present' ? '#10B981' : '#EF4444', fontWeight: 900 }}>{h.status === 'Present' ? 'P' : 'A'}</span>
                                                        <span style={{ color: 'var(--text-3)' }}>{h.date.slice(5)}</span>
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

            {toast && <div className="toast toast-success" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>✓ {toast}</div>}
            {toastError && <div className="toast toast-error" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: '#EF4444', color: 'white' }}>⚠️ {toastError}</div>}
        </div>
    );
}
