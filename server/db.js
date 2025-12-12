const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Configure server/.env with your Supabase connection string.');
}

const sslEnabled = process.env.DATABASE_SSL !== 'false';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      number TEXT PRIMARY KEY,
      lemma TEXT,
      translit TEXT,
      derivation TEXT,
      kjv_def TEXT,
      strongs_def TEXT,
      language TEXT
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS entries_language_idx ON entries(language);
  `);
}

function readDictionary(fileName) {
  const filePath = path.join(publicDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`Dictionary file not found: ${filePath}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse JSON for ${fileName}:`, err.message);
    return null;
  }
}

async function seedFromDictionary(client, fileName, language) {
  const dictionary = readDictionary(fileName);
  if (!dictionary) return 0;

  const rows = Object.entries(dictionary).map(([number, entry]) => ({
    number,
    lemma: entry.lemma || null,
    translit: entry.translit || null,
    derivation: entry.derivation || null,
    kjv_def: entry.kjv_def || null,
    strongs_def: entry.strongs_def || null,
    language
  }));

  if (!rows.length) return 0;

  const chunkSize = 500;
  let processed = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const placeholders = chunk.map((item, idx) => {
      const base = idx * 7;
      values.push(
        item.number,
        item.lemma,
        item.translit,
        item.derivation,
        item.kjv_def,
        item.strongs_def,
        item.language
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
    });

    await client.query(
      `
        INSERT INTO entries
          (number, lemma, translit, derivation, kjv_def, strongs_def, language)
        VALUES ${placeholders.join(',')}
        ON CONFLICT (number) DO UPDATE SET
          lemma = EXCLUDED.lemma,
          translit = EXCLUDED.translit,
          derivation = EXCLUDED.derivation,
          kjv_def = EXCLUDED.kjv_def,
          strongs_def = EXCLUDED.strongs_def,
          language = EXCLUDED.language;
      `,
      values
    );

    processed += chunk.length;
  }

  return processed;
}

async function seedDatabase() {
  await ensureSchema();

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM entries');
  if (rows[0].count > 0) {
    return rows[0].count;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const greek = await seedFromDictionary(client, 'strongs-greek-dictionary.json', 'greek');
    const hebrew = await seedFromDictionary(client, 'strongs-hebrew-dictionary.json', 'hebrew');
    await client.query('COMMIT');
    const total = (greek || 0) + (hebrew || 0);
    console.log(`Seeded ${total} Strong's entries into Supabase`);
    return total;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  seedDatabase
};
