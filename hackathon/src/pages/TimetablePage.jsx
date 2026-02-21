import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetTimetable, dbSaveTimetable, dbGetAllUsers } from '../data/db';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
    const { user } = useAuth();
    const isStaff = user.role === 'admin' || user.role === 'faculty';
    const facultyList = dbGetAllUsers().filter(u => u.role === 'faculty');

    // Selections
    const [program, setProgram] = useState(user.program || 'BCA');
    const [section, setSection] = useState(user.section || 'A');

    // Data State
    const [periods, setPeriods] = useState([]);

    // Editor State
    const [editMode, setEditMode] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState('');

    // Form inputs
    const [fDay, setFDay] = useState('Monday');
    const [fStart, setFStart] = useState('09:00');
    const [fEnd, setFEnd] = useState('10:00');
    const [fSub, setFSub] = useState('');
    const [fName, setFName] = useState('');
    const [fRoom, setFRoom] = useState('');
    const [fTeacher, setFTeacher] = useState('');
    const [fIsBreak, setFIsBreak] = useState(false);

    const [manualTeacher, setManualTeacher] = useState(false);
    const [manualSub, setManualSub] = useState(false);

    const selectedFac = facultyList.find(f => f.name === fTeacher);
    const allocatedSubs = (selectedFac?.allocations?.find(a => a.program === program && a.section === section)?.subjects) || [];

    const loadData = () => {
        const courseId = `${program}-${section}`;
        const data = dbGetTimetable({ courseId });
        setPeriods(data);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line
    }, [program, section]);

    const handleAddPeriod = (e) => {
        e.preventDefault();
        if (!fStart || !fEnd || !fSub) {
            alert('Start time, end time, and subject code are required.');
            return;
        }

        const newPeriod = {
            id: Date.now().toString(),
            dayOfWeek: fDay,
            startTime: fStart,
            endTime: fEnd,
            sub: fSub,
            name: fIsBreak ? '' : fName,
            room: fIsBreak ? '' : fRoom,
            teacher: fIsBreak ? '' : fTeacher,
            isBreak: fIsBreak
        };

        setPeriods(prev => [...prev, newPeriod]);
        setShowForm(false);
        // Reset sub/name but keep times roughly intact for easy sequential entry
        setFSub(''); setFName(''); setFIsBreak(false); setFStart(fEnd);
    };

    const handleDelete = (id) => {
        setPeriods(prev => prev.filter(p => p.id !== id));
    };

    const handleSave = () => {
        setLoading(true);
        setTimeout(() => {
            dbSaveTimetable(`${program}-${section}`, periods, user);
            setLoading(false);
            setEditMode(false);
            setToast('Timetable published successfully!');
            setTimeout(() => setToast(''), 3000);
        }, 500);
    };

    // Helper to format time (09:00 -> 09:00 AM)
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        let hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    // Helper to calculate approximate flex width based on duration
    const getDurationMins = (start, end) => {
        if (!start || !end) return 60;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        return (eH * 60 + eM) - (sH * 60 + sM);
    };

    return (
        <div className="anim-fade" style={{ paddingBottom: 60 }}>
            <div className="page-header">
                <div>
                    <h1>🕒 Class Timetable</h1>
                    <p>{isStaff ? 'Build and manage flexible schedules for any class.' : `Your weekly schedule for ${program} - Section ${section}.`}</p>
                </div>
            </div>

            <div className="page-content">
                {isStaff && (
                    <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label">Program</label>
                            <select className="form-select" value={program} onChange={e => { setProgram(e.target.value); setEditMode(false); }}>
                                <option value="BCA">BCA</option>
                                <option value="BBA">BBA</option>
                                <option value="B.COM">B.COM</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label">Section / Class</label>
                            <select className="form-select" value={section} onChange={e => { setSection(e.target.value); setEditMode(false); }}>
                                <option value="A">Section A</option>
                                <option value="B">Section B</option>
                                <option value="C">Section C</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {editMode ? (
                                <>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                        {loading ? 'Saving...' : '💾 Save Changes'}
                                    </button>
                                    <button className="btn btn-outline" onClick={() => { setEditMode(false); loadData(); setShowForm(false); }}>
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button className="btn btn-outline" onClick={() => setEditMode(true)}>
                                    ✏️ Edit Timetable
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {editMode && (
                    <div className="anim-down" style={{ background: 'var(--bg-layer-2)', border: '1px solid var(--primary)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, color: 'var(--text-1)' }}>➕ Add New Period</h3>
                            <button className="btn btn-sm btn-outline" onClick={() => setShowForm(!showForm)}>
                                {showForm ? 'Hide Form' : 'Show Form'}
                            </button>
                        </div>

                        {showForm && (
                            <form onSubmit={handleAddPeriod} style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ minWidth: 120 }}>
                                    <label className="form-label">Day</label>
                                    <select className="form-select" value={fDay} onChange={e => setFDay(e.target.value)}>
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Start</label>
                                    <input type="time" className="form-input" value={fStart} onChange={e => setFStart(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End</label>
                                    <input type="time" className="form-input" value={fEnd} onChange={e => setFEnd(e.target.value)} required />
                                </div>

                                {!fIsBreak && (
                                    <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                        <label className="form-label">Subject Code / Title *</label>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {!manualSub && allocatedSubs.length > 0 ? (
                                                <select className="form-select" value={fSub} onChange={e => {
                                                    if (e.target.value === 'MANUAL') setManualSub(true);
                                                    else { setFSub(e.target.value); setFName(e.target.value); }
                                                }} required>
                                                    <option value="">Select Subject...</option>
                                                    {allocatedSubs.map(s => <option key={s} value={s}>{s}</option>)}
                                                    <option value="MANUAL">Other (Type manually)...</option>
                                                </select>
                                            ) : (
                                                <input type="text" className="form-input" placeholder="e.g. BCA401" value={fSub} onChange={e => setFSub(e.target.value)} required />
                                            )}
                                        </div>
                                    </div>
                                )}
                                {fIsBreak && (
                                    <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                                        <label className="form-label">Break Title *</label>
                                        <input type="text" className="form-input" placeholder="e.g. Lunch Break" value={fSub} onChange={e => setFSub(e.target.value)} required />
                                    </div>
                                )}
                                {!fIsBreak && (
                                    <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
                                        <label className="form-label">Subject Detailed Name</label>
                                        <input type="text" className="form-input" placeholder="e.g. Algorithms" value={fName} onChange={e => setFName(e.target.value)} />
                                    </div>
                                )}
                                {!fIsBreak && (
                                    <div className="form-group" style={{ minWidth: 100 }}>
                                        <label className="form-label">Room</label>
                                        <input type="text" className="form-input" placeholder="Room 201" value={fRoom} onChange={e => setFRoom(e.target.value)} />
                                    </div>
                                )}
                                {!fIsBreak && (
                                    <div className="form-group" style={{ minWidth: 160 }}>
                                        <label className="form-label">Teacher</label>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {!manualTeacher && facultyList.length > 0 ? (
                                                <select className="form-select" value={fTeacher} onChange={e => {
                                                    if (e.target.value === 'MANUAL') setManualTeacher(true);
                                                    else {
                                                        setFTeacher(e.target.value);
                                                        setManualSub(false);
                                                    }
                                                }}>
                                                    <option value="">Select Faculty...</option>
                                                    {facultyList.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                                                    <option value="MANUAL">Other (Type manually)...</option>
                                                </select>
                                            ) : (
                                                <input type="text" className="form-input" placeholder="Dr. Smith" value={fTeacher} onChange={e => setFTeacher(e.target.value)} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
                                    <input type="checkbox" id="isBreak" checked={fIsBreak} onChange={e => {
                                        setFIsBreak(e.target.checked);
                                        if (e.target.checked) setFSub('Break');
                                    }} />
                                    <label htmlFor="isBreak" style={{ color: 'var(--text-2)', cursor: 'pointer' }}>Is Break?</label>
                                </div>
                                <div className="form-group">
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>Add</button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {periods.length === 0 && !editMode ? (
                        <div className="empty-state">
                            <span className="empty-icon">📅</span>
                            <h3>No Timetable Published</h3>
                            <p>There are no scheduled classes for {program} - {section} yet.</p>
                        </div>
                    ) : (
                        DAYS.map(day => {
                            const dayPeriods = periods.filter(p => p.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
                            if (dayPeriods.length === 0 && !editMode) return null; // Hide empty days if not editing

                            return (
                                <div key={day} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ background: 'rgba(99,102,241,0.08)', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-1)' }}>{day}</h3>
                                    </div>
                                    <div style={{ display: 'flex', overflowX: 'auto', padding: 16, gap: 12, minHeight: 120 }}>
                                        {dayPeriods.length === 0 ? (
                                            <div style={{ padding: 20, color: 'var(--text-4)', fontSize: '0.85rem', fontStyle: 'italic' }}>No periods added yet.</div>
                                        ) : (
                                            dayPeriods.map(p => {
                                                const mins = getDurationMins(p.startTime, p.endTime);
                                                const width = Math.max(160, mins * 2.5); // base scaling for visual diff

                                                return (
                                                    <div key={p.id} style={{
                                                        minWidth: width,
                                                        background: p.isBreak ? 'rgba(255,255,255,0.03)' : 'var(--bg-layer-2)',
                                                        border: `1px solid ${p.isBreak ? 'var(--border)' : 'rgba(99,102,241,0.3)'}`,
                                                        borderLeft: p.isBreak ? '3px solid var(--text-4)' : '3px solid var(--primary)',
                                                        borderRadius: 8,
                                                        padding: 12,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        position: 'relative'
                                                    }}>
                                                        {editMode && (
                                                            <button
                                                                onClick={() => handleDelete(p.id)}
                                                                style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '1rem' }}
                                                                title="Delete"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 8, letterSpacing: 0.5 }}>
                                                            {formatTime(p.startTime)} - {formatTime(p.endTime)}
                                                        </div>
                                                        <div style={{ fontSize: '1rem', fontWeight: 700, color: p.isBreak ? 'var(--text-3)' : 'var(--text-1)', marginBottom: 4 }}>
                                                            {p.sub}
                                                        </div>
                                                        {p.name && <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.3 }}>{p.name}</div>}

                                                        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-3)', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <span>{p.room ? `📍 ${p.room}` : ''}</span>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>{p.teacher}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {toast && <div className="toast toast-success" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100 }}>✓ {toast}</div>}
        </div>
    );
}
