import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { dbLogin, dbRegisterStudent, dbGoogleAuth } from '../data/db';
import { useAuth } from '../context/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import srinivasLogo from '../assets/srinivas.jpg';

export default function AuthPage() {
    const { setUser } = useAuth();
    const [mode, setMode] = useState('login');
    const [role, setRole] = useState('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Login state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Register state
    const [rUsn, setRUsn] = useState('');
    const [rName, setRName] = useState('');
    const [rEmail, setREmail] = useState('');
    const [rSem, setRSem] = useState('4');
    const [rProgram, setRProgram] = useState('BCA');
    const [rSection, setRSection] = useState('A');
    const [rPwd, setRPwd] = useState('');
    const [rConf, setRConf] = useState('');

    const roleLabels = { admin: 'HOD / Admin', faculty: 'Faculty', student: 'Student' };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        await new Promise(r => setTimeout(r, 600));
        const res = dbLogin(email, password, role);
        if (res.success) setUser(res.user);
        else setError(res.error);
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault(); setError('');
        if (!rUsn || !rName || !rEmail || !rPwd) { setError('Please fill all fields.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail)) { setError('Please enter a valid email address.'); return; }
        if (rPwd !== rConf) { setError('Passwords do not match.'); return; }
        if (rPwd.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 700));
        const res = dbRegisterStudent(rUsn, rName, rSem, rProgram, rSection, rPwd, rEmail);
        if (res.success) setUser(res.user);
        else setError(res.error);
        setLoading(false);
    };

    // Called with the Google credential response (JWT)
    const handleGoogleSuccess = (credentialResponse) => {
        setError('');
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            const googleEmail = decoded.email;
            const googleName = decoded.name;
            const res = dbGoogleAuth(googleEmail, googleName);
            if (res.success) setUser(res.user);
            else setError(res.error);
        } catch {
            setError('Google sign-in failed. Please try again.');
        }
    };

    const handleGoogleError = () => {
        setError('Google sign-in was cancelled or failed. Please try again.');
    };

    // Divider between form methods
    const Divider = () => (
        <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }}></span>
            <span style={{ padding: '0 12px' }}>OR</span>
            <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }}></span>
        </div>
    );

    // Google button wrapper — centers the native Google button
    const GoogleButtonSection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 6 }}>
                Students can sign in with a Google account
            </div>
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                shape="rectangular"
                size="large"
                text="signin_with"
                theme="outline"
                width="320"
                locale="en"
            />
        </div>
    );

    return (
        <div className="auth-root">
            <AnimatedBackground />

            <div className="auth-card">
                <div className="auth-hdr-text">
                    <img src={srinivasLogo} alt="Srinivas University" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 8 }} />
                    <h2 className="gradient-text">Srinivas University</h2>
                    <p>Department Digital Library &amp; Notice Board</p>
                </div>

                {mode === 'login' ? (
                    <form className="auth-form" onSubmit={handleLogin}>
                        <div>
                            <div className="form-label" style={{ marginBottom: 8 }}>Sign in as</div>
                            <div className="role-tabs">
                                {(['student', 'faculty', 'admin']).map(r => (
                                    <button key={r} type="button"
                                        className={`role-tab ${role === r ? 'active' : ''}`}
                                        onClick={() => { setRole(r); setError(''); setEmail(''); setPassword(''); }}>
                                        {roleLabels[r]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <div className="alert alert-error">⚠️  {error}</div>}

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <div className="input-with-icon">
                                <span className="inp-icon">✉️</span>
                                <input key={`email-${role}`} className="form-input" type="email" placeholder="you@dept.edu"
                                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-with-icon">
                                <span className="inp-icon">🔒</span>
                                <input key={`pwd-${role}`} className="form-input" type="password" placeholder="••••••••"
                                    value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                            </div>
                        </div>

                        <button className="btn btn-primary btn-xl" type="submit" disabled={loading}
                            style={{ width: '100%', marginTop: 4 }}>
                            {loading ? <><span className="spinner" /> Signing in…</> : '→ Sign In'}
                        </button>

                        {role === 'student' && (
                            <>
                                <Divider />
                                <GoogleButtonSection />
                            </>
                        )}
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleRegister}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-1)' }}>Create Student Account</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>One USN = One Account • No duplicates allowed</div>
                        </div>

                        {error && <div className="alert alert-error">⚠️  {error}</div>}

                        <div className="form-group">
                            <label className="form-label">USN *</label>
                            <input className="form-input" placeholder="e.g. 1DB21BCA001"
                                value={rUsn} onChange={e => setRUsn(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input className="form-input" placeholder="Your full name"
                                value={rName} onChange={e => setRName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address *</label>
                            <div className="input-with-icon">
                                <span className="inp-icon">✉️</span>
                                <input className="form-input" type="email" placeholder="you@example.com"
                                    value={rEmail} onChange={e => setREmail(e.target.value)} required />
                            </div>
                        </div>
                        <div className="g-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Program</label>
                                <select className="form-select" value={rProgram} onChange={e => setRProgram(e.target.value)}>
                                    <option value="BCA">BCA</option>
                                    <option value="BBA">BBA</option>
                                    <option value="B.COM">B.COM</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Section</label>
                                <select className="form-select" value={rSection} onChange={e => setRSection(e.target.value)}>
                                    <option value="A">Section A</option>
                                    <option value="B">Section B</option>
                                    <option value="C">Section C</option>
                                </select>
                            </div>
                        </div>
                        <div className="g-2" style={{ gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Password *</label>
                                <input className="form-input" type="password" placeholder="Min 6 chars"
                                    value={rPwd} onChange={e => setRPwd(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm *</label>
                                <input className="form-input" type="password" placeholder="Repeat"
                                    value={rConf} onChange={e => setRConf(e.target.value)} required />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-xl" type="submit" disabled={loading}
                            style={{ width: '100%' }}>
                            {loading ? <><span className="spinner" /> Creating…</> : '✨ Create Account'}
                        </button>

                        <Divider />
                        <GoogleButtonSection />
                    </form>
                )}

                <div className="auth-footer">
                    {mode === 'login'
                        ? <>Student? <a onClick={() => { setMode('register'); setError(''); }}>Create Account</a></>
                        : <>Already registered? <a onClick={() => { setMode('login'); setError(''); }}>Sign In</a></>}
                </div>
            </div>
        </div>
    );
}
