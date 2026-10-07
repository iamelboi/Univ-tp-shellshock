const fs = require('node:fs');
const path = require('node:path');
const { db } = require('./database');
const { hashPassword } = require('./password');
const { encrypt } = require('./encryption');
const stub = require('./stub');

db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

const ago = (hours) => `-${hours} hours`;

const insertUser = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
const ids = {};
for (const name of stub.users) {
  ids[name] = insertUser.run(name, hashPassword('password123')).lastInsertRowid;
}

ids.pierre = insertUser.run('pierre', hashPassword('avionQuiVole')).lastInsertRowid;

const insertFriend = db.prepare('INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)');
for (const [a, b, status] of stub.friendships) insertFriend.run(ids[a], ids[b], status);

for (const name of ['alice', 'charlie', 'david']) {
  insertFriend.run(ids.pierre, ids[name], 'accepted');
}

const insertPost = db.prepare(`INSERT INTO posts (user_id, title, content, created_at)
                               VALUES (?, ?, ?, datetime('now', ?))`);
for (const [author, hours, title, content] of stub.posts) {
  insertPost.run(ids[author], encrypt(title), encrypt(content), ago(hours));
}

// Insertion dans l'ordre chronologique : le chat trie les messages par id
const insertMsg = db.prepare(`INSERT INTO messages (sender_id, recipient_id, content, is_read, created_at)
                              VALUES (?, ?, ?, ?, datetime('now', ?))`);
const sorted = [...stub.messages].sort((x, y) => y[2] - x[2]);
for (const [from, to, hours, content] of sorted) {
  insertMsg.run(ids[from], ids[to], encrypt(content), hours > 24 ? 1 : 0, ago(hours));
}

console.log(`Base initialisée `);
