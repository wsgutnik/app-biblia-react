const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const defaultDbPath = path.join(__dirname, 'strongs.db');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(rootDir, process.env.DATABASE_PATH)
  : defaultDbPath;

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE,
    lemma TEXT,
    translit TEXT,
    derivation TEXT,
    kjv_def TEXT,
    strongs_def TEXT,
    language TEXT
  );
`);

function readDictionary(fileName) {
  const filePath = path.join(publicDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`Dictionary file not found: ${filePath}`);
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON for ${fileName}:`, err.message);
    return null;
  }
}

function seedFromDictionary(fileName, language) {
  const dictionary = readDictionary(fileName);
  if (!dictionary) return 0;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO entries
    (number, lemma, translit, derivation, kjv_def, strongs_def, language)
    VALUES (@number, @lemma, @translit, @derivation, @kjv_def, @strongs_def, @language)
  `);

  const rows = Object.entries(dictionary).map(([number, entry]) => ({
    number,
    lemma: entry.lemma || null,
    translit: entry.translit || null,
    derivation: entry.derivation || null,
    kjv_def: entry.kjv_def || null,
    strongs_def: entry.strongs_def || null,
    language
  }));

  const insertMany = db.transaction((items) => items.forEach((item) => insert.run(item)));
  insertMany(rows);
  return rows.length;
}

function seedDatabase() {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM entries').get();
  if (count > 0) {
    return count;
  }

  const greek = seedFromDictionary('strongs-greek-dictionary.json', 'greek');
  const hebrew = seedFromDictionary('strongs-hebrew-dictionary.json', 'hebrew');
  const total = (greek || 0) + (hebrew || 0);
  console.log(`Seeded ${total} Strong's entries into ${dbPath}`);
  return total;
}

module.exports = {
  db,
  seedDatabase
};
