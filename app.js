const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const SqliteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const { openDb, run, get, all, DB_PATH } = require('./db');

const app = express();
const db = openDb();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    store: new SqliteStore({ db: 'sessions.db', dir: path.join(__dirname, 'data') }),
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

const csrfProtection = csrf();
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return csrfProtection(req, res, next);
  }
  return next();
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await get(db, 'SELECT is_admin FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.is_admin !== 1) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

function computeNextReview(count) {
  const intervals = [1, 3, 7, 14, 30];
  const days = intervals[Math.min(count - 1, intervals.length - 1)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

async function ensureProgress(userId) {
  const existing = await get(db, 'SELECT user_id FROM user_progress WHERE user_id = ?', [userId]);
  if (!existing) {
    await run(
      db,
      'INSERT INTO user_progress (user_id, xp, streak, last_activity, hearts, level, last_lesson_id, last_position) VALUES (?, 0, 0, datetime("now"), 5, 1, NULL, 0)',
      [userId]
    );
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getDailyQuests(userId) {
  const today = todayDate();
  let quest = await get(db, 'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ?', [userId, today]);
  if (!quest) {
    const goals = [
      { id: 'complete_lesson', target: 1 },
      { id: 'earn_xp', target: 30 },
      { id: 'practice_mistakes', target: 1 },
    ];
    const progress = { complete_lesson: 0, earn_xp: 0, practice_mistakes: 0 };
    await run(
      db,
      'INSERT INTO daily_quests (user_id, quest_date, goal_json, progress_json) VALUES (?, ?, ?, ?)',
      [userId, today, JSON.stringify(goals), JSON.stringify(progress)]
    );
    quest = await get(db, 'SELECT * FROM daily_quests WHERE user_id = ? AND quest_date = ?', [userId, today]);
  }
  return quest;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/csrf', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const uiLanguage = req.body.uiLanguage === 'pl' ? 'pl' : 'en';

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const existing = await get(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ error: 'Account already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await run(
    db,
    'INSERT INTO users (email, password_hash, ui_language) VALUES (?, ?, ?)',
    [email, passwordHash, uiLanguage]
  );
  await ensureProgress(result.lastID);
  req.session.userId = result.lastID;
  res.json({ id: result.lastID, email, uiLanguage });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const user = await get(db, 'SELECT id, password_hash, ui_language FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.userId = user.id;
  await ensureProgress(user.id);
  res.json({ id: user.id, email, uiLanguage: user.ui_language });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.post('/api/auth/request-reset', authLimiter, async (req, res) => {
  const email = sanitizeEmail(req.body.email);
  const user = await get(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.json({ ok: true });
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  await run(
    db,
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, token, expires]
  );
  console.log(`Password reset token for ${email}: http://localhost:3000/reset.html?token=${token}`);
  res.json({ ok: true });
});

app.post('/api/auth/reset', authLimiter, async (req, res) => {
  const token = String(req.body.token || '');
  const newPassword = String(req.body.newPassword || '');
  if (!token || newPassword.length < 6) {
    return res.status(400).json({ error: 'Invalid token or password' });
  }
  const reset = await get(
    db,
    'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
    [token]
  );
  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await run(db, 'UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id]);
  await run(db, 'UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await get(
    db,
    'SELECT id, email, ui_language, daily_goal, is_admin FROM users WHERE id = ?',
    [req.session.userId]
  );
  const progress = await get(db, 'SELECT * FROM user_progress WHERE user_id = ?', [req.session.userId]);
  res.json({ user, progress });
});

app.get('/api/achievements', requireAuth, async (req, res) => {
  const progress = await get(db, 'SELECT xp, streak FROM user_progress WHERE user_id = ?', [req.session.userId]);
  const achievements = [
    { id: 'xp_100', earned: progress.xp >= 100 },
    { id: 'xp_500', earned: progress.xp >= 500 },
    { id: 'streak_3', earned: progress.streak >= 3 },
    { id: 'streak_7', earned: progress.streak >= 7 },
  ];
  res.json({ achievements });
});

app.patch('/api/me', requireAuth, async (req, res) => {
  const uiLanguage = req.body.uiLanguage === 'pl' ? 'pl' : 'en';
  const dailyGoal = Number(req.body.dailyGoal || 20);
  await run(db, 'UPDATE users SET ui_language = ?, daily_goal = ? WHERE id = ?', [
    uiLanguage,
    Number.isNaN(dailyGoal) ? 20 : dailyGoal,
    req.session.userId,
  ]);
  res.json({ ok: true });
});

app.get('/api/lessons', requireAuth, async (req, res) => {
  const lessons = await all(
    db,
    'SELECT id, unit, level, title_fr, title_en, title_pl FROM lessons ORDER BY id ASC'
  );
  res.json({ lessons });
});

app.get('/api/lessons/:id', requireAuth, async (req, res) => {
  const lesson = await get(db, 'SELECT * FROM lessons WHERE id = ?', [req.params.id]);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }
  const progress = await get(
    db,
    'SELECT status, last_position FROM user_lessons WHERE user_id = ? AND lesson_id = ?',
    [req.session.userId, req.params.id]
  );
  res.json({
    lesson: { ...lesson, content: JSON.parse(lesson.content_json) },
    progress: progress || { status: 'new', last_position: 0 },
  });
});

app.post('/api/lessons/:id/position', requireAuth, async (req, res) => {
  const position = Number(req.body.position || 0);
  await run(
    db,
    'INSERT INTO user_lessons (user_id, lesson_id, status, last_position) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, lesson_id) DO UPDATE SET last_position = excluded.last_position',
    [req.session.userId, req.params.id, 'in_progress', position]
  );
  await run(db, 'UPDATE user_progress SET last_lesson_id = ?, last_position = ? WHERE user_id = ?', [
    req.params.id,
    position,
    req.session.userId,
  ]);
  res.json({ ok: true });
});

app.post('/api/lessons/:id/complete', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id);
  const xpEarned = Number(req.body.xp || 0);
  await run(
    db,
    'INSERT INTO user_lessons (user_id, lesson_id, status, last_position, completed_at) VALUES (?, ?, ?, ?, datetime("now")) ON CONFLICT(user_id, lesson_id) DO UPDATE SET status = excluded.status, completed_at = excluded.completed_at',
    [req.session.userId, lessonId, 'completed', 0]
  );
  const progress = await get(db, 'SELECT xp, streak, last_activity, hearts FROM user_progress WHERE user_id = ?', [
    req.session.userId,
  ]);
  const now = new Date();
  const lastActivityDate = progress.last_activity ? progress.last_activity.slice(0, 10) : null;
  const isNewDay = lastActivityDate !== now.toISOString().slice(0, 10);
  const streak = isNewDay ? progress.streak + 1 : progress.streak;
  const newXp = progress.xp + xpEarned;
  const level = Math.max(1, Math.floor(newXp / 200) + 1);
  const hearts = Math.min(5, progress.hearts + 1);
  await run(
    db,
    'UPDATE user_progress SET xp = ?, streak = ?, level = ?, hearts = ?, last_activity = datetime("now"), last_lesson_id = NULL, last_position = 0 WHERE user_id = ?',
    [newXp, streak, level, hearts, req.session.userId]
  );
  res.json({ ok: true, streak });
});

app.post('/api/progress/record', requireAuth, async (req, res) => {
  const { correct, itemKey } = req.body;
  const heartsDelta = correct ? 0 : -1;
  await run(db, 'UPDATE user_progress SET hearts = MAX(0, hearts + ?) WHERE user_id = ?', [
    heartsDelta,
    req.session.userId,
  ]);
  if (!correct && itemKey) {
    const existing = await get(
      db,
      'SELECT id, count FROM mistakes WHERE user_id = ? AND item_key = ?',
      [req.session.userId, itemKey]
    );
    if (existing) {
      const newCount = existing.count + 1;
      await run(
        db,
        'UPDATE mistakes SET count = ?, next_review_at = ?, last_wrong_at = datetime("now") WHERE id = ?',
        [newCount, computeNextReview(newCount), existing.id]
      );
    } else {
      await run(
        db,
        'INSERT INTO mistakes (user_id, item_key, count, next_review_at, last_wrong_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [req.session.userId, itemKey, 1, computeNextReview(1)]
      );
    }
  }
  if (correct && itemKey) {
    await run(db, 'DELETE FROM mistakes WHERE user_id = ? AND item_key = ?', [req.session.userId, itemKey]);
  }
  res.json({ ok: true });
});

app.get('/api/review', requireAuth, async (req, res) => {
  const items = await all(
    db,
    'SELECT item_key, count FROM mistakes WHERE user_id = ? AND next_review_at <= datetime("now") ORDER BY count DESC LIMIT 10',
    [req.session.userId]
  );
  res.json({ items });
});

app.get('/api/quests', requireAuth, async (req, res) => {
  const quest = await getDailyQuests(req.session.userId);
  res.json({
    quest: {
      id: quest.id,
      questDate: quest.quest_date,
      goals: JSON.parse(quest.goal_json),
      progress: JSON.parse(quest.progress_json),
    },
  });
});

app.post('/api/quests/progress', requireAuth, async (req, res) => {
  const quest = await getDailyQuests(req.session.userId);
  const progress = JSON.parse(quest.progress_json);
  const { key, amount } = req.body;
  if (progress[key] !== undefined) {
    progress[key] += Number(amount || 1);
  }
  await run(db, 'UPDATE daily_quests SET progress_json = ? WHERE id = ?', [
    JSON.stringify(progress),
    quest.id,
  ]);
  res.json({ ok: true, progress });
});

app.post('/api/progress/reset', requireAuth, async (req, res) => {
  await run(db, 'DELETE FROM user_lessons WHERE user_id = ?', [req.session.userId]);
  await run(db, 'DELETE FROM mistakes WHERE user_id = ?', [req.session.userId]);
  await run(db, 'DELETE FROM daily_quests WHERE user_id = ?', [req.session.userId]);
  await run(
    db,
    'UPDATE user_progress SET xp = 0, streak = 0, hearts = 5, level = 1, last_lesson_id = NULL, last_position = 0 WHERE user_id = ?',
    [req.session.userId]
  );
  res.json({ ok: true });
});

app.post('/api/progress/heal', requireAuth, async (req, res) => {
  const progress = await get(db, 'SELECT hearts FROM user_progress WHERE user_id = ?', [req.session.userId]);
  const hearts = Math.min(5, progress.hearts + 1);
  await run(db, 'UPDATE user_progress SET hearts = ? WHERE user_id = ?', [hearts, req.session.userId]);
  res.json({ ok: true, hearts });
});

app.get('/api/leaderboard', requireAuth, async (req, res) => {
  const leaders = await all(
    db,
    'SELECT users.email, user_progress.xp, user_progress.level FROM user_progress JOIN users ON users.id = user_progress.user_id ORDER BY user_progress.xp DESC LIMIT 50'
  );
  res.json({ leaders });
});

app.post('/api/admin/lessons', requireAdmin, async (req, res) => {
  const { unit, level, titleFr, titleEn, titlePl, content } = req.body;
  if (!unit || !level || !titleFr || !content) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const result = await run(
    db,
    'INSERT INTO lessons (unit, level, title_fr, title_en, title_pl, content_json) VALUES (?, ?, ?, ?, ?, ?)',
    [unit, level, titleFr, titleEn, titlePl, JSON.stringify(content)]
  );
  res.json({ id: result.lastID });
});

app.post('/api/admin/lessons/:id', requireAdmin, async (req, res) => {
  const { unit, level, titleFr, titleEn, titlePl, content } = req.body;
  await run(
    db,
    'UPDATE lessons SET unit = ?, level = ?, title_fr = ?, title_en = ?, title_pl = ?, content_json = ? WHERE id = ?',
    [unit, level, titleFr, titleEn, titlePl, JSON.stringify(content), req.params.id]
  );
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = { app, db, DB_PATH };
