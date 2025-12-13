const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const planDir = path.join(publicDir, 'plan');
const ACTIVITY_HISTORY_LIMIT = 50;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Configure server/.env with your Supabase connection string.');
}

const sslMode = (process.env.DATABASE_SSL || '').trim().toLowerCase();
const disableSsl = sslMode === 'false' || sslMode === 'disable';
if (disableSsl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: disableSsl ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

const slugify = (value = '') =>
  value
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const countPlanDays = (filePath) => {
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    const lines = contents.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length <= 1) return 0;
    return lines.length - 1;
  } catch (err) {
    console.warn(`Não foi possível contar dias para ${filePath}:`, err.message);
    return 0;
  }
};

async function ensureSchema() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth0_sub TEXT UNIQUE NOT NULL,
      full_name TEXT,
      congregation TEXT,
      birth_date DATE,
      marital_status TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_stats (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth0_sub TEXT UNIQUE NOT NULL,
      correct INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth0_sub TEXT NOT NULL,
      book_abbrev TEXT,
      book_name TEXT,
      chapter INTEGER,
      read_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reading_history_auth0_idx
      ON reading_history(auth0_sub, read_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      total_days INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS plan_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      auth0_sub TEXT NOT NULL,
      plan_id UUID NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
      current_day INTEGER DEFAULT 0,
      completed_at DATE,
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(auth0_sub, plan_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_streaks (
      auth0_sub TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      best_count INTEGER DEFAULT 0,
      last_visit DATE,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS congregations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );
  `);
  await seedReadingPlansMetadata();
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

const sanitizeText = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const sanitizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

async function getProfile(auth0Sub) {
  const { rows } = await pool.query(
    `
      SELECT auth0_sub, full_name, congregation, birth_date, marital_status
      FROM profiles
      WHERE auth0_sub = $1
    `,
    [auth0Sub]
  );
  return rows[0] || null;
}

async function upsertProfile(auth0Sub, data) {
  const fullName = sanitizeText(data.fullName ?? data.full_name ?? null);
  const congregation = sanitizeText(data.congregation ?? null);
  const maritalStatus = sanitizeText(data.maritalStatus ?? data.marital_status ?? null);
  const birthDate = sanitizeDate(data.birthDate ?? data.birth_date ?? null);

  const { rows } = await pool.query(
    `
      INSERT INTO profiles (auth0_sub, full_name, congregation, birth_date, marital_status, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (auth0_sub) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        congregation = EXCLUDED.congregation,
        birth_date = EXCLUDED.birth_date,
        marital_status = EXCLUDED.marital_status,
        updated_at = now()
      RETURNING auth0_sub, full_name, congregation, birth_date, marital_status
    `,
    [auth0Sub, fullName, congregation, birthDate, maritalStatus]
  );

  return rows[0];
}

async function getQuizStats(auth0Sub) {
  const { rows } = await pool.query(
    `
      SELECT auth0_sub, correct, total, updated_at
      FROM quiz_stats
      WHERE auth0_sub = $1
    `,
    [auth0Sub]
  );
  return rows[0] || null;
}

async function upsertQuizStats(auth0Sub, stats = {}) {
  const correctValue = Number(stats.correct);
  const totalValue = Number(stats.total);
  const correct = Number.isFinite(correctValue) ? correctValue : 0;
  const total = Number.isFinite(totalValue) ? totalValue : 0;

  const { rows } = await pool.query(
    `
      INSERT INTO quiz_stats (auth0_sub, correct, total, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (auth0_sub) DO UPDATE SET
        correct = EXCLUDED.correct,
        total = EXCLUDED.total,
        updated_at = now()
      RETURNING auth0_sub, correct, total, updated_at
    `,
    [auth0Sub, correct, total]
  );

  return rows[0];
}

async function getReadingHistory(auth0Sub, limit = ACTIVITY_HISTORY_LIMIT) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 0, 0), ACTIVITY_HISTORY_LIMIT);
  const { rows } = await pool.query(
    `
      SELECT auth0_sub, book_abbrev, book_name, chapter, read_at
      FROM reading_history
      WHERE auth0_sub = $1
      ORDER BY read_at DESC
      LIMIT $2
    `,
    [auth0Sub, safeLimit]
  );
  return rows;
}

function normalizeHistoryInput(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return [];
  return entries.slice(0, ACTIVITY_HISTORY_LIMIT).map((entry) => {
    const chapterNumber = Number(entry.chapter);
    const readAt = entry.timestamp || entry.readAt || entry.read_at;
    const parsedDate = readAt ? new Date(readAt) : null;
    return {
      book_abbrev: sanitizeText(entry.bookAbbrev || entry.book_abbrev) || null,
      book_name: sanitizeText(entry.bookName || entry.book_name) || null,
      chapter: Number.isFinite(chapterNumber) ? chapterNumber : null,
      read_at: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null
    };
  });
}

async function replaceReadingHistory(auth0Sub, entries = []) {
  const sanitized = normalizeHistoryInput(entries);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM reading_history WHERE auth0_sub = $1', [auth0Sub]);

    if (sanitized.length) {
      const chunkSize = 100;
      for (let i = 0; i < sanitized.length; i += chunkSize) {
        const chunk = sanitized.slice(i, i + chunkSize);
        const values = [];
        const placeholders = chunk.map((item, idx) => {
          const base = idx * 5;
          values.push(auth0Sub, item.book_abbrev, item.book_name, item.chapter, item.read_at);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
        });

        await client.query(
          `
            INSERT INTO reading_history
              (auth0_sub, book_abbrev, book_name, chapter, read_at)
            VALUES ${placeholders.join(',')}
          `,
          values
        );
      }
    }

    await client.query('COMMIT');
    return sanitized.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function insertReadingHistoryEntry(auth0Sub, entry = {}) {
  const [sanitized] = normalizeHistoryInput([entry]);
  if (!sanitized) return null;
  const { rows } = await pool.query(
    `
      INSERT INTO reading_history (auth0_sub, book_abbrev, book_name, chapter, read_at)
      VALUES ($1, $2, $3, $4, COALESCE($5, now()))
      RETURNING auth0_sub, book_abbrev, book_name, chapter, read_at
    `,
    [auth0Sub, sanitized.book_abbrev, sanitized.book_name, sanitized.chapter, sanitized.read_at]
  );
  return rows[0] || null;
}

async function seedReadingPlansMetadata() {
  if (!fs.existsSync(planDir)) return;
  const files = fs.readdirSync(planDir).filter((file) => file.toLowerCase().endsWith('.csv'));
  if (!files.length) return;
  for (const fileName of files) {
    const baseName = fileName.replace(/\.csv$/i, '');
    const slug = slugify(baseName);
    const title = baseName.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const description = `Plano baseado no ficheiro ${fileName}`;
    const totalDays = countPlanDays(path.join(planDir, fileName));
    const relativePath = `plan/${fileName}`;
    await pool.query(
      `
        INSERT INTO reading_plans (slug, title, description, file_path, total_days, updated_at)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          file_path = EXCLUDED.file_path,
          total_days = EXCLUDED.total_days,
          updated_at = now()
      `,
      [slug, title, description, relativePath, totalDays]
    );
  }
}

async function listReadingPlans() {
  const { rows } = await pool.query(
    `
      SELECT id, slug, title, description, file_path, total_days
      FROM reading_plans
      ORDER BY title
    `
  );
  return rows;
}

async function getReadingPlanById(planId) {
  const { rows } = await pool.query(
    `
      SELECT id, slug, title, description, file_path, total_days
      FROM reading_plans
      WHERE id = $1
    `,
    [planId]
  );
  return rows[0] || null;
}

async function getPlanProgress(auth0Sub) {
  const { rows } = await pool.query(
    `
      SELECT plan_id, current_day, completed_at, updated_at
      FROM plan_progress
      WHERE auth0_sub = $1
    `,
    [auth0Sub]
  );
  return rows;
}

async function upsertPlanProgress(auth0Sub, planId, data = {}) {
  const currentDayValue = Number(data.currentDay ?? data.current_day);
  const currentDay = Number.isFinite(currentDayValue) && currentDayValue >= 0 ? currentDayValue : 0;
  const completedAt = sanitizeDate(data.completedAt ?? data.completed_at ?? null);

  const { rows } = await pool.query(
    `
      INSERT INTO plan_progress (auth0_sub, plan_id, current_day, completed_at, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (auth0_sub, plan_id) DO UPDATE SET
        current_day = EXCLUDED.current_day,
        completed_at = EXCLUDED.completed_at,
        updated_at = now()
      RETURNING plan_id, current_day, completed_at, updated_at
    `,
    [auth0Sub, planId, currentDay, completedAt]
  );

  return rows[0] || null;
}

const diffInDays = (a, b) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / MS_PER_DAY);
};

async function getReadingStreak(auth0Sub) {
  const { rows } = await pool.query(
    `
      SELECT auth0_sub, count, best_count, last_visit, updated_at
      FROM reading_streaks
      WHERE auth0_sub = $1
    `,
    [auth0Sub]
  );
  return rows[0] || null;
}

async function recordReadingStreak(auth0Sub, performedAt = null) {
  const existing = await getReadingStreak(auth0Sub);
  const visitDateStr = sanitizeDate(performedAt) || sanitizeDate(new Date());
  const visitDate = visitDateStr ? new Date(visitDateStr) : new Date();

  let nextCount = 1;
  if (existing?.last_visit) {
    const lastVisit = new Date(existing.last_visit);
    const delta = diffInDays(visitDate, lastVisit);
    if (delta === 0) {
      return existing;
    }
    if (delta === 1) {
      nextCount = (existing.count || 0) + 1;
    }
  }

  const nextBest = Math.max(existing?.best_count || 0, nextCount);

  const { rows } = await pool.query(
    `
      INSERT INTO reading_streaks (auth0_sub, count, best_count, last_visit, updated_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (auth0_sub) DO UPDATE SET
        count = EXCLUDED.count,
        best_count = GREATEST(reading_streaks.best_count, EXCLUDED.best_count),
        last_visit = EXCLUDED.last_visit,
        updated_at = now()
      RETURNING auth0_sub, count, best_count, last_visit, updated_at
    `,
    [auth0Sub, nextCount, nextBest, visitDateStr]
  );

  return rows[0];
}

module.exports = {
  pool,
  seedDatabase,
  getProfile,
  upsertProfile,
  getQuizStats,
  upsertQuizStats,
  getReadingHistory,
  replaceReadingHistory,
  insertReadingHistoryEntry,
  getReadingStreak,
  recordReadingStreak,
  listReadingPlans,
  getReadingPlanById,
  getPlanProgress,
  upsertPlanProgress
};
