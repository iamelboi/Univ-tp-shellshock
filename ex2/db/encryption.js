// Chiffrement des données sensibles au repos : AES-256-CBC.
// Clé : variable d'environnement DATA_KEY (64 car. hex = 32 octets), fournie par le
// fichier .env (chargé via `node --env-file=.env`).
//
// Format stocké : "<iv_hex>:<ciphertext_base64>".
// Ce format est volontairement déchiffrable en une commande avec le binaire openssl :
//   echo "<ciphertext_base64>" | openssl enc -d -aes-256-cbc -K "$DATA_KEY" -iv "<iv_hex>" -A -base64
const crypto = require('node:crypto');

function loadKey() {
  const hex = (process.env.DATA_KEY || '').trim();
  if (!hex) throw new Error('DATA_KEY manquante : lancez avec `node --env-file=.env ...`');
  return Buffer.from(hex, 'hex');
}

const KEY = loadKey();
if (KEY.length !== 32) throw new Error('DATA_KEY invalide (32 octets / 64 caractères hex attendus)');

function encrypt(plain) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + data.toString('base64');
}

function decrypt(stored) {
  const sep = stored.indexOf(':');
  const iv = Buffer.from(stored.slice(0, sep), 'hex');
  const data = Buffer.from(stored.slice(sep + 1), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
