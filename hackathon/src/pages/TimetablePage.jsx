import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['09:00 AM', '10:00 AM', '11:15 AM', '12:15 PM', '02:00 PM', '03:00 PM'];

// Mock timetable data
const TIMETABLE_DATA = {
    '1': { // Semester 1
        'Monday': { '09:00 AM': { sub: 'BCA101', name: 'Programming in C', room: 'Room 201', teacher: 'Prof. Sharma' }, '10:00 AM': { sub: 'BCA102', name: 'Mathematics', room: 'Room 201', teacher: 'Dr. Rajesh' } },
        'Tuesday': { '11:15 AM': { sub: 'BCA103', name: 'Computer Fundamentals', room: 'Room 202', teacher: 'Prof. Meena' } },
        'Wednesday': { '09:00 AM': { sub: 'BCA101', name: 'Programming in C', room: 'Lab 1', teacher: 'Prof. Sharma' }, '02:00 PM': { sub: 'BCA102', name: 'Mathematics', room: 'Room 201', teacher: 'Dr. Rajesh' } },
        'Thursday': { '10:00 AM': { sub: 'BCA103', name: 'Computer Fundamentals', room: 'Room 202', teacher: 'Prof. Meena' } },
        'Friday': { '09:00 AM': { sub: 'BCA102', name: 'Mathematics', room: 'Room 201', teacher: 'Dr. Rajesh' }, '11:15 AM': { sub: 'BCA101', name: 'Programming in C', room: 'Room 201', teacher: 'Prof. Sharma' } },
    },
    '4': { // Semester 4
        'Monday': { '09:00 AM': { sub: 'BCA401', name: 'Analysis of Algorithms', room: 'Room 305', teacher: 'Prof. Sharma' }, '11:15 AM': { sub: 'BCA403', name: 'DBMS', room: 'Lab 2', teacher: 'Dr. Rajesh' }, '02:00 PM': { sub: 'BCA402', name: 'Operating Systems', room: 'Room 305', teacher: 'Prof. Meena' } },
        'Tuesday': { '10:00 AM': { sub: 'BCA401', name: 'Analysis of Algorithms', room: 'Room 305', teacher: 'Prof. Sharma' }, '12:15 PM': { sub: 'BCA402', name: 'Operating Systems', room: 'Room 305', teacher: 'Prof. Meena' } },
        'Wednesday': { '09:00 AM': { sub: 'BCA403', name: 'DBMS', room: 'Room 305', teacher: 'Dr. Rajesh' }, '02:00 PM': { sub: 'BCA401', name: 'Algorithms Lab', room: 'Lab 3', teacher: 'Prof. Sharma' } },
        'Thursday': { '11:15 AM': { sub: 'BCA402', name: 'Operating Systems', room: 'Room 305', teacher: 'Prof. Meena' }, '03:00 PM': { sub: 'BCA403', name: 'DBMS Lab', room: 'Lab 2', teacher: 'Dr. Rajesh' } },
        'Friday': { '10:00 AM': { sub: 'BCA401', name: 'Analysis of Algorithms', room: 'Room 305', teacher: 'Prof. Sharma' }, '12:15 PM': { sub: 'BCA402', name: 'Operating Systems', room: 'Room 305', teacher: 'Prof. Meena' } },
    }
};

export default function TimetablePage() {
    const { user } = useAuth();
    const isStudent = user.role === 'student';
    const [selectedSem, setSelectedSem] = useState(isStudent ? (user.semester || '4') : '4');

    const schedule = TIMETABLE_DATA[selectedSem] || {};

    return (
        <div className="anim-fade">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1>🕒 Class Timetable</h1>
                        <p>Weekly lecture and lab schedule.</p>
                    </div>
                    {!isStudent && (
                        <div className="form-group" style={{ minWidth: 200 }}>
                            <label className="form-label" style={{ color: 'var(--text-2)' }}>View Schedule For:</label>
                            <select className="form-select" value={selectedSem} onChange={e => setSelectedSem(e.target.value)}>
                                <option value="1">Semester 1</option>
                                <option value="4">Semester 4</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="page-content">
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', textAlign: 'center' }}>
                        <thead>
                            <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                                <th style={{ padding: 16, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', width: 100 }}>Day / Time</th>
                                {TIMES.map(t => (
                                    <th key={t} style={{ padding: 16, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', color: 'var(--text-1)', fontWeight: 700, fontSize: '0.85rem' }}>{t}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {DAYS.map(day => (
                                <tr key={day}>
                                    <td style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem', background: 'rgba(0,0,0,0.02)' }}>{day}</td>
                                    {TIMES.map(time => {
                                        const cell = schedule[day]?.[time];
                                        return (
                                            <td key={time} style={{ padding: 12, borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', verticalAlign: 'top', height: 100 }}>
                                                {cell ? (
                                                    <div style={{ background: 'rgba(99,102,241,0.1)', borderLeft: '3px solid var(--primary)', borderRadius: 6, padding: '10px 12px', textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{cell.sub}</div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 6, lineHeight: 1.3 }}>{cell.name}</div>
                                                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                                                            <span>📍 {cell.room}</span>
                                                            <span style={{ fontWeight: 600 }}>{cell.teacher}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-4)', fontSize: '0.75rem' }}>—</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
