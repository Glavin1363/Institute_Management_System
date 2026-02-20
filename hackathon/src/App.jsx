import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import RepositoryPage from './pages/RepositoryPage';
import NoticesPage from './pages/NoticesPage';
import ReviewPage from './pages/ReviewPage';
import ManageFacultyPage from './pages/ManageFacultyPage';
import ClassroomsPage from './pages/ClassroomsPage';
import QuizPage from './pages/QuizPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';
import CalendarPage from './pages/CalendarPage';
import Sidebar from './components/Sidebar';
import AnimatedBackground from './components/AnimatedBackground';
import ChatBot from './components/ChatBot';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function AppInner() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (!user) return <AuthPage />;

  const isStaff = user.role === 'admin' || user.role === 'faculty';
  const isAdmin = user.role === 'admin';

  const breadcrumbs = {
    dashboard: 'Dashboard',
    repository: 'Repository',
    notices: 'Circulars',
    review: 'Review Uploads',
    'manage-faculty': 'Manage Faculty',
    classrooms: 'Classrooms',
    quiz: isStaff ? 'Quiz Rooms' : 'Join Quiz',
    chat: 'Messages',
    admin: 'Admin Panel',
    calendar: 'Exam Calendar',
  };

  return (
    <div className="app-layout">
      <AnimatedBackground />
      <Sidebar currentPage={page} setPage={setPage} />

      <main className="main-content">
        {/* Sticky top bar */}
        <div className="top-bar">
          <div className="breadcrumb">
            <span>Srinivas University</span>
            <span className="sep">/</span>
            <span>{breadcrumbs[page] || 'Dashboard'}</span>
          </div>
          <div className="date-chip">
            🗓 {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>

        {page === 'dashboard' && <DashboardPage setPage={setPage} />}
        {page === 'repository' && <RepositoryPage />}
        {page === 'notices' && <NoticesPage />}
        {page === 'review' && isStaff && <ReviewPage />}
        {page === 'review' && !isStaff && <DashboardPage setPage={setPage} />}
        {page === 'manage-faculty' && isAdmin && <ManageFacultyPage />}
        {page === 'classrooms' && <ClassroomsPage />}
        {page === 'quiz' && <QuizPage />}
        {page === 'chat' && <ChatPage />}
        {page === 'admin' && isAdmin && <AdminPage />}
        {page === 'admin' && !isAdmin && <DashboardPage setPage={setPage} />}
        {page === 'calendar' && <CalendarPage />}
      </main>

      {/* Floating chatbot — visible only for students */}
      <ChatBot />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
