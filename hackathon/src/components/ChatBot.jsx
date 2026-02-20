import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// ---- Rule-based knowledge base ----
const KB = [
    { keys: ['hello', 'hi', 'hey', 'good morning', 'good evening'], reply: (u) => `Hey ${u?.name?.split(' ')[0] || 'there'}! 👋 How can I help you today?` },
    { keys: ['who are you', 'what are you', 'are you a bot'], reply: () => "I'm **AcadBot** 🤖 — your department assistant! I can help you with resources, notices, uploads, schedules, and more." },
    { keys: ['repository', 'resources', 'materials', 'notes', 'files', 'study'], reply: () => "📚 Head over to the **Repository** page to browse study materials by semester & subject. You can also upload your own notes — they'll go live after faculty approval!" },
    { keys: ['notice', 'circular', 'announcement', 'update'], reply: () => "📢 Check the **Circulars** page for the latest department notices. Urgent ones are pinned at the top!" },
    { keys: ['upload', 'share', 'submit file', 'add file'], reply: () => "📤 Go to **Repository → Upload**. Fill in the subject, semester, and file details. Your file will be reviewed by faculty before it's visible to everyone." },
    { keys: ['pending', 'approval', 'approved', 'status'], reply: () => "⏳ After uploading, your file shows as **Pending** until a faculty member reviews it. Once approved, it appears in the repository for all students." },
    { keys: ['semester', 'sem', 'current'], reply: (u) => u?.semester ? `📅 You're currently in **Semester ${u.semester}**. You can filter repository resources by your semester!` : "📅 Your semester info isn't set. Please contact your admin." },
    { keys: ['exam', 'test', 'ia', 'internal', 'assessment'], reply: () => "📝 Keep an eye on the **Circulars** page for exam schedules and postponements. Faculty post all exam-related notices there." },
    { keys: ['download', 'get file', 'access'], reply: () => "⬇️ Visit the **Repository** and click the download icon on any approved file to access it." },
    { keys: ['subject', 'course', 'bca'], reply: () => "📖 Resources are tagged by subject code (e.g. BCA401, BCA402). Use the search/filter on the Repository page to find materials for a specific subject." },
    { keys: ['faculty', 'professor', 'teacher', 'staff'], reply: () => "🎓 Faculty upload and approve study materials, and post department circulars. You can see who uploaded each resource in the Repository." },
    { keys: ['password', 'forgot', 'reset', 'login issue'], reply: () => "🔑 If you're having login trouble, contact your department admin or HOD to reset your credentials." },
    { keys: ['project', 'mini project', 'assignment'], reply: () => "📋 Check the **Circulars** page — faculty often post assignment deadlines and project submission guidelines there!" },
    { keys: ['deadline', 'due date', 'submission', 'last date'], reply: () => "⏰ Deadlines are posted under **Circulars**. Keep an eye out for urgent (🔴) notices — those are high priority!" },
    { keys: ['help', 'what can you do', 'options', 'commands'], reply: () => "🆘 I can help with:\n• 📚 Finding study resources\n• 📢 Department notices\n• 📤 How to upload files\n• 📝 Exam & deadline info\n• 🎓 Faculty & course info\n\nJust ask me anything!" },
    { keys: ['thank', 'thanks', 'great', 'awesome', 'good bot'], reply: () => "You're welcome! 😊 Always here if you need help. Good luck with your studies! 💪" },
    { keys: ['bye', 'goodbye', 'see you', 'later'], reply: () => "Goodbye! 👋 Best of luck! Feel free to ask anytime." },
];

function getBotReply(input, user) {
    const lower = input.toLowerCase();
    for (const entry of KB) {
        if (entry.keys.some(k => lower.includes(k))) {
            return typeof entry.reply === 'function' ? entry.reply(user) : entry.reply;
        }
    }
    return "🤔 Hmm, I didn't quite get that. Try asking about:\n• Resources / notes\n• Uploading files\n• Circulars / notices\n• Exam schedules\n\nOr type **help** to see what I can do!";
}

function MsgBubble({ msg }) {
    const isBot = msg.from === 'bot';
    return (
        <div style={{
            display: 'flex',
            justifyContent: isBot ? 'flex-start' : 'flex-end',
            marginBottom: 10,
        }}>
            {isBot && (
                <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C3AED,#3B82F6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', flexShrink: 0, marginRight: 8, marginTop: 2,
                }}>🤖</div>
            )}
            <div style={{
                maxWidth: '78%',
                background: isBot
                    ? 'rgba(124,58,237,0.13)'
                    : 'linear-gradient(135deg,#7C3AED,#3B82F6)',
                color: isBot ? 'var(--text-1)' : '#fff',
                borderRadius: isBot ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                padding: '9px 13px',
                fontSize: '0.82rem',
                lineHeight: 1.55,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                border: isBot ? '1px solid rgba(124,58,237,0.2)' : 'none',
            }}>
                {/* Simple bold markdown: **text** → <b>text</b> */}
                {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                        ? <b key={i}>{part.slice(2, -2)}</b>
                        : part
                )}
            </div>
        </div>
    );
}

const QUICK_REPLIES = ['📚 Resources', '📢 Notices', '📤 Upload help', '📝 Exams', '❓ Help'];

export default function ChatBot() {
    const { user } = useAuth();
    const isStudent = user?.role === 'student';

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        { from: 'bot', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm **AcadBot**, your academic assistant.\n\nHow can I help you today?`, id: 0 },
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [unread, setUnread] = useState(0);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [open]);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, open]);

    const sendMessage = async (text) => {
        const trimmed = (text || input).trim();
        if (!trimmed) return;
        setInput('');

        const userMsg = { from: 'user', text: trimmed, id: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        await new Promise(r => setTimeout(r, 700 + Math.random() * 400));

        const reply = getBotReply(trimmed, user);
        setTyping(false);
        const botMsg = { from: 'bot', text: reply, id: Date.now() + 1 };
        setMessages(prev => [...prev, botMsg]);

        if (!open) setUnread(n => n + 1);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    if (!isStudent) return null;

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
                    width: 58, height: 58, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#7C3AED,#3B82F6)',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(124,58,237,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.55rem', transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: 'chatPulse 2.5s infinite',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Open AcadBot"
            >
                {open ? '✕' : '🤖'}
                {!open && unread > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: '#EF4444', color: '#fff',
                        borderRadius: '50%', width: 18, height: 18,
                        fontSize: '0.65rem', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #0f0f1a',
                    }}>{unread}</span>
                )}
            </button>

            {/* Chat window */}
            {open && (
                <div style={{
                    position: 'fixed', bottom: 98, right: 28, zIndex: 9998,
                    width: 340, maxHeight: 530,
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--bg-2, #13131f)',
                    borderRadius: 20,
                    border: '1px solid rgba(124,58,237,0.3)',
                    boxShadow: '0 16px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.15)',
                    overflow: 'hidden',
                    animation: 'chatSlideIn 0.25s cubic-bezier(.34,1.56,.64,1)',
                }}>
                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg,#7C3AED,#3B82F6)',
                        padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem',
                        }}>🤖</div>
                        <div>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.92rem' }}>AcadBot</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, background: '#4ADE80', borderRadius: '50%', display: 'inline-block' }} />
                                Always online · Academic Assistant
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
                        display: 'flex', flexDirection: 'column',
                        scrollbarWidth: 'thin',
                    }}>
                        {messages.map(m => <MsgBubble key={m.id} msg={m} />)}

                        {typing && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    background: 'linear-gradient(135deg,#7C3AED,#3B82F6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem',
                                }}>🤖</div>
                                <div style={{
                                    background: 'rgba(124,58,237,0.13)',
                                    border: '1px solid rgba(124,58,237,0.2)',
                                    borderRadius: '4px 16px 16px 16px',
                                    padding: '10px 16px',
                                    display: 'flex', gap: 4, alignItems: 'center',
                                }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--accent-1,#7C3AED)',
                                            display: 'inline-block',
                                            animation: `typingDot 1.2s ${i * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Quick replies */}
                    <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {QUICK_REPLIES.map(q => (
                            <button key={q} onClick={() => sendMessage(q)} style={{
                                background: 'rgba(124,58,237,0.12)',
                                border: '1px solid rgba(124,58,237,0.25)',
                                borderRadius: 99, color: 'var(--text-2,#aaa)',
                                fontSize: '0.7rem', padding: '4px 10px', cursor: 'pointer',
                                transition: 'all 0.15s',
                                fontFamily: 'inherit',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.25)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.color = 'var(--text-2,#aaa)'; }}
                            >{q}</button>
                        ))}
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 14px 14px',
                        borderTop: '1px solid rgba(124,58,237,0.15)',
                        display: 'flex', gap: 8,
                    }}>
                        <input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask me anything…"
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(124,58,237,0.25)',
                                borderRadius: 12, padding: '9px 13px',
                                color: 'var(--text-1,#fff)', fontSize: '0.82rem',
                                outline: 'none', fontFamily: 'inherit',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.25)'}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || typing}
                            style={{
                                width: 38, height: 38, borderRadius: '50%',
                                background: input.trim() && !typing
                                    ? 'linear-gradient(135deg,#7C3AED,#3B82F6)'
                                    : 'rgba(255,255,255,0.08)',
                                border: 'none', cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', transition: 'all 0.2s', flexShrink: 0,
                            }}
                        >➤</button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes chatPulse {
          0%,100% { box-shadow: 0 4px 20px rgba(124,58,237,0.55); }
          50% { box-shadow: 0 4px 32px rgba(124,58,237,0.85), 0 0 0 8px rgba(124,58,237,0.12); }
        }
        @keyframes chatSlideIn {
          from { opacity:0; transform: translateY(20px) scale(0.95); }
          to { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes typingDot {
          0%,80%,100% { transform: scale(0.7); opacity:0.4; }
          40% { transform: scale(1.1); opacity:1; }
        }
      `}</style>
        </>
    );
}
