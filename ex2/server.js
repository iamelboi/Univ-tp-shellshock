// Serveur Express : sert les fichiers statiques (public/) et expose une API JSON.
// Toutes les données utilisateur sont traitées comme sensibles :
// chiffrées au repos, accessibles uniquement au propriétaire et à ses amis.
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const { db } = require('./db/database');
const { hashPassword, verifyPassword } = require('./db/password');
const { encrypt, decrypt } = require('./db/encryption');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_HOURS = 2;
const SECURE_COOKIE = process.env.NODE_ENV === 'production'; // Secure nécessite HTTPS

app.disable('x-powered-by');

// ---------- En-têtes de sécurité ----------

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store'); // pas de cache des données
  next();
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Validation ----------

const LIMITS = { title: 120, post: 5000, message: 2000 };

function text(value, max) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v && v.length <= max ? v : null;
}

// ---------- Sessions (cookie "session" -> SHA-256 stocké en base) ----------

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  for (const part of cookies.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setSessionCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie',
    `session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${SECURE_COOKIE ? '; Secure' : ''}`);
}

function currentUser(req) {
  const token = readCookie(req, 'session');
  if (!token) return null;
  return db.prepare(`
    SELECT u.id, u.username FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')`).get(sha256(token)) || null;
}

function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Non connecté' });
  req.user = user;
  next();
}

function openSession(res, userId) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at)
              VALUES (?, ?, datetime('now', ?))`).run(sha256(token), userId, `+${SESSION_HOURS} hours`);
  setSessionCookie(res, token, SESSION_HOURS * 3600);
}

// ---------- Limitation des tentatives de connexion ----------

const attempts = new Map(); // clé ip|username -> { count, until }
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function isLocked(key) {
  const a = attempts.get(key);
  return a && a.count >= MAX_ATTEMPTS && a.until > Date.now();
}

function recordFailure(key) {
  const a = attempts.get(key);
  if (!a || a.until <= Date.now()) attempts.set(key, { count: 1, until: Date.now() + LOCK_MS });
  else a.count++;
}

// ---------- Authentification ----------

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    return res.status(400).json({ error: "Nom d'utilisateur : 3 à 32 caractères (lettres, chiffres, _)" });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Mot de passe : 8 caractères minimum' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: "Nom d'utilisateur déjà pris" });

  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hashPassword(password));
  openSession(res, lastInsertRowid);
  res.status(201).json({ id: Number(lastInsertRowid), username });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const key = `${req.ip}|${String(username).toLowerCase()}`;
  if (isLocked(key)) return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard' });

  const user = typeof username === 'string'
    ? db.prepare('SELECT * FROM users WHERE username = ?').get(username) : null;
  if (!user || typeof password !== 'string' || !verifyPassword(password, user.password_hash)) {
    recordFailure(key);
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  attempts.delete(key);
  openSession(res, user.id);
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => {
  const token = readCookie(req, 'session');
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  setSessionCookie(res, '', 0);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json(currentUser(req));
});

// ---------- Amis ----------

function areFriends(a, b) {
  return !!db.prepare(`
    SELECT 1 FROM friendships WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`)
    .get(a, b, b, a);
}

// Amis acceptés + demandes reçues + demandes envoyées
app.get('/api/friends', requireAuth, (req, res) => {
  const me = req.user.id;
  res.json({
    friends: db.prepare(`
      SELECT u.id, u.username FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.requester_id = :me THEN f.addressee_id ELSE f.requester_id END
      WHERE f.status = 'accepted' AND (f.requester_id = :me OR f.addressee_id = :me)
      ORDER BY u.username`).all({ me }),
    incoming: db.prepare(`
      SELECT f.id, u.username FROM friendships f JOIN users u ON u.id = f.requester_id
      WHERE f.status = 'pending' AND f.addressee_id = ? ORDER BY f.id DESC`).all(me),
    outgoing: db.prepare(`
      SELECT f.id, u.username FROM friendships f JOIN users u ON u.id = f.addressee_id
      WHERE f.status = 'pending' AND f.requester_id = ? ORDER BY f.id DESC`).all(me),
  });
});

// Envoi d'une demande par nom d'utilisateur exact (pas d'annuaire public des utilisateurs)
app.post('/api/friends', requireAuth, (req, res) => {
  const me = req.user.id;
  const target = typeof req.body?.username === 'string'
    ? db.prepare('SELECT id FROM users WHERE username = ?').get(req.body.username.trim()) : null;
  if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (target.id === me) return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' });

  const existing = db.prepare(`
    SELECT * FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`)
    .get(me, target.id, target.id, me);

  if (existing) {
    // L'autre m'avait déjà envoyé une demande : on l'accepte directement
    if (existing.status === 'pending' && existing.addressee_id === me) {
      db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(existing.id);
      return res.json({ status: 'accepted' });
    }
    return res.status(409).json({ error: existing.status === 'accepted' ? 'Déjà amis' : 'Demande déjà envoyée' });
  }
  db.prepare('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)').run(me, target.id);
  res.status(201).json({ status: 'pending' });
});

app.post('/api/friends/requests/:id/accept', requireAuth, (req, res) => {
  const { changes } = db.prepare(`
    UPDATE friendships SET status = 'accepted'
    WHERE id = ? AND addressee_id = ? AND status = 'pending'`).run(req.params.id, req.user.id);
  if (!changes) return res.status(404).json({ error: 'Demande introuvable' });
  res.json({ ok: true });
});

// Refuser (destinataire) ou annuler (émetteur) une demande
app.delete('/api/friends/requests/:id', requireAuth, (req, res) => {
  const me = req.user.id;
  const { changes } = db.prepare(`
    DELETE FROM friendships
    WHERE id = ? AND status = 'pending' AND (requester_id = ? OR addressee_id = ?)`).run(req.params.id, me, me);
  if (!changes) return res.status(404).json({ error: 'Demande introuvable' });
  res.json({ ok: true });
});

app.delete('/api/friends/:userId', requireAuth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);
  db.prepare(`
    DELETE FROM friendships WHERE status = 'accepted'
      AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`)
    .run(me, other, other, me);
  res.json({ ok: true });
});

// ---------- Posts (le fil ne contient que les posts des amis) ----------

app.get('/api/posts', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.id, p.title, p.content, p.created_at, p.user_id, u.username AS author
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE EXISTS (
      SELECT 1 FROM friendships f WHERE f.status = 'accepted'
        AND ((f.requester_id = :me AND f.addressee_id = p.user_id)
          OR (f.addressee_id = :me AND f.requester_id = p.user_id)))
    ORDER BY p.created_at DESC, p.id DESC`).all({ me: req.user.id });
  res.json(rows.map((p) => ({ ...p, title: decrypt(p.title), content: decrypt(p.content) })));
});

app.post('/api/posts', requireAuth, (req, res) => {
  const title = text(req.body?.title, LIMITS.title);
  const content = text(req.body?.content, LIMITS.post);
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis (taille limitée)' });
  const { lastInsertRowid } = db
    .prepare('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)')
    .run(req.user.id, encrypt(title), encrypt(content));
  res.status(201).json({ id: Number(lastInsertRowid) });
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const { changes } = db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!changes) return res.status(404).json({ error: 'Post introuvable' });
  res.json({ ok: true });
});

// ---------- Chat (entre amis uniquement) ----------

// Liste des conversations avec des amis : dernier message échangé avec chacun
app.get('/api/conversations', requireAuth, (req, res) => {
  const me = req.user.id;
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.username, m.content AS last_message, m.created_at,
      (SELECT COUNT(*) FROM messages
        WHERE sender_id = u.id AND recipient_id = :me AND is_read = 0) AS unread
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.sender_id = :me THEN m.recipient_id ELSE m.sender_id END
    WHERE m.id IN (
      SELECT MAX(id) FROM messages
      WHERE sender_id = :me OR recipient_id = :me
      GROUP BY CASE WHEN sender_id = :me THEN recipient_id ELSE sender_id END
    )
    AND EXISTS (
      SELECT 1 FROM friendships f WHERE f.status = 'accepted'
        AND ((f.requester_id = :me AND f.addressee_id = u.id)
          OR (f.addressee_id = :me AND f.requester_id = u.id)))
    ORDER BY m.id DESC`).all({ me });
  res.json(rows.map((c) => ({ ...c, last_message: decrypt(c.last_message) })));
});

app.get('/api/messages/:userId', requireAuth, (req, res) => {
  const me = req.user.id;
  const other = Number(req.params.userId);
  if (!areFriends(me, other)) return res.status(403).json({ error: 'Vous devez être amis' });

  db.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ?').run(other, me);
  const rows = db.prepare(`
    SELECT id, sender_id, recipient_id, content, created_at FROM messages
    WHERE (sender_id = :me AND recipient_id = :other)
       OR (sender_id = :other AND recipient_id = :me)
    ORDER BY id ASC`).all({ me, other });
  res.json(rows.map((m) => ({ ...m, content: decrypt(m.content) })));
});

app.post('/api/messages', requireAuth, (req, res) => {
  const recipient = Number(req.body?.recipient_id);
  const content = text(req.body?.content, LIMITS.message);
  if (!recipient || !content) return res.status(400).json({ error: 'Destinataire et contenu requis (taille limitée)' });
  if (!areFriends(req.user.id, recipient)) return res.status(403).json({ error: 'Vous devez être amis' });
  const { lastInsertRowid } = db
    .prepare('INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)')
    .run(req.user.id, recipient, encrypt(content));
  res.status(201).json({ id: Number(lastInsertRowid) });
});

// Erreurs non prévues : pas de détail technique renvoyé au client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
