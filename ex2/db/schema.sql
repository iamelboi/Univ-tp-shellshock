-- Schéma de la base SQLite du TP
-- Les colonnes marquées [chiffré] contiennent "iv:tag:données" (AES-256-GCM, base64).

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,                -- scrypt + sel
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token_hash TEXT    PRIMARY KEY,                -- SHA-256 du jeton (le jeton brut n'est jamais stocké)
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Lien d'amitié : une demande (pending) puis acceptation (accepted)
CREATE TABLE friendships (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,                   -- [chiffré]
  content    TEXT    NOT NULL,                   -- [chiffré]
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content      TEXT    NOT NULL,                 -- [chiffré]
  is_read      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
