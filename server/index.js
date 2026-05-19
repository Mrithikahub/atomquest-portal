require('dotenv').config();
const Brevo = require('@getbrevo/brevo');
const { createClient } = require('@libsql/client');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...configuredOrigins
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    console.warn(`[cors] Blocked origin: ${origin}. Configure FRONTEND_URL to allow it.`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

if (isProduction && !process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET is not set. Set it in Render to keep production auth tokens secure and stable.');
}
if (isProduction && configuredOrigins.length === 0) {
  console.warn('[config] FRONTEND_URL is not set. Vercel requests will be blocked by CORS.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'atomquest2024';
const FRONTEND_BASE_URL = configuredOrigins[0] || 'http://localhost:5173';

function appLink(pathname) {
  return `${FRONTEND_BASE_URL.replace(/\/$/, '')}${pathname}`;
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./database.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function dbRun(sql, params = []) {
  await db.execute({ sql, args: params });
}

async function dbGet(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows[0] || null;
}

async function dbAll(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result.rows;
}

async function sendEmail(to, subject, htmlContent) {
  try {
    console.log('📧 Sending email to:', to);
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: 'AtomQuest Portal', email: 'mrithikakumar1112@gmail.com' };
    sendSmtpEmail.to = [{ email: to }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent successfully to:', to);
  } catch(e) {
    console.log('⚠️ Email error:', e.message);
  }
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function createNotification(user_id, type, title, message) {
  try {
    await dbRun('INSERT INTO notifications (user_id, type, title, message) VALUES (?,?,?,?)',
      [user_id, type, title, message]);
  } catch(e) { /* non-critical */ }
}

function getCurrentQuarter() {
  const m = new Date().getMonth() + 1;
  if (m >= 7 && m <= 9)  return 'Q1';
  if (m >= 10 && m <= 12) return 'Q2';
  if (m >= 1 && m <= 3)  return 'Q3';
  return 'Q4';
}

async function initDB() {
  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    manager_id INTEGER
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    thrust_area TEXT,
    description TEXT,
    uom_type TEXT DEFAULT 'min',
    target REAL DEFAULT 0,
    weightage REAL DEFAULT 10,
    status TEXT DEFAULT 'draft',
    locked INTEGER DEFAULT 0,
    is_shared INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    quarter TEXT NOT NULL,
    actual REAL DEFAULT 0,
    status TEXT DEFAULT 'not_started',
    employee_comment TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(goal_id, quarter)
  )`);

  try {
    await dbRun(`ALTER TABLE achievements ADD COLUMN employee_comment TEXT`);
  } catch (e) { /* column already exists */ }

  await dbRun(`CREATE TABLE IF NOT EXISTS checkin_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    manager_id INTEGER NOT NULL,
    quarter TEXT NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER,
    changed_by TEXT,
    change_desc TEXT,
    changed_at TEXT DEFAULT (datetime('now'))
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    title TEXT,
    message TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  console.log('[db] Tables ready');
}

async function seedUsers() {
  const hash = await bcrypt.hash('Test@123', 10);

  await dbRun('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?,?,?,?)',
    ['Admin User', 'admin@test.com', hash, 'admin']);
  await dbRun('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?,?,?,?)',
    ['Ravi Kumar', 'manager@test.com', hash, 'manager']);
  const manager = await dbGet("SELECT id FROM users WHERE email='manager@test.com'");
  await dbRun('INSERT OR IGNORE INTO users (name, email, password, role, manager_id) VALUES (?,?,?,?,?)',
    ['Priya Sharma', 'employee@test.com', hash, 'employee', manager.id]);

  console.log('✅ Seeded: admin@test.com, manager@test.com, employee@test.com | password: Test@123');
}

// AUTH
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;
  try {
    console.log(`[auth:login] Attempt for ${email || '(missing email)'}`);
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      console.warn(`[auth:login] No user found for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password || '', user.password);
    if (!valid) {
      console.warn(`[auth:login] Password mismatch for ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, manager_id: user.manager_id }, JWT_SECRET, { expiresIn: '24h' });
    console.log(`[auth:login] Success for user ${user.id}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, manager_id: user.manager_id } });
  } catch (e) {
    console.error('[auth:login] Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();
    console.log(`[auth:signup] Attempt for ${email || '(missing email)'}`);
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    await dbRun('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', [name, email, hash, role || 'employee']);
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name, manager_id: user.manager_id }, JWT_SECRET, { expiresIn: '24h' });
    console.log(`[auth:signup] Created user ${user.id}`);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch(e) {
    console.error('[auth:signup] Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    environment: process.env.NODE_ENV || 'development',
    database: process.env.TURSO_DATABASE_URL ? 'turso-cloud' : 'local-file',
    frontendConfigured: configuredOrigins.length > 0
  });
});

app.get('/api/me', auth, (req, res) => res.json(req.user));

// GOALS
app.get('/api/goals', auth, async (req, res) => {
  try {
    let goals;
    if (req.user.role === 'admin') {
      goals = await dbAll(`SELECT g.*, u.name as employee_name FROM goals g JOIN users u ON g.employee_id = u.id ORDER BY g.id DESC`);
    } else if (req.user.role === 'manager') {
      goals = await dbAll(`SELECT g.*, u.name as employee_name FROM goals g JOIN users u ON g.employee_id = u.id WHERE u.manager_id = ? ORDER BY g.id DESC`, [req.user.id]);
    } else {
      goals = await dbAll(`SELECT g.*, u.name as employee_name FROM goals g JOIN users u ON g.employee_id = u.id WHERE g.employee_id = ? ORDER BY g.id DESC`, [req.user.id]);
    }
    res.json(goals);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals', auth, async (req, res) => {
  try {
    const { title, thrust_area, description, uom_type, target, weightage } = req.body;
    const count = await dbGet('SELECT COUNT(*) as c FROM goals WHERE employee_id = ?', [req.user.id]);
    if (Number(count.c) >= 8) return res.status(400).json({ error: 'Maximum 8 goals allowed' });
    if (weightage < 10) return res.status(400).json({ error: 'Minimum weightage is 10%' });
    await dbRun('INSERT INTO goals (employee_id, title, thrust_area, description, uom_type, target, weightage) VALUES (?,?,?,?,?,?,?)',
      [req.user.id, title, thrust_area, description, uom_type, target, weightage]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/goals/:id', auth, async (req, res) => {
  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (goal.locked && req.user.role !== 'admin') return res.status(403).json({ error: 'Goal is locked. Only admin can edit.' });

    const title = req.body.title !== undefined ? req.body.title : goal.title;
    const thrust_area = req.body.thrust_area !== undefined ? req.body.thrust_area : goal.thrust_area;
    const description = req.body.description !== undefined ? req.body.description : goal.description;
    const uom_type = req.body.uom_type !== undefined ? req.body.uom_type : goal.uom_type;
    const target = req.body.target !== undefined ? req.body.target : goal.target;
    const weightage = req.body.weightage !== undefined ? req.body.weightage : goal.weightage;
    const locked = req.body.locked !== undefined ? req.body.locked : goal.locked;
    const status = req.body.status !== undefined ? req.body.status : goal.status;

    await dbRun('UPDATE goals SET title=?, thrust_area=?, description=?, uom_type=?, target=?, weightage=?, locked=?, status=? WHERE id=?',
      [title, thrust_area, description, uom_type, target, weightage, locked, status, req.params.id]);

    if (req.body.locked === 0 && req.user.role === 'admin') {
      await dbRun('INSERT INTO audit_log (goal_id, changed_by, change_desc) VALUES (?,?,?)',
        [req.params.id, req.user.name, `Goal "${goal.title}" unlocked by admin`]);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (goal?.locked) return res.status(403).json({ error: 'Cannot delete locked goal' });
    await dbRun('DELETE FROM goals WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals/submit', auth, async (req, res) => {
  try {
    const goals = await dbAll("SELECT * FROM goals WHERE employee_id = ? AND status IN ('draft','returned')", [req.user.id]);
    if (goals.length === 0) return res.status(400).json({ error: 'No goals to submit' });
    const total = goals.reduce((s, g) => s + Number(g.weightage), 0);
    if (Math.round(total) !== 100) return res.status(400).json({ error: `Total weightage must be 100%. Currently: ${total}%` });
    await dbRun("UPDATE goals SET status='submitted' WHERE employee_id = ? AND status IN ('draft','returned')", [req.user.id]);
    const emp = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (emp?.manager_id) {
      await createNotification(emp.manager_id, 'approval_needed', 'Goals Pending Approval',
        `${req.user.name} has submitted their goals and is awaiting your approval.`);
      const submitMgr = await dbGet('SELECT * FROM users WHERE id = ?', [emp.manager_id]);
      const submittedGoalsList = await dbAll("SELECT * FROM goals WHERE employee_id=? AND status='submitted'", [req.user.id]);
      if (submitMgr) {
        sendEmail(submitMgr.email,
          `📋 ${emp.name} submitted goals for approval - AtomQuest`,
          `<h2 style="color:#1C1408;font-size:22px;font-weight:800;margin:0 0 8px;">Goals Awaiting Approval</h2>
          <p style="color:#6B5B3E;font-size:14px;line-height:1.7;"><b>${emp.name}</b> has submitted <b>${submittedGoalsList.length} goals</b> for your review.</p>
          <div style="background:#FDF3D0;border:1px solid #E8D5A3;border-radius:8px;padding:16px;margin:16px 0;">
            ${submittedGoalsList.map(g => `<p style="color:#6B5B3E;font-size:13px;margin:4px 0;">• ${g.title} — ${g.weightage}% weight</p>`).join('')}
          </div>
          <a href="${appLink('/goals')}" style="display:inline-block;background:#D4A843;color:#1A1208;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">Review Goals →</a>`
        );
      }
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals/:id/approve', auth, async (req, res) => {
  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    await dbRun("UPDATE goals SET status='approved', locked=1 WHERE employee_id = ?", [goal.employee_id]);
    await dbRun('INSERT INTO audit_log (goal_id, changed_by, change_desc) VALUES (?,?,?)',
      [req.params.id, req.user.name, `All goals approved and locked for employee ID ${goal.employee_id}`]);
    await createNotification(goal.employee_id, 'goals_approved', '🎉 Goals Approved',
      'Your goals have been approved and locked by your manager. You can now log quarterly achievements.');
    const approveEmp = await dbGet('SELECT * FROM users WHERE id = ?', [goal.employee_id]);
    const approvedGoalsList = await dbAll('SELECT * FROM goals WHERE employee_id = ?', [goal.employee_id]);
    if (approveEmp) {
      sendEmail(approveEmp.email,
        '✅ Your goals have been approved! - AtomQuest',
        `<h2 style="color:#1C1408;font-size:22px;font-weight:800;margin:0 0 8px;">🎉 Goals Approved!</h2>
        <p style="color:#6B5B3E;font-size:14px;line-height:1.7;">Your goals have been <b>approved and locked</b> by your manager.</p>
        <div style="background:#DCFCE7;border:1px solid #86EFAC;border-radius:8px;padding:16px;margin:16px 0;">
          ${approvedGoalsList.map(g => `<p style="color:#166534;font-size:13px;margin:4px 0;">✓ ${g.title} — Target: ${g.target}</p>`).join('')}
        </div>
        <p style="color:#6B5B3E;font-size:14px;">You can now log your quarterly achievements in Check-ins.</p>
        <a href="${appLink('/checkin')}" style="display:inline-block;background:#D4A843;color:#1A1208;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">Go to Check-ins →</a>`
      );
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals/:id/return', auth, async (req, res) => {
  try {
    const goal = await dbGet('SELECT * FROM goals WHERE id = ?', [req.params.id]);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    await dbRun("UPDATE goals SET status='returned', locked=0 WHERE id = ?", [req.params.id]);
    await dbRun('INSERT INTO audit_log (goal_id, changed_by, change_desc) VALUES (?,?,?)',
      [req.params.id, req.user.name, `Goal "${goal.title}" returned for rework`]);
    await createNotification(goal.employee_id, 'goal_returned', '⚠️ Goal Returned for Rework',
      `Your goal "${goal.title}" has been returned. Please review and resubmit.`);
    const returnEmp = await dbGet('SELECT * FROM users WHERE id = ?', [goal.employee_id]);
    if (returnEmp) {
      sendEmail(returnEmp.email,
        '⚠️ Goal returned for rework - AtomQuest',
        `<h2 style="color:#1C1408;font-size:22px;font-weight:800;margin:0 0 8px;">Action Required</h2>
        <p style="color:#6B5B3E;font-size:14px;line-height:1.7;">Your goal <b>"${goal.title}"</b> has been returned for rework.</p>
        <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="color:#DC2626;font-size:13px;font-weight:600;margin:0;">Please review and resubmit this goal</p>
        </div>
        <a href="${appLink('/goals')}" style="display:inline-block;background:#D4A843;color:#1A1208;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">Fix My Goal →</a>`
      );
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/goals/shared', auth, async (req, res) => {
  try {
    const { employee_ids, title, thrust_area, target, uom_type, description } = req.body;
    for (const eid of employee_ids) {
      await dbRun('INSERT INTO goals (employee_id, title, thrust_area, description, uom_type, target, weightage, is_shared) VALUES (?,?,?,?,?,?,10,1)',
        [eid, title, thrust_area, description || '', uom_type, target]);
      await createNotification(eid, 'shared_goal', '📌 Shared Goal Assigned',
        `A shared goal "${title}" has been assigned to you by admin.`);
      const sharedEmp = await dbGet('SELECT * FROM users WHERE id = ?', [eid]);
      if (sharedEmp) {
        sendEmail(sharedEmp.email,
          '📌 New shared goal assigned - AtomQuest',
          `<h2 style="color:#1C1408;font-size:22px;font-weight:800;margin:0 0 8px;">Shared Goal Assigned</h2>
          <p style="color:#6B5B3E;font-size:14px;line-height:1.7;">Admin has assigned a shared goal to you.</p>
          <div style="background:#FDF3D0;border:1px solid #E8D5A3;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#B8860B;font-size:14px;font-weight:700;margin:0 0 4px;">${title}</p>
            <p style="color:#6B5B3E;font-size:13px;margin:0;">Target: ${target} | Type: ${uom_type}</p>
          </div>
          <p style="color:#6B5B3E;font-size:13px;">You can adjust the weightage but title and target are fixed.</p>
          <a href="${appLink('/goals')}" style="display:inline-block;background:#D4A843;color:#1A1208;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">View My Goals →</a>`
        );
      }
    }
    await dbRun('INSERT INTO audit_log (goal_id, changed_by, change_desc) VALUES (?,?,?)',
      [null, req.user.name, `Shared goal "${title}" pushed to ${employee_ids.length} employees`]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ACHIEVEMENTS
app.get('/api/achievements', auth, async (req, res) => {
  try {
    const { employee_id, quarter } = req.query;
    let sql = `SELECT a.*, g.title, g.target, g.uom_type FROM achievements a JOIN goals g ON a.goal_id = g.id WHERE g.employee_id = ?`;
    const params = [employee_id || req.user.id];
    if (quarter) { sql += ' AND a.quarter = ?'; params.push(quarter); }
    res.json(await dbAll(sql, params));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/achievements', auth, async (req, res) => {
  try {
    const { goal_id, quarter, actual, status, employee_comment } = req.body;
    await dbRun(`INSERT INTO achievements (goal_id, quarter, actual, status, employee_comment, updated_at) VALUES (?,?,?,?,?,datetime('now'))
      ON CONFLICT(goal_id, quarter) DO UPDATE SET actual=excluded.actual, status=excluded.status, employee_comment=excluded.employee_comment, updated_at=excluded.updated_at`,
      [goal_id, quarter, actual, status, employee_comment || null]);
    const achGoal = await dbGet('SELECT * FROM goals WHERE id = ?', [goal_id]);
    if (achGoal) {
      const achEmp = await dbGet('SELECT * FROM users WHERE id = ?', [achGoal.employee_id]);
      const achMgr = achEmp?.manager_id ? await dbGet('SELECT * FROM users WHERE id = ?', [achEmp.manager_id]) : null;
      if (achMgr) {
        sendEmail(achMgr.email,
          `📊 ${achEmp.name} updated ${quarter} achievements - AtomQuest`,
          `<h2 style="color:#1C1408;font-size:22px;font-weight:800;margin:0 0 8px;">${quarter} Achievement Updated</h2>
          <p style="color:#6B5B3E;font-size:14px;line-height:1.7;"><b>${achEmp.name}</b> logged their ${quarter} achievement.</p>
          <div style="background:#FDF3D0;border:1px solid #E8D5A3;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="color:#B8860B;font-size:14px;font-weight:700;margin:0 0 4px;">${achGoal.title}</p>
            <p style="color:#6B5B3E;font-size:13px;margin:0;">Actual: ${actual} | Target: ${achGoal.target}</p>
          </div>
          <a href="${appLink('/checkin')}" style="display:inline-block;background:#D4A843;color:#1A1208;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px;">Review Progress →</a>`
        );
      }
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// CHECKINS
app.post('/api/checkins', auth, async (req, res) => {
  try {
    const { goal_id, quarter, comment } = req.body;
    await dbRun('INSERT INTO checkin_comments (goal_id, manager_id, quarter, comment) VALUES (?,?,?,?)',
      [goal_id, req.user.id, quarter, comment]);
    const goalInfo = await dbGet(`SELECT g.employee_id, u.name as emp_name, u.manager_id FROM goals g JOIN users u ON g.employee_id = u.id WHERE g.id = ?`, [goal_id]);
    if (goalInfo?.manager_id) {
      await createNotification(goalInfo.manager_id, 'checkin_update', 'Check-in Comment Added',
        `You added a check-in comment for ${goalInfo.emp_name}'s ${quarter} progress.`);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/checkins/:goalId', auth, async (req, res) => {
  try {
    res.json(await dbAll('SELECT c.*, u.name as manager_name FROM checkin_comments c JOIN users u ON c.manager_id = u.id WHERE c.goal_id = ?', [req.params.goalId]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// USERS
app.get('/api/users/team', auth, async (req, res) => {
  try {
    res.json(await dbAll('SELECT id, name, email, role FROM users WHERE manager_id = ?', [req.user.id]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/all', auth, async (req, res) => {
  try {
    res.json(await dbAll("SELECT id, name, email, role FROM users WHERE role = 'employee'"));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ADMIN
app.get('/api/admin/employees', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const employees = await dbAll(`
      SELECT e.id, e.name, e.email, e.manager_id, m.name as manager_name, m.email as manager_email
      FROM users e
      LEFT JOIN users m ON e.manager_id = m.id
      WHERE e.role = 'employee'
      ORDER BY e.name
    `);
    res.json(employees);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/managers', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    res.json(await dbAll("SELECT id, name, email FROM users WHERE role = 'manager' ORDER BY name"));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/assign-manager', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const { employeeId, managerId } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
    await dbRun('UPDATE users SET manager_id = ? WHERE id = ?', [managerId || null, employeeId]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// REPORTS
app.get('/api/reports/achievement', auth, async (req, res) => {
  try {
    const { quarter, employee_id } = req.query;
    let sql = `SELECT g.*, u.name as employee_name FROM goals g JOIN users u ON g.employee_id = u.id`;
    const params = [];
    if (req.user.role === 'manager') {
      sql += ` WHERE u.manager_id = ?`;
      params.push(req.user.id);
    }
    if (employee_id) {
      sql += (params.length > 0 ? ' AND' : ' WHERE') + ` g.employee_id = ?`;
      params.push(employee_id);
    }
    const goals = await dbAll(sql, params);
    const result = await Promise.all(goals.map(async g => {
      const quarters = quarter ? [quarter] : ['Q1','Q2','Q3','Q4'];
      const achMap = {};
      await Promise.all(quarters.map(async q => {
        const a = await dbGet('SELECT actual, status, employee_comment FROM achievements WHERE goal_id = ? AND quarter = ?', [g.id, q]);
        achMap[q] = a ? a.actual : null;
        achMap[`${q}_comment`] = a ? a.employee_comment : null;
        achMap[`${q}_status`] = a ? a.status : null;
      }));
      return { ...g, ...achMap };
    }));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/audit', auth, async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reports/completion', auth, async (req, res) => {
  try {
    const employees = await dbAll("SELECT id, name FROM users WHERE role='employee'");
    const quarters = ['Q1','Q2','Q3','Q4'];
    const result = await Promise.all(employees.map(async emp => {
      const completedQuarters = [];
      for (const q of quarters) {
        const empGoals = await dbAll("SELECT id FROM goals WHERE employee_id=? AND status='approved'", [emp.id]);
        if (!empGoals.length) continue;
        const checks = await Promise.all(empGoals.map(g =>
          dbGet('SELECT id FROM achievements WHERE goal_id=? AND quarter=?', [g.id, q])
        ));
        if (checks.every(Boolean)) completedQuarters.push(q);
      }
      return { ...emp, completedQuarters };
    }));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ESCALATIONS
app.get('/api/escalations', auth, async (req, res) => {
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Admin/Manager only' });
  try {
    const now = new Date();
    const currentQuarter = getCurrentQuarter();
    const escalations = [];
    const seen = new Set();

    const draftGroups = await dbAll(`
      SELECT g.employee_id, u.name as employee_name, u.email, MIN(g.created_at) as earliest
      FROM goals g JOIN users u ON g.employee_id = u.id
      WHERE g.status IN ('draft','returned')
      GROUP BY g.employee_id
      HAVING julianday('now') - julianday(MIN(g.created_at)) > 7
    `);
    draftGroups.forEach(g => {
      const days = Math.max(0, Math.floor((now - new Date(g.earliest)) / 86400000));
      const key = `${g.employee_id}-draft`;
      if (!seen.has(key)) {
        seen.add(key);
        escalations.push({ employee_name: g.employee_name, email: g.email, type: 'Goal Not Submitted',
          message: `Goals have been in draft/returned for ${days} days without resubmission.`,
          days_overdue: days, severity: days > 14 ? 'high' : 'medium' });
      }
    });

    const pendingApproval = await dbAll(`
      SELECT g.employee_id, u.name as employee_name, u.email, MIN(g.created_at) as earliest
      FROM goals g JOIN users u ON g.employee_id = u.id
      WHERE g.status = 'submitted'
      GROUP BY g.employee_id
      HAVING julianday('now') - julianday(MIN(g.created_at)) > 3
    `);
    pendingApproval.forEach(g => {
      const days = Math.max(0, Math.floor((now - new Date(g.earliest)) / 86400000));
      const key = `${g.employee_id}-approval`;
      if (!seen.has(key)) {
        seen.add(key);
        escalations.push({ employee_name: g.employee_name, email: g.email, type: 'Approval Pending',
          message: `Goals submitted ${days} days ago but not yet approved by manager.`,
          days_overdue: days, severity: days > 14 ? 'high' : days > 7 ? 'medium' : 'low' });
      }
    });

    const approvedEmps = await dbAll(`SELECT DISTINCT g.employee_id, u.name as employee_name, u.email FROM goals g JOIN users u ON g.employee_id = u.id WHERE g.status='approved'`);
    for (const emp of approvedEmps) {
      const approvedGoals = await dbAll(`SELECT id FROM goals WHERE employee_id=? AND status='approved'`, [emp.employee_id]);
      let hasAny = false;
      for (const g of approvedGoals) {
        const found = await dbGet('SELECT id FROM achievements WHERE goal_id=? AND quarter=?', [g.id, currentQuarter]);
        if (found) { hasAny = true; break; }
      }
      if (!hasAny) {
        const key = `${emp.employee_id}-checkin`;
        if (!seen.has(key)) {
          seen.add(key);
          escalations.push({ employee_name: emp.employee_name, email: emp.email, type: 'Check-in Overdue',
            message: `No ${currentQuarter} achievements logged yet for approved goals.`,
            days_overdue: 0, severity: 'medium' });
        }
      }
    }

    res.json(escalations);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// NOTIFICATIONS
app.get('/api/notifications/count', auth, async (req, res) => {
  try {
    const r = await dbGet('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0', [req.user.id]);
    res.json({ count: r?.c || 0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notifications', auth, async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM notifications WHERE user_id=? ORDER BY read ASC, id DESC LIMIT 50', [req.user.id]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET read=1 WHERE user_id=?', [req.user.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await dbRun('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

initDB().then(async () => {
  await seedUsers();
  app.listen(PORT, () => {
    console.log(`🚀 AtomQuest API running on port ${PORT}`);
    console.log(`[config] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    console.log(`[config] Database=${process.env.TURSO_DATABASE_URL ? 'Turso cloud' : 'local file'}`);
    console.log(`[config] Allowed origins=${Array.from(allowedOrigins).join(', ')}`);
  });
}).catch(error => {
  console.error('[startup] Failed to start AtomQuest API:', error);
  process.exit(1);
});
