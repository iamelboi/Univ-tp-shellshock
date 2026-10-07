// Connexion unique à la base SQLite (module natif node:sqlite, Node >= 22.5)
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'app.db');

const db = new DatabaseSync(DB_PATH);
fs.chmodSync(DB_PATH, 0o600); // fichier lisible uniquement par le propriétaire
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA secure_delete = ON;'); // écrase les données supprimées sur le disque

module.exports = { db, DB_PATH };
