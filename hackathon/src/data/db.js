// ─── Persistent Backend Sync ────────────────────────────────────────────────
// All data is mirrored to an Express backend (localhost:3001) for real
// persistence. Components continue using localStorage synchronously — the sync
// is transparent. If the backend is unavailable, the app falls back silently.

const API_BASE = 'http://localhost:3001';

// Only these keys are synced to the backend (not session/migration flags)
const SYNC_KEYS = new Set([
  'acportal_users',
  'acportal_files',
  'acportal_notices',
  'acportal_classrooms',
  'acportal_assignments',
  'acportal_submissions',
  'acportal_quiz_rooms',
  'acportal_quiz_attempts',
  'acportal_chat_messages',
  'acportal_audit_logs',
  'acportal_exam_events',
  'acportal_attendance',
  'acportal_timetable',
  'acportal_results',
]);

let syncEnabled = false; // enabled after dbInit completes

// Intercept every localStorage.setItem and mirror to backend
const _origSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = (key, value) => {
  _origSetItem(key, value);
  if (syncEnabled && SYNC_KEYS.has(key)) {
    fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }).catch(() => { }); // silent fail if backend is down
  }
};

/**
 * dbInit — call ONCE before rendering React.
 * 1. Loads all persisted data from backend → localStorage
 * 2. Runs migration + seed
 * 3. Pushes final state to backend (captures migration changes)
 * 4. Enables real-time sync for all future writes
 */
export const dbInit = async () => {
  let backendAvailable = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/api/data`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      // Hydrate localStorage with backend data (backend is source of truth)
      Object.entries(data).forEach(([key, value]) => {
        if (SYNC_KEYS.has(key)) {
          _origSetItem(key, JSON.stringify(value));
        }
      });
      backendAvailable = true;
      console.log('✅ AcadCentral: data loaded from backend database.');
    }
  } catch {
    console.warn('⚠️ AcadCentral: backend unavailable — using localStorage fallback.');
  }

  // Run migration + seed (using the now-hydrated localStorage)
  migrateData();
  seedData();

  if (backendAvailable) {
    // Push the final state (post-migration) back to the backend
    const snapshot = {};
    SYNC_KEYS.forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { snapshot[key] = JSON.parse(raw); } catch { snapshot[key] = raw; }
      }
    });
    await fetch(`${API_BASE}/api/sync-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }).catch(() => { });

    // Enable real-time sync for all future writes
    syncEnabled = true;
    console.log('✅ AcadCentral: real-time sync enabled.');
  }
};

// ─── Local Database (localStorage) ──────────────────────────────────────────

const DB_KEYS = {
  USERS: 'acportal_users',
  FILES: 'acportal_files',
  NOTICES: 'acportal_notices',
  CURRENT_USER: 'acportal_current_user',
  CLASSROOMS: 'acportal_classrooms',
  ASSIGNMENTS: 'acportal_assignments',
  SUBMISSIONS: 'acportal_submissions',
  QUIZ_ROOMS: 'acportal_quiz_rooms',
  QUIZ_ATTEMPTS: 'acportal_quiz_attempts',
  CHAT_MESSAGES: 'acportal_chat_messages',
  AUDIT_LOGS: 'acportal_audit_logs',
  EXAM_EVENTS: 'acportal_exam_events',
  ATTENDANCE: 'acportal_attendance',
  TIMETABLE: 'acportal_timetable',
  RESULTS: 'acportal_results',
};

// ---- AUDIT LOG ----
export const dbLog = (action, user, detail = '') => {
  const logs = JSON.parse(localStorage.getItem(DB_KEYS.AUDIT_LOGS) || '[]');
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action,
    userId: user?.id || 'system',
    userName: user?.name || 'System',
    role: user?.role || 'system',
    detail,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 500
  localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
};

export const dbGetLogs = () => JSON.parse(localStorage.getItem(DB_KEYS.AUDIT_LOGS) || '[]');

// ---- ONE-TIME MIGRATION: Clear legacy demo data ----
const migrateData = () => {
  const MIGRATION_KEY = 'acportal_migrated_v2';
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const OLD_DEMO_EMAILS = ['hod@dept.edu', 'sharma@dept.edu', 'meena@dept.edu'];
  const OLD_DEMO_UPLOADER_IDS = ['faculty-001', 'faculty-002', 'student-001', 'student-002'];

  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const cleanedUsers = users.filter(u => !OLD_DEMO_EMAILS.includes(u.email));
  const adminIdx = cleanedUsers.findIndex(u => u.role === 'admin');
  if (adminIdx !== -1) {
    cleanedUsers[adminIdx].email = 'admin123@gmail.com';
    cleanedUsers[adminIdx].password = 'Admin@861';
    cleanedUsers[adminIdx].name = 'HOD / Admin';
    cleanedUsers[adminIdx].avatar = 'HA';
  }
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(cleanedUsers));

  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  const cleanedFiles = files.filter(f => !OLD_DEMO_UPLOADER_IDS.includes(f.uploaderId));
  localStorage.setItem(DB_KEYS.FILES, JSON.stringify(cleanedFiles));

  const notices = JSON.parse(localStorage.getItem(DB_KEYS.NOTICES) || '[]');
  const realNotices = notices.filter(n => !['notice-001', 'notice-002', 'notice-003'].includes(n.id));
  localStorage.setItem(DB_KEYS.NOTICES, JSON.stringify(realNotices));

  const currentUser = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || 'null');
  if (currentUser && OLD_DEMO_EMAILS.includes(currentUser.email)) {
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
  }

  localStorage.setItem(MIGRATION_KEY, '1');
};

// Seed only the admin account
const seedData = () => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const adminExists = users.find(u => u.role === 'admin');
  if (!adminExists) {
    users.push({
      id: 'admin-001',
      role: 'admin',
      name: 'HOD / Admin',
      email: 'admin123@gmail.com',
      password: 'Admin@861',
      usn: null,
      semester: null,
      program: null,
      section: null,
      avatar: 'HA',
    });
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  }
  let migratedUsers = false;
  users.forEach(u => {
    if (u.role === 'student' && !u.program) {
      u.program = 'BCA';
      u.section = 'A';
      migratedUsers = true;
    }
  });
  if (migratedUsers) localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  if (!localStorage.getItem(DB_KEYS.FILES)) localStorage.setItem(DB_KEYS.FILES, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.NOTICES)) localStorage.setItem(DB_KEYS.NOTICES, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.CLASSROOMS)) localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.ASSIGNMENTS)) localStorage.setItem(DB_KEYS.ASSIGNMENTS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.SUBMISSIONS)) localStorage.setItem(DB_KEYS.SUBMISSIONS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.QUIZ_ROOMS)) localStorage.setItem(DB_KEYS.QUIZ_ROOMS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.QUIZ_ATTEMPTS)) localStorage.setItem(DB_KEYS.QUIZ_ATTEMPTS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.CHAT_MESSAGES)) localStorage.setItem(DB_KEYS.CHAT_MESSAGES, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.AUDIT_LOGS)) localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.EXAM_EVENTS)) localStorage.setItem(DB_KEYS.EXAM_EVENTS, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.ATTENDANCE)) localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.TIMETABLE)) localStorage.setItem(DB_KEYS.TIMETABLE, JSON.stringify([]));
  if (!localStorage.getItem(DB_KEYS.RESULTS)) localStorage.setItem(DB_KEYS.RESULTS, JSON.stringify([]));
};

// ---- AUTH ----
export const dbLogin = (email, password, role) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const user = users.find(
    (u) => u.email === email.trim().toLowerCase() && u.password === password && u.role === role
  );
  if (user) {
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(safeUser));
    dbLog('LOGIN', safeUser, `Logged in as ${role}`);
    return { success: true, user: safeUser };
  }
  return { success: false, error: 'Invalid credentials. Please check your email, password, and role.' };
};

export const dbGoogleAuth = (email, name) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const normalizedEmail = email.trim().toLowerCase();
  let user = users.find((u) => u.email === normalizedEmail && u.role === 'student');
  if (!user) {
    const nonStudent = users.find((u) => u.email === normalizedEmail && u.role !== 'student');
    if (nonStudent) return { success: false, error: 'This email is registered as Faculty or Admin. Use the password login.' };
    user = {
      id: `student-g-${Date.now()}`,
      role: 'student',
      name,
      email: normalizedEmail,
      password: null,
      usn: `G-${Math.floor(Math.random() * 90000) + 10000}`,
      semester: '1',
      program: 'BCA',
      section: 'A',
      avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    };
    users.push(user);
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    dbLog('GOOGLE_REGISTER', user, 'Auto-registered via Google OAuth');
  }
  const safeUser = { ...user };
  delete safeUser.password;
  localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(safeUser));
  dbLog('GOOGLE_LOGIN', safeUser, 'Signed in via Google');
  return { success: true, user: safeUser };
};

// ---- FACULTY MANAGEMENT (admin only) ----
export const dbGetFaculty = () => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  return users.filter(u => u.role === 'faculty');
};

export const dbAddFaculty = (name, email, password) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const normalizedEmail = email.trim().toLowerCase();
  if (users.find(u => u.email === normalizedEmail)) return { success: false, error: 'A user with this email already exists.' };
  const newFaculty = {
    id: `faculty-${Date.now()}`,
    role: 'faculty',
    name: name.trim(),
    email: normalizedEmail,
    password,
    usn: null,
    semester: null,
    avatar: name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
  users.push(newFaculty);
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  return { success: true, faculty: newFaculty };
};

export const dbDeleteFaculty = (facultyId) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users.filter(u => u.id !== facultyId)));
  return true;
};

export const dbUpdateUser = (userId, updates) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...updates };
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));

    const curUser = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || '{}');
    if (curUser.id === userId) {
      localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify({ ...curUser, ...updates }));
    }
    return { success: true, user: { ...users[idx] } };
  }
  return { success: false, error: 'User not found' };
};

export const dbRegisterStudent = (usn, name, semester, program, section, password, email) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const existing = users.find((u) => u.usn === usn.toUpperCase());
  if (existing) return { success: false, error: `USN ${usn.toUpperCase()} already registered.` };
  const normalizedEmail = email.trim().toLowerCase();
  if (users.find((u) => u.email === normalizedEmail)) return { success: false, error: 'An account with this email already exists.' };
  const newUser = {
    id: `student-${Date.now()}`,
    role: 'student',
    name,
    email: normalizedEmail,
    password,
    usn: usn.toUpperCase(),
    semester,
    program,
    section,
    avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
  };
  users.push(newUser);
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  const safeUser = { ...newUser };
  delete safeUser.password;
  localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(safeUser));
  dbLog('REGISTER', safeUser, 'Student self-registered');
  return { success: true, user: safeUser };
};

export const dbGetCurrentUser = () => JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || 'null');

export const dbLogout = (user) => {
  if (user) dbLog('LOGOUT', user, 'User logged out');
  localStorage.removeItem(DB_KEYS.CURRENT_USER);
};

// ---- GET ALL USERS ----
export const dbGetAllUsers = () => JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
export const dbGetStudents = () => dbGetAllUsers().filter(u => u.role === 'student');
export const dbGetAllStaff = () => dbGetAllUsers().filter(u => u.role === 'faculty' || u.role === 'admin');

// ---- BULK IMPORT ----
export const dbBulkImportUsers = (rows, adminUser) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const results = { created: 0, skipped: 0, errors: [] };
  rows.forEach((row, idx) => {
    const { name, email, role, usn, program, section, semester, password } = row;
    if (!name || !email || !role || !password) {
      results.errors.push(`Row ${idx + 2}: Missing required fields`);
      return;
    }
    const normEmail = email.trim().toLowerCase();
    if (users.find(u => u.email === normEmail)) {
      results.skipped++;
      return;
    }
    const newUser = {
      id: `${role}-imp-${Date.now()}-${idx}`,
      role: role.toLowerCase() === 'faculty' ? 'faculty' : 'student',
      name: name.trim(),
      email: normEmail,
      password: password.trim(),
      usn: usn ? usn.toUpperCase() : null,
      semester: semester || null,
      program: program ? program.toUpperCase() : (role.toLowerCase() === 'student' ? 'BCA' : null),
      section: section ? section.toUpperCase() : (role.toLowerCase() === 'student' ? 'A' : null),
      avatar: name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    };
    users.push(newUser);
    results.created++;
  });
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  dbLog('BULK_IMPORT', adminUser, `Imported ${results.created} users, skipped ${results.skipped}`);
  return results;
};

export const dbAllocateFaculty = (rows, adminUser) => {
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const results = { updated: 0, notFound: 0, errors: [] };
  rows.forEach((row, idx) => {
    const { email, program, section, subjects } = row;
    if (!email || !program || !section || !subjects) {
      results.errors.push(`Row ${idx + 2}: Missing required fields (email, program, section, subjects)`);
      return;
    }
    const userIdx = users.findIndex(u => u.email === email.trim().toLowerCase() && u.role === 'faculty');
    if (userIdx !== -1) {
      const u = users[userIdx];
      u.allocations = u.allocations || [];
      u.allocations.push({
        program: program.toUpperCase(),
        section: section.toUpperCase(),
        subjects: subjects.split(';').map(s => s.trim()).filter(Boolean)
      });
      results.updated++;
    } else {
      results.notFound++;
    }
  });
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  dbLog('FACULTY_ALLOCATION', adminUser, `Allocated classes for ${results.updated} faculty.`);
  return results;
};

// ---- FILES ----
export const dbGetFiles = (filters = {}) => {
  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  let result = files;
  if (filters.approvedOnly) result = result.filter((f) => f.status === 'approved');
  if (filters.status) result = result.filter((f) => f.status === filters.status);
  if (filters.semester) result = result.filter((f) => f.semester === filters.semester);
  if (filters.subject) result = result.filter((f) =>
    f.subject.toLowerCase().includes(filters.subject.toLowerCase()) ||
    f.subjectName.toLowerCase().includes(filters.subject.toLowerCase())
  );
  if (filters.professor) result = result.filter((f) =>
    f.uploadedBy.toLowerCase().includes(filters.professor.toLowerCase())
  );
  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((f) =>
      f.name.toLowerCase().includes(q) || f.subject.toLowerCase().includes(q) ||
      f.subjectName.toLowerCase().includes(q) || f.uploadedBy.toLowerCase().includes(q)
    );
  }
  return result.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
};

export const dbUploadFile = (fileData, user) => {
  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  const newFile = {
    id: `file-${Date.now()}`,
    ...fileData,
    uploadedBy: user.role === 'student' ? `${user.usn} - ${user.name}` : user.name,
    uploaderId: user.id,
    uploaderRole: user.role,
    status: user.role === 'student' ? 'pending' : 'approved',
    uploadDate: new Date().toISOString(),
    downloads: 0,
  };
  files.push(newFile);
  localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files));
  dbLog('UPLOAD_FILE', user, `Uploaded: ${fileData.name}`);
  return newFile;
};

export const dbApproveFile = (fileId, user) => {
  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  const idx = files.findIndex((f) => f.id === fileId);
  if (idx !== -1) {
    files[idx].status = 'approved';
    localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files));
    dbLog('APPROVE_FILE', user, `Approved file ${fileId}`);
    return true;
  }
  return false;
};

export const dbRejectFile = (fileId, user) => {
  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files.filter((f) => f.id !== fileId)));
  dbLog('REJECT_FILE', user, `Rejected file ${fileId}`);
  return true;
};

export const dbDeleteFile = (fileId, user) => {
  const files = JSON.parse(localStorage.getItem(DB_KEYS.FILES) || '[]');
  localStorage.setItem(DB_KEYS.FILES, JSON.stringify(files.filter((f) => f.id !== fileId)));
  dbLog('DELETE_FILE', user, `Deleted file ${fileId}`);
  return true;
};

// ---- NOTICES ----
export const dbGetNotices = () => {
  const notices = JSON.parse(localStorage.getItem(DB_KEYS.NOTICES) || '[]');
  return notices.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
};

export const dbPostNotice = (noticeData, user) => {
  const notices = JSON.parse(localStorage.getItem(DB_KEYS.NOTICES) || '[]');
  const newNotice = {
    id: `notice-${Date.now()}`,
    ...noticeData,
    postedBy: user.name,
    posterId: user.id,
    postedDate: new Date().toISOString(),
  };
  notices.push(newNotice);
  localStorage.setItem(DB_KEYS.NOTICES, JSON.stringify(notices));
  dbLog('POST_NOTICE', user, `Posted: ${noticeData.title}`);
  return newNotice;
};

export const dbDeleteNotice = (noticeId, user) => {
  const notices = JSON.parse(localStorage.getItem(DB_KEYS.NOTICES) || '[]');
  localStorage.setItem(DB_KEYS.NOTICES, JSON.stringify(notices.filter((n) => n.id !== noticeId)));
  dbLog('DELETE_NOTICE', user, `Deleted notice ${noticeId}`);
  return true;
};

export const isNewNotice = (dateStr) => {
  const diffHours = (new Date() - new Date(dateStr)) / (1000 * 60 * 60);
  return diffHours <= 24;
};

// ---- CLASSROOMS ----
export const dbGetClassrooms = () => JSON.parse(localStorage.getItem(DB_KEYS.CLASSROOMS) || '[]');

export const dbGetClassroomsForUser = (user) => {
  const all = dbGetClassrooms();
  if (user.role === 'student') return all.filter(c => c.studentIds?.includes(user.id));
  if (user.role === 'faculty') return all.filter(c => c.teacherId === user.id);
  if (user.role === 'admin') return all; // Admin sees all
  return [];
};

export const dbCreateClassroom = (data, user) => {
  const classrooms = dbGetClassrooms();
  const newRoom = {
    id: `class-${Date.now()}`,
    name: data.name,
    subject: data.subject,
    teacherId: user.id,
    teacherName: user.name,
    studentIds: data.studentIds || [],
    notes: [],
    createdAt: new Date().toISOString(),
  };
  classrooms.push(newRoom);
  localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify(classrooms));
  dbLog('CREATE_CLASSROOM', user, `Created classroom: ${data.name}`);
  return newRoom;
};

export const dbUpdateClassroom = (classroomId, updates) => {
  const classrooms = dbGetClassrooms();
  const idx = classrooms.findIndex(c => c.id === classroomId);
  if (idx !== -1) {
    classrooms[idx] = { ...classrooms[idx], ...updates };
    localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify(classrooms));
    return classrooms[idx];
  }
  return null;
};

export const dbDeleteClassroom = (classroomId, user) => {
  const classrooms = dbGetClassrooms();
  localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify(classrooms.filter(c => c.id !== classroomId)));
  dbLog('DELETE_CLASSROOM', user, `Deleted classroom ${classroomId}`);
};

export const dbAddNoteToClassroom = (classroomId, note, user) => {
  const classrooms = dbGetClassrooms();
  const idx = classrooms.findIndex(c => c.id === classroomId);
  if (idx === -1) return null;
  const newNote = {
    id: `note-${Date.now()}`,
    name: note.name,
    fileData: note.fileData,
    type: note.type,
    uploadedBy: user.name,
    uploadedAt: new Date().toISOString(),
  };
  classrooms[idx].notes = [...(classrooms[idx].notes || []), newNote];
  localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify(classrooms));
  dbLog('UPLOAD_NOTE', user, `Uploaded note "${note.name}" to classroom ${classroomId}`);
  return newNote;
};

export const dbDeleteNoteFromClassroom = (classroomId, noteId, user) => {
  const classrooms = dbGetClassrooms();
  const idx = classrooms.findIndex(c => c.id === classroomId);
  if (idx === -1) return;
  classrooms[idx].notes = (classrooms[idx].notes || []).filter(n => n.id !== noteId);
  localStorage.setItem(DB_KEYS.CLASSROOMS, JSON.stringify(classrooms));
  dbLog('DELETE_NOTE', user, `Deleted note ${noteId}`);
};

// ---- ASSIGNMENTS ----
export const dbGetAssignments = (classroomId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.ASSIGNMENTS) || '[]');
  return all.filter(a => a.classroomId === classroomId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const dbCreateAssignment = (data, user) => {
  const assignments = JSON.parse(localStorage.getItem(DB_KEYS.ASSIGNMENTS) || '[]');
  const newA = {
    id: `assign-${Date.now()}`,
    classroomId: data.classroomId,
    title: data.title,
    description: data.description || '',
    dueDate: data.dueDate || null,
    createdBy: user.name,
    createdById: user.id,
    createdAt: new Date().toISOString(),
  };
  assignments.push(newA);
  localStorage.setItem(DB_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  dbLog('CREATE_ASSIGNMENT', user, `Created assignment: ${data.title}`);
  return newA;
};

export const dbDeleteAssignment = (assignmentId, user) => {
  const assignments = JSON.parse(localStorage.getItem(DB_KEYS.ASSIGNMENTS) || '[]');
  localStorage.setItem(DB_KEYS.ASSIGNMENTS, JSON.stringify(assignments.filter(a => a.id !== assignmentId)));
  // Also delete submissions
  const subs = JSON.parse(localStorage.getItem(DB_KEYS.SUBMISSIONS) || '[]');
  localStorage.setItem(DB_KEYS.SUBMISSIONS, JSON.stringify(subs.filter(s => s.assignmentId !== assignmentId)));
  dbLog('DELETE_ASSIGNMENT', user, `Deleted assignment ${assignmentId}`);
};

// ---- SUBMISSIONS ----
export const dbGetSubmissions = (assignmentId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.SUBMISSIONS) || '[]');
  return all.filter(s => s.assignmentId === assignmentId);
};

export const dbGetMySubmission = (assignmentId, studentId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.SUBMISSIONS) || '[]');
  return all.find(s => s.assignmentId === assignmentId && s.studentId === studentId) || null;
};

export const dbSubmitAssignment = (assignmentId, fileData, user) => {
  const subs = JSON.parse(localStorage.getItem(DB_KEYS.SUBMISSIONS) || '[]');
  // Remove prev submission
  const filtered = subs.filter(s => !(s.assignmentId === assignmentId && s.studentId === user.id));
  const newSub = {
    id: `sub-${Date.now()}`,
    assignmentId,
    studentId: user.id,
    studentName: user.name,
    studentUsn: user.usn,
    fileName: fileData.name,
    fileData: fileData.data,
    fileType: fileData.type,
    submittedAt: new Date().toISOString(),
  };
  filtered.push(newSub);
  localStorage.setItem(DB_KEYS.SUBMISSIONS, JSON.stringify(filtered));
  dbLog('SUBMIT_ASSIGNMENT', user, `Submitted assignment ${assignmentId}`);
  return newSub;
};

// ---- QUIZ ROOMS ----
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export const dbGetQuizRooms = () => JSON.parse(localStorage.getItem(DB_KEYS.QUIZ_ROOMS) || '[]');

export const dbGetQuizRoomsForUser = (user) => {
  const all = dbGetQuizRooms();
  if (user.role === 'faculty') return all.filter(r => r.teacherId === user.id);
  if (user.role === 'admin') return all;
  return [];
};

export const dbCreateQuizRoom = (data, user) => {
  const rooms = dbGetQuizRooms();
  let code = generateRoomCode();
  // ensure unique
  while (rooms.find(r => r.code === code)) code = generateRoomCode();
  const newRoom = {
    id: `quiz-${Date.now()}`,
    code,
    title: data.title,
    teacherId: user.id,
    teacherName: user.name,
    questions: data.questions || [],
    status: 'open', // open | closed
    createdAt: new Date().toISOString(),
  };
  rooms.push(newRoom);
  localStorage.setItem(DB_KEYS.QUIZ_ROOMS, JSON.stringify(rooms));
  dbLog('CREATE_QUIZ', user, `Created quiz room: ${data.title} (${code})`);
  return newRoom;
};

export const dbGetQuizByCode = (code) => {
  const rooms = dbGetQuizRooms();
  return rooms.find(r => r.code === code.toUpperCase().trim()) || null;
};

export const dbCloseQuizRoom = (roomId, user) => {
  const rooms = dbGetQuizRooms();
  const idx = rooms.findIndex(r => r.id === roomId);
  if (idx !== -1) {
    rooms[idx].status = 'closed';
    localStorage.setItem(DB_KEYS.QUIZ_ROOMS, JSON.stringify(rooms));
    dbLog('CLOSE_QUIZ', user, `Closed quiz room ${roomId}`);
  }
};

export const dbDeleteQuizRoom = (roomId, user) => {
  const rooms = dbGetQuizRooms();
  localStorage.setItem(DB_KEYS.QUIZ_ROOMS, JSON.stringify(rooms.filter(r => r.id !== roomId)));
  dbLog('DELETE_QUIZ', user, `Deleted quiz room ${roomId}`);
};

// ---- QUIZ ATTEMPTS ----
export const dbGetAttempts = (roomId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.QUIZ_ATTEMPTS) || '[]');
  return all.filter(a => a.roomId === roomId).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
};

export const dbGetMyAttempt = (roomId, studentId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.QUIZ_ATTEMPTS) || '[]');
  return all.find(a => a.roomId === roomId && a.studentId === studentId) || null;
};

export const dbSubmitQuizAttempt = (roomId, answers, room, user) => {
  const attempts = JSON.parse(localStorage.getItem(DB_KEYS.QUIZ_ATTEMPTS) || '[]');
  const questions = room.questions || [];
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] !== undefined && answers[i] === q.correctIndex) score++;
  });
  const attempt = {
    id: `attempt-${Date.now()}`,
    roomId,
    studentId: user.id,
    studentName: user.name,
    studentUsn: user.usn,
    answers,
    score,
    total: questions.length,
    submittedAt: new Date().toISOString(),
  };
  // Remove any old attempt by this student in this room
  const filtered = attempts.filter(a => !(a.roomId === roomId && a.studentId === user.id));
  filtered.push(attempt);
  localStorage.setItem(DB_KEYS.QUIZ_ATTEMPTS, JSON.stringify(filtered));
  dbLog('QUIZ_ATTEMPT', user, `Attempted quiz ${room.title}: ${score}/${questions.length}`);
  return attempt;
};

// ---- CHAT ----
export const dbGetConversationKey = (id1, id2) => [id1, id2].sort().join('_');

export const dbGetMessages = (userId1, userId2) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  const key = dbGetConversationKey(userId1, userId2);
  return all.filter(m => m.key === key).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const dbSendMessage = (toUserId, text, sender) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  const key = dbGetConversationKey(sender.id, toUserId);
  const msg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    key,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    receiverId: toUserId,
    text: text.trim(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  all.push(msg);
  localStorage.setItem(DB_KEYS.CHAT_MESSAGES, JSON.stringify(all));
  return msg;
};

export const dbGetChatContacts = (user) => {
  const users = dbGetAllUsers();
  let contacts = [];
  if (user.role === 'student') {
    // Students can only chat with faculty and admin
    contacts = users.filter(u => (u.role === 'faculty' || u.role === 'admin') && u.id !== user.id);
  } else {
    // Faculty and admin can chat with everyone except themselves
    contacts = users.filter(u => u.id !== user.id);
  }

  const allMsgs = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  contacts.forEach(c => {
    const key = dbGetConversationKey(user.id, c.id);
    const msgs = allMsgs.filter(m => m.key === key);
    c.lastMsgTs = msgs.length > 0 ? new Date(msgs[msgs.length - 1].timestamp).getTime() : 0;
  });

  return contacts.sort((a, b) => b.lastMsgTs - a.lastMsgTs);
};

export const dbGetUnreadCount = (userId, fromUserId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  return all.filter(m => m.receiverId === userId && m.senderId === fromUserId && !m.read).length;
};

export const dbMarkMessagesRead = (userId, fromUserId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  const updated = all.map(m => {
    if (m.receiverId === userId && m.senderId === fromUserId) return { ...m, read: true };
    return m;
  });
  localStorage.setItem(DB_KEYS.CHAT_MESSAGES, JSON.stringify(updated));
};

export const dbGetTotalUnread = (userId) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.CHAT_MESSAGES) || '[]');
  const currentUser = JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || 'null');
  if (!currentUser) return 0;

  // Only count unread messages from valid contacts (prevents ghost messages from deleted users)
  const validContacts = dbGetChatContacts(currentUser).map(c => c.id);
  return all.filter(m => m.receiverId === userId && validContacts.includes(m.senderId) && !m.read).length;
};

// ---- EXAM EVENTS ----
export const dbGetExamEvents = () => {
  const events = JSON.parse(localStorage.getItem(DB_KEYS.EXAM_EVENTS) || '[]');
  return events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
};

export const dbSaveExamEvent = (eventData, user) => {
  const events = JSON.parse(localStorage.getItem(DB_KEYS.EXAM_EVENTS) || '[]');
  const newEvent = {
    id: `event-${Date.now()}`,
    title: eventData.title.trim(),
    details: eventData.details?.trim() || '',
    type: eventData.type || 'event', // 'exam' | 'event'
    startDate: eventData.startDate,
    endDate: eventData.endDate || eventData.startDate,
    createdBy: user.name,
    createdById: user.id,
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  localStorage.setItem(DB_KEYS.EXAM_EVENTS, JSON.stringify(events));
  dbLog('CREATE_EVENT', user, `Created event: ${newEvent.title}`);
  return newEvent;
};

export const dbDeleteExamEvent = (eventId, user) => {
  const events = JSON.parse(localStorage.getItem(DB_KEYS.EXAM_EVENTS) || '[]');
  localStorage.setItem(DB_KEYS.EXAM_EVENTS, JSON.stringify(events.filter(e => e.id !== eventId)));
  dbLog('DELETE_EVENT', user, `Deleted event ${eventId}`);
  return true;
};

// ---- CHANGE PASSWORD (admin action) ----
export const dbChangePassword = (userId, newPassword, adminUser) => {
  if (!newPassword || newPassword.length < 4) return { success: false, error: 'Password must be at least 4 characters.' };
  const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { success: false, error: 'User not found.' };
  users[idx].password = newPassword;
  localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  dbLog('CHANGE_PASSWORD', adminUser, `Changed password for user: ${users[idx].name} (${users[idx].role})`);
  return { success: true };
};

// ---- ATTENDANCE ----
export const dbGetAttendance = (filters = {}) => {
  let records = JSON.parse(localStorage.getItem(DB_KEYS.ATTENDANCE) || '[]');
  if (filters.date) records = records.filter(r => r.date === filters.date);
  if (filters.courseId) records = records.filter(r => r.courseId === filters.courseId);
  if (filters.studentId) records = records.filter(r => r.studentId === filters.studentId);
  return records;
};

export const dbSaveAttendance = (records, user) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.ATTENDANCE) || '[]');
  records.forEach(r => {
    const existingIdx = all.findIndex(a => a.date === r.date && a.courseId === r.courseId && a.studentId === r.studentId);
    if (existingIdx >= 0) {
      all[existingIdx].status = r.status;
      all[existingIdx].takenBy = user.id;
    } else {
      all.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: r.date,
        courseId: r.courseId,
        studentId: r.studentId,
        status: r.status,
        takenBy: user.id,
        createdAt: new Date().toISOString()
      });
    }
  });
  localStorage.setItem(DB_KEYS.ATTENDANCE, JSON.stringify(all));
  dbLog('TAKE_ATTENDANCE', user, `Recorded attendance for ${records.length} students`);
};

// ---- TIMETABLE ----
export const dbGetTimetable = (filters = {}) => {
  let records = JSON.parse(localStorage.getItem(DB_KEYS.TIMETABLE) || '[]');
  if (filters.courseId) records = records.filter(r => r.courseId === filters.courseId);
  if (filters.teacherId) records = records.filter(r => r.teacherId === filters.teacherId);
  return records;
};

export const dbSaveTimetable = (courseId, newRecords, user) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.TIMETABLE) || '[]');
  // Remove all existing records for this specific class group
  const filtered = all.filter(r => r.courseId !== courseId);

  // newRecords is an array of period objects { dayOfWeek, startTime, endTime, sub, name, room, teacher }
  const toInsert = newRecords.map(r => ({
    id: `tt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    courseId, // E.g., "BCA-A"
    ...r,
    createdBy: user.id,
    createdAt: new Date().toISOString()
  }));

  filtered.push(...toInsert);
  localStorage.setItem(DB_KEYS.TIMETABLE, JSON.stringify(filtered));
  dbLog('UPDATE_TIMETABLE', user, `Updated schedule for ${courseId}`);
  return true;
};

// ---- RESULTS ----
export const dbGetResults = (filters = {}) => {
  let records = JSON.parse(localStorage.getItem(DB_KEYS.RESULTS) || '[]');
  if (filters.courseId) records = records.filter(r => r.courseId === filters.courseId);
  if (filters.studentId) records = records.filter(r => r.studentId === filters.studentId);
  return records;
};

export const dbSaveResults = (resultsObj, user) => {
  const all = JSON.parse(localStorage.getItem(DB_KEYS.RESULTS) || '[]');
  const newResults = Array.isArray(resultsObj) ? resultsObj : [resultsObj];

  newResults.forEach(r => {
    const idx = all.findIndex(a => a.assessmentName === r.assessmentName && a.courseId === r.courseId && a.studentId === r.studentId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...r };
    } else {
      all.push({
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...r,
        createdAt: new Date().toISOString()
      });
    }
  });
  localStorage.setItem(DB_KEYS.RESULTS, JSON.stringify(all));
  dbLog('SAVE_RESULTS', user, `Saved ${newResults.length} result(s)`);
};

// NOTE: migrateData() and seedData() are now called inside dbInit()
// which is invoked from main.jsx before the React tree is rendered.
// Do NOT call them here directly.
