import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbGetExamEvents, dbSaveExamEvent, dbDeleteExamEvent } from '../data/db';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS = {
    exam: { bg: '#EF444422', border: '#EF4444', text: '#EF4444', dot: '#EF4444' },
    event: { bg: '#6366F122', border: '#6366F1', text: '#6366F1', dot: '#6366F1' },
    holiday: { bg: '#10B98122', border: '#10B981', text: '#10B981', dot: '#10B981' },
};

function toYMD(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 10);
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay();
}

function dateInRange(dateStr, startStr, endStr) {
    return dateStr >= startStr && dateStr <= endStr;
}

export default function CalendarPage() {
    const { user } = useAuth();
    const isStaff = user.role === 'admin' || user.role === 'faculty';

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null); // event object for detail view
    const [showModal, setShowModal] = useState(false);
    const [modalDate, setModalDate] = useState('');
    const [toast, setToast] = useState('');

    const refresh = () => setEvents(dbGetExamEvents());

    useEffect(() => { refresh(); }, []);

    const showToast = (msg, isError = false) => {
        setToast({ msg, isError });
        setTimeout(() => setToast(''), 3000);
    };

    // Navigation
    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    // Build calendar grid
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    // Get events for a specific date
    const getEventsForDate = (dateStr) =>
        events.filter(e => dateInRange(dateStr, e.startDate, e.endDate));

    const handleDayClick = (day) => {
        if (!day) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = getEventsForDate(dateStr);
        if (dayEvents.length > 0) {
            setSelectedEvent({ events: dayEvents, dateStr });
        } else if (isStaff) {
            setModalDate(dateStr);
            setShowModal(true);
        }
    };

    const handleDelete = (eventId) => {
        if (!window.confirm('Delete this event?')) return;
        dbDeleteExamEvent(eventId, user);
        refresh();
        setSelectedEvent(null);
        showToast('Event deleted.');
    };

    const todayStr = toYMD(today);

    return (
        <div className="anim-fade">
            <div className="page-header">
                <h1>📅 Exam Calendar</h1>
                <p>
                    {isStaff
                        ? 'Click any date to add an exam or event. Click an existing event to view or delete it.'
                        : 'View upcoming exams and events scheduled by your department.'}
                </p>
            </div>

            <div className="page-content">
                {/* Legend */}
                <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
                    {Object.entries(TYPE_COLORS).map(([type, c]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
                            <span style={{ color: 'var(--text-2)', textTransform: 'capitalize' }}>{type}</span>
                        </div>
                    ))}
                    {isStaff && (
                        <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: '0.8rem' }}>
                            💡 Click an empty date to add an event
                        </span>
                    )}
                </div>

                {/* Calendar Card */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Month nav */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '18px 24px', borderBottom: '1px solid var(--border)',
                        background: 'rgba(99,102,241,0.06)',
                    }}>
                        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>← Prev</button>
                        <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                            {MONTHS[month]} {year}
                        </h2>
                        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Next →</button>
                    </div>

                    {/* Day header row */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        {DAYS.map(d => (
                            <div key={d} style={{
                                padding: '10px 0', textAlign: 'center',
                                fontSize: '0.75rem', fontWeight: 700,
                                color: d === 'Sun' ? '#EF4444' : 'var(--text-3)',
                                letterSpacing: '0.05em',
                            }}>{d}</div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                        {cells.map((day, idx) => {
                            const dateStr = day
                                ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                : null;
                            const dayEvents = day ? getEventsForDate(dateStr) : [];
                            const isToday = dateStr === todayStr;
                            const isSunday = idx % 7 === 0;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    style={{
                                        minHeight: 88,
                                        padding: '8px 10px',
                                        borderRight: '1px solid var(--border)',
                                        borderBottom: '1px solid var(--border)',
                                        cursor: day ? (isStaff || dayEvents.length > 0 ? 'pointer' : 'default') : 'default',
                                        background: !day ? 'rgba(0,0,0,0.02)' : isToday ? 'rgba(99,102,241,0.1)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => { if (day) e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)'; }}
                                    onMouseLeave={e => { if (day) e.currentTarget.style.background = isToday ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
                                >
                                    {day && (
                                        <>
                                            <div style={{
                                                width: 26, height: 26, borderRadius: '50%',
                                                background: isToday ? 'var(--primary)' : 'transparent',
                                                color: isToday ? '#fff' : isSunday ? '#EF4444' : 'var(--text-1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: isToday ? 800 : 500,
                                                fontSize: '0.83rem', marginBottom: 4,
                                            }}>{day}</div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                {dayEvents.slice(0, 3).map(ev => {
                                                    const c = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
                                                    return (
                                                        <div key={ev.id} style={{
                                                            background: c.bg, border: `1px solid ${c.border}`,
                                                            color: c.text, borderRadius: 4,
                                                            fontSize: '0.68rem', fontWeight: 700,
                                                            padding: '1px 5px',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        }}>
                                                            {ev.title}
                                                        </div>
                                                    );
                                                })}
                                                {dayEvents.length > 3 && (
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', paddingLeft: 4 }}>
                                                        +{dayEvents.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Upcoming Events List */}
                <UpcomingEvents events={events} todayStr={todayStr} isStaff={isStaff} user={user} onDelete={(id) => { dbDeleteExamEvent(id, user); refresh(); showToast('Event deleted.'); }} />
            </div>

            {/* Add Event Modal */}
            {showModal && isStaff && (
                <AddEventModal
                    initialDate={modalDate}
                    user={user}
                    onSaved={() => { refresh(); setShowModal(false); showToast('Event saved!'); }}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* Event Detail Popup */}
            {selectedEvent && (
                <EventDetailPopup
                    dateStr={selectedEvent.dateStr}
                    events={selectedEvent.events}
                    isStaff={isStaff}
                    onDelete={handleDelete}
                    onClose={() => setSelectedEvent(null)}
                    onAdd={() => { setSelectedEvent(null); setModalDate(selectedEvent.dateStr); setShowModal(true); }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.isError ? 'toast-error' : 'toast-success'}`}>
                    {toast.isError ? '⚠️' : '✓'} {toast.msg}
                </div>
            )}
        </div>
    );
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────

function AddEventModal({ initialDate, user, onSaved, onClose }) {
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [type, setType] = useState('exam');
    const [startDate, setStartDate] = useState(initialDate);
    const [endDate, setEndDate] = useState(initialDate);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) { setError('Title is required.'); return; }
        if (endDate < startDate) { setError('End date cannot be before start date.'); return; }
        setSaving(true);
        dbSaveExamEvent({ title, details, type, startDate, endDate }, user);
        setSaving(false);
        onSaved();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={onClose}>
            <div className="glass-card anim-up" style={{ width: '100%', maxWidth: 480, padding: 32 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>📌 Add Exam / Event</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Type selector */}
                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Type *</label>
                        <div className="role-tabs" style={{ width: 'fit-content' }}>
                            {[['exam', '📝 Exam'], ['event', '🎉 Event'], ['holiday', '🏖 Holiday']].map(([k, lbl]) => (
                                <button key={k} type="button"
                                    className={`role-tab ${type === k ? 'active' : ''}`}
                                    onClick={() => setType(k)}
                                    style={{ fontSize: '0.8rem' }}
                                >{lbl}</button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Title *</label>
                        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
                            placeholder={type === 'exam' ? 'e.g. Mid-Semester Exam – BCA 3rd Sem' : 'e.g. Guest Lecture on AI'}
                            required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Start Date *</label>
                            <input className="form-input" type="date" value={startDate}
                                onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }}
                                required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">End Date</label>
                            <input className="form-input" type="date" value={endDate} min={startDate}
                                onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 24 }}>
                        <label className="form-label">Details / Notes</label>
                        <textarea className="form-input" rows={3} value={details}
                            onChange={e => setDetails(e.target.value)}
                            placeholder="Venue, timing, syllabus covered, instructions..."
                            style={{ resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                            {saving ? <><span className="spinner" /> Saving…</> : '💾 Save Event'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Event Detail Popup ───────────────────────────────────────────────────────

function EventDetailPopup({ dateStr, events, isStaff, onDelete, onClose, onAdd }) {
    const formatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={onClose}>
            <div className="glass-card anim-up" style={{ width: '100%', maxWidth: 460, padding: 28 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: 4 }}>Events on</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '0.95rem' }}>{formatted}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {events.map(ev => {
                        const c = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
                        return (
                            <div key={ev.id} style={{
                                background: c.bg, border: `1px solid ${c.border}`,
                                borderRadius: 10, padding: '14px 16px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span style={{
                                            background: `${c.border}33`, color: c.text,
                                            padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                                            textTransform: 'uppercase', marginBottom: 6, display: 'inline-block',
                                        }}>{ev.type}</span>
                                        <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{ev.title}</div>
                                        {ev.details && (
                                            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{ev.details}</div>
                                        )}
                                        <div style={{ marginTop: 8, fontSize: '0.74rem', color: 'var(--text-3)' }}>
                                            📅 {ev.startDate}{ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ''} · By {ev.createdBy}
                                        </div>
                                    </div>
                                    {isStaff && (
                                        <button className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--danger)', fontSize: '0.75rem', marginLeft: 12, flexShrink: 0 }}
                                            onClick={() => onDelete(ev.id)}>🗑 Delete</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isStaff && (
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={onAdd}>
                        + Add Another Event on This Date
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Upcoming Events List ─────────────────────────────────────────────────────

function UpcomingEvents({ events, todayStr, isStaff, user, onDelete }) {
    const upcoming = events.filter(e => e.endDate >= todayStr).slice(0, 8);

    if (upcoming.length === 0) return null;

    return (
        <div style={{ marginTop: 32 }}>
            <h3 style={{ marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif", fontSize: '1rem' }}>
                📌 Upcoming Events
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {upcoming.map(ev => {
                    const c = TYPE_COLORS[ev.type] || TYPE_COLORS.event;
                    return (
                        <div key={ev.id} className="glass-card" style={{
                            padding: '16px 18px',
                            borderLeft: `4px solid ${c.border}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{
                                        fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                                        color: c.text, marginBottom: 4, display: 'block',
                                    }}>{ev.type}</span>
                                    <div style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>{ev.title}</div>
                                    {ev.details && (
                                        <div style={{
                                            fontSize: '0.79rem', color: 'var(--text-2)', lineHeight: 1.5,
                                            marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>{ev.details}</div>
                                    )}
                                    <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                                        📅 {ev.startDate}{ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ''}
                                    </div>
                                </div>
                                {isStaff && (
                                    <button className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--danger)', fontSize: '0.72rem', marginLeft: 8 }}
                                        onClick={() => { if (window.confirm('Delete?')) onDelete(ev.id); }}>
                                        🗑
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
