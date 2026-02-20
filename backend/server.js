/**
 * AcadCentral – MariaDB Backend
 * ──────────────────────────────
 * Uses mysql2 to connect to MariaDB.
 * Auto-creates the database and all tables on startup.
 * Migrates existing data from acportal-db.json if present.
 *
 * Endpoints (same API the frontend already uses):
 *   GET  /api/health
 *   GET  /api/data        → returns all data as the same JSON shape
 *   POST /api/sync        → upsert a single collection (key+value)
 *   POST /api/sync-all    → replace all collections at once
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '200mb' }));

// ─── DB Config ───────────────────────────────────────────────────────────────
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'acportal_db',
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
};

let pool;

// ─── Schema ──────────────────────────────────────────────────────────────────
// Each acportal collection is stored as one table.
// Complex nested objects (arrays, JSON) are stored in a `data` LONGTEXT column.
const TABLES = {
    acportal_users: `
    CREATE TABLE IF NOT EXISTS acportal_users (
      id          VARCHAR(100) PRIMARY KEY,
      role        VARCHAR(20)  NOT NULL,
      name        VARCHAR(255) NOT NULL,
      email       VARCHAR(255) NOT NULL UNIQUE,
      password    VARCHAR(255),
      usn         VARCHAR(100),
      semester    VARCHAR(10),
      avatar      VARCHAR(10),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_files: `
    CREATE TABLE IF NOT EXISTS acportal_files (
      id            VARCHAR(100) PRIMARY KEY,
      name          VARCHAR(500) NOT NULL,
      subject       VARCHAR(255),
      subjectName   VARCHAR(255),
      semester      VARCHAR(10),
      status        VARCHAR(20) DEFAULT 'pending',
      uploadedBy    VARCHAR(255),
      uploaderId    VARCHAR(100),
      uploaderRole  VARCHAR(20),
      downloads     INT DEFAULT 0,
      uploadDate    DATETIME,
      fileData      LONGTEXT,
      fileType      VARCHAR(100),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_notices: `
    CREATE TABLE IF NOT EXISTS acportal_notices (
      id          VARCHAR(100) PRIMARY KEY,
      title       VARCHAR(500) NOT NULL,
      content     TEXT,
      category    VARCHAR(100),
      priority    VARCHAR(20),
      postedBy    VARCHAR(255),
      posterId    VARCHAR(100),
      postedDate  DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_classrooms: `
    CREATE TABLE IF NOT EXISTS acportal_classrooms (
      id          VARCHAR(100) PRIMARY KEY,
      name        VARCHAR(500) NOT NULL,
      subject     VARCHAR(255),
      teacherId   VARCHAR(100),
      teacherName VARCHAR(255),
      studentIds  LONGTEXT,
      notes       LONGTEXT,
      createdAt   DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_assignments: `
    CREATE TABLE IF NOT EXISTS acportal_assignments (
      id           VARCHAR(100) PRIMARY KEY,
      classroomId  VARCHAR(100),
      title        VARCHAR(500) NOT NULL,
      description  TEXT,
      dueDate      VARCHAR(50),
      createdBy    VARCHAR(255),
      createdById  VARCHAR(100),
      createdAt    DATETIME,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_submissions: `
    CREATE TABLE IF NOT EXISTS acportal_submissions (
      id            VARCHAR(100) PRIMARY KEY,
      assignmentId  VARCHAR(100),
      studentId     VARCHAR(100),
      studentName   VARCHAR(255),
      studentUsn    VARCHAR(100),
      fileName      VARCHAR(500),
      fileData      LONGTEXT,
      fileType      VARCHAR(100),
      submittedAt   DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_quiz_rooms: `
    CREATE TABLE IF NOT EXISTS acportal_quiz_rooms (
      id          VARCHAR(100) PRIMARY KEY,
      code        VARCHAR(10) UNIQUE,
      title       VARCHAR(500) NOT NULL,
      teacherId   VARCHAR(100),
      teacherName VARCHAR(255),
      questions   LONGTEXT,
      status      VARCHAR(20) DEFAULT 'open',
      createdAt   DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_quiz_attempts: `
    CREATE TABLE IF NOT EXISTS acportal_quiz_attempts (
      id           VARCHAR(100) PRIMARY KEY,
      roomId       VARCHAR(100),
      studentId    VARCHAR(100),
      studentName  VARCHAR(255),
      studentUsn   VARCHAR(100),
      answers      LONGTEXT,
      score        INT DEFAULT 0,
      total        INT DEFAULT 0,
      submittedAt  DATETIME,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_chat_messages: `
    CREATE TABLE IF NOT EXISTS acportal_chat_messages (
      id          VARCHAR(100) PRIMARY KEY,
      \`key\`       VARCHAR(200),
      senderId    VARCHAR(100),
      senderName  VARCHAR(255),
      senderRole  VARCHAR(20),
      receiverId  VARCHAR(100),
      text        TEXT,
      timestamp   DATETIME,
      isRead      TINYINT(1) DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_exam_events: `
    CREATE TABLE IF NOT EXISTS acportal_exam_events (
      id           VARCHAR(100) PRIMARY KEY,
      title        VARCHAR(500) NOT NULL,
      details      TEXT,
      type         VARCHAR(20) DEFAULT 'event',
      startDate    DATE,
      endDate      DATE,
      createdBy    VARCHAR(255),
      createdById  VARCHAR(100),
      createdAt    DATETIME,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_audit_logs: `
    CREATE TABLE IF NOT EXISTS acportal_audit_logs (
      id         VARCHAR(100) PRIMARY KEY,
      action     VARCHAR(100),
      userId     VARCHAR(100),
      userName   VARCHAR(255),
      role       VARCHAR(20),
      detail     TEXT,
      timestamp  DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_attendance: `
    CREATE TABLE IF NOT EXISTS acportal_attendance (
      id          VARCHAR(100) PRIMARY KEY,
      date        VARCHAR(20),
      courseId    VARCHAR(100),
      studentId   VARCHAR(100),
      status      VARCHAR(20),
      takenBy     VARCHAR(100),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_timetable: `
    CREATE TABLE IF NOT EXISTS acportal_timetable (
      id          VARCHAR(100) PRIMARY KEY,
      dayOfWeek   VARCHAR(20),
      startTime   VARCHAR(20),
      endTime     VARCHAR(20),
      courseId    VARCHAR(100),
      room        VARCHAR(100),
      teacherId   VARCHAR(100),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    acportal_results: `
    CREATE TABLE IF NOT EXISTS acportal_results (
      id              VARCHAR(100) PRIMARY KEY,
      assessmentName  VARCHAR(255),
      courseId        VARCHAR(100),
      program         VARCHAR(255),
      studentGroup    VARCHAR(100),
      studentId       VARCHAR(100),
      theoryScore     VARCHAR(20),
      vivaScore       VARCHAR(20),
      comments        TEXT,
      totalScore      VARCHAR(20),
      grade           VARCHAR(10),
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
};

// ─── Table → column mapping for INSERT/SELECT ────────────────────────────────
// Each entry: { columns: [...], extract: (row) => plainObject }
// For upsert we serialize each record to its row columns.

// ─── Table Columns Cache ───────────────────────────────────────────────────────
const TABLE_COLUMNS = {}; // { acportal_users: ['id', 'name', ...] }

async function createDatabase() {
    const tempConn = await mysql.createConnection({
        host: DB_CONFIG.host,
        port: DB_CONFIG.port,
        user: DB_CONFIG.user,
        password: DB_CONFIG.password,
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConn.end();
    console.log(`  ✓ Database '${DB_CONFIG.database}' ready.`);
}

async function createTables(conn) {
    for (const [name, sql] of Object.entries(TABLES)) {
        // Add missing columns if they don't exist in the CREATE TABLE string
        let modifiedSql = sql;
        if (name === 'acportal_notices' && !sql.includes('urgent')) {
            modifiedSql = sql.replace('postedBy', 'urgent TINYINT(1) DEFAULT 0, postedBy');
        }
        if (name === 'acportal_files' && !sql.includes('unit')) {
            modifiedSql = sql.replace('fileType', 'unit VARCHAR(100), fileType');
        }
        await conn.query(modifiedSql);
        // Cache valid columns
        const [cols] = await conn.query(`SHOW COLUMNS FROM \`${name}\``);
        TABLE_COLUMNS[name] = new Set(cols.map(c => c.Field));
    }
    console.log(`  ✓ All ${Object.keys(TABLES).length} tables created/verified.`);
}

// ─── Read entire collection from MariaDB → JS array ─────────────────────────
async function readCollection(conn, table) {
    try {
        const [rows] = await conn.query(`SELECT * FROM \`${table}\` ORDER BY created_at ASC`);
        return rows.map(row => {
            // Parse JSON columns
            const r = { ...row };
            ['studentIds', 'notes', 'questions', 'answers'].forEach(col => {
                if (r[col] && typeof r[col] === 'string') {
                    try { r[col] = JSON.parse(r[col]); } catch { }
                }
            });
            if ('urgent' in r) { r.urgent = !!r.urgent; }
            // isRead → read (frontend expects 'read')
            if ('isRead' in r) { r.read = !!r.isRead; delete r.isRead; }
            // Remove internal created_at
            delete r.created_at;
            return r;
        });
    } catch { return []; }
}

// ─── Convert ISO 8601 datetime to MySQL DATETIME string ──────────────────────
function isoToMySQL(val) {
    if (!val || typeof val !== 'string') return val;
    // Match ISO 8601: 2026-02-20T17:38:44.124Z or 2026-02-20T17:38:44Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return val.replace('T', ' ').replace(/\.\d+Z?$/, '').replace('Z', '');
    }
    return val;
}

// ─── Upsert a single record into the right table ─────────────────────────────
async function upsertRecord(conn, table, record) {
    const r = { ...record };
    // Serialize JSON columns
    ['studentIds', 'notes', 'questions', 'answers'].forEach(col => {
        if (r[col] !== undefined && typeof r[col] !== 'string') r[col] = JSON.stringify(r[col]);
    });
    // Convert all ISO datetime strings to MySQL DATETIME format
    Object.keys(r).forEach(col => {
        if (typeof r[col] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r[col])) {
            r[col] = isoToMySQL(r[col]);
        }
    });
    // read → isRead
    if ('read' in r) { r.isRead = r.read ? 1 : 0; delete r.read; }
    if ('urgent' in r) { r.urgent = r.urgent ? 1 : 0; }

    // STRICT FILTER: Only insert columns that actually exist in the MariaDB table
    const validCols = TABLE_COLUMNS[table] || new Set();
    const cols = Object.keys(r).filter(k => k !== 'created_at' && validCols.has(k));
    if (cols.length === 0) return;

    const vals = cols.map(c => r[c] ?? null);
    const placeholders = cols.map(() => '?').join(', ');
    const updates = cols.filter(c => c !== 'id').map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

    const sql = `INSERT INTO \`${table}\` (\`${cols.join('`,`')}\`) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
    await conn.query(sql, vals);
}

// ─── Sync full collection (array of records) to table ───────────────────────
async function syncCollection(conn, table, records) {
    if (!Array.isArray(records)) return;

    // 1. Upsert all provided records
    for (const record of records) {
        if (record && record.id) {
            await upsertRecord(conn, table, record);
        }
    }

    // 2. Delete any records in MariaDB that are missing from the frontend payload
    // (Since frontend always sends the full array for a collection)
    const incomingIds = records.filter(r => r && r.id).map(r => r.id);

    if (incomingIds.length > 0) {
        const placeholders = incomingIds.map(() => '?').join(',');
        const deleteSql = `DELETE FROM \`${table}\` WHERE id NOT IN (${placeholders})`;
        await conn.query(deleteSql, incomingIds);
    } else {
        // If the frontend array is completely empty, delete all rows in the table
        await conn.query(`TRUNCATE TABLE \`${table}\``);
    }
}

// ─── Migrate from JSON file if it exists ─────────────────────────────────────
async function migrateFromJSON(conn) {
    const jsonFile = path.join(__dirname, 'acportal-db.json');
    if (!fs.existsSync(jsonFile)) return;
    try {
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        let migrated = 0;
        for (const [key, records] of Object.entries(data)) {
            if (TABLES[key] && Array.isArray(records) && records.length > 0) {
                await syncCollection(conn, key, records);
                migrated += records.length;
            }
        }
        if (migrated > 0) {
            console.log(`  ✓ Migrated ${migrated} records from acportal-db.json → MariaDB.`);
            // Rename so it doesn't migrate again
            fs.renameSync(jsonFile, jsonFile + '.migrated');
        }
    } catch (err) {
        console.error('  ⚠ Migration from JSON failed:', err.message);
    }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: 'MariaDB', timestamp: new Date().toISOString() });
});

/** Return ALL data in the same shape the frontend expects */
app.get('/api/data', async (_req, res) => {
    try {
        const conn = await pool.getConnection();
        const result = {};
        for (const table of Object.keys(TABLES)) {
            result[table] = await readCollection(conn, table);
        }
        conn.release();
        res.json(result);
    } catch (err) {
        console.error('/api/data error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/** Sync one collection: { key: 'acportal_users', value: '[...]' } */
app.post('/api/sync', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || !TABLES[key]) return res.status(400).json({ error: 'Unknown collection key' });

        let records;
        try { records = typeof value === 'string' ? JSON.parse(value) : value; }
        catch { return res.status(400).json({ error: 'Invalid JSON value' }); }

        if (!Array.isArray(records)) return res.json({ ok: true, skipped: true });

        const conn = await pool.getConnection();
        await syncCollection(conn, key, records);
        conn.release();
        res.json({ ok: true, count: records.length });
    } catch (err) {
        console.error('/api/sync error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/** Replace all collections at once */
app.post('/api/sync-all', async (req, res) => {
    try {
        const data = req.body;
        const conn = await pool.getConnection();
        let total = 0;
        for (const [key, records] of Object.entries(data)) {
            if (TABLES[key] && Array.isArray(records)) {
                await syncCollection(conn, key, records);
                total += records.length;
            }
        }
        conn.release();
        res.json({ ok: true, total });
    } catch (err) {
        console.error('/api/sync-all error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function start() {
    try {
        console.log('');
        console.log('  ╔══════════════════════════════════════════╗');
        console.log('  ║   AcadCentral – MariaDB Backend           ║');
        console.log(`  ║   Connecting to MariaDB @ ${DB_CONFIG.host}:${DB_CONFIG.port}   ║`);
        console.log('  ╚══════════════════════════════════════════╝');
        console.log('');

        // 1. Create database if not exists
        await createDatabase();

        // 2. Create connection pool
        pool = mysql.createPool(DB_CONFIG);
        const conn = await pool.getConnection();

        // 3. Create tables
        await createTables(conn);

        // 4. Migrate from JSON file if present
        await migrateFromJSON(conn);

        conn.release();

        // 5. Start HTTP server
        app.listen(PORT, () => {
            console.log('');
            console.log(`  ✅ Server running on http://localhost:${PORT}`);
            console.log(`  📦 Database: ${DB_CONFIG.database} @ ${DB_CONFIG.host}:${DB_CONFIG.port}`);
            console.log('');
            console.log('  MariaDB terminal access:');
            console.log(`  mysql -u ${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database}`);
            console.log('');
        });
    } catch (err) {
        console.error('  ❌ Startup failed:', err.message);
        process.exit(1);
    }
}

start();
