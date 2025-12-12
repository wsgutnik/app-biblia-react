require('dotenv').config();

const express = require('express');
const cors = require('cors');

const {
  pool,
  seedDatabase,
  getProfile,
  upsertProfile,
  getQuizStats,
  upsertQuizStats,
  getReadingHistory,
  replaceReadingHistory
} = require('./db');

const API_PREFIX = '/api';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const requireUser = (req, res, next) => {
  const auth0Sub = req.header('x-user-sub');
  if (!auth0Sub) {
    return res.status(401).json({ error: 'Cabeçalho x-user-sub obrigatório para operações autenticadas.' });
  }
  req.auth0Sub = auth0Sub;
  next();
};

const mapProfileRow = (row, fallbackName = '') =>
  row
    ? {
        fullName: row.full_name || fallbackName || '',
        congregation: row.congregation || '',
        birthDate: row.birth_date || null,
        maritalStatus: row.marital_status || ''
      }
    : {
        fullName: fallbackName || '',
        congregation: '',
        birthDate: null,
        maritalStatus: ''
      };

const secureRouter = express.Router();
secureRouter.use(requireUser);

secureRouter.get('/profile', async (req, res) => {
  try {
    const profile = await getProfile(req.auth0Sub);
    res.json({ profile: mapProfileRow(profile) });
  } catch (err) {
    console.error('Failed to load profile:', err.message);
    res.status(500).json({ error: 'Erro ao carregar dados do perfil' });
  }
});

secureRouter.put('/profile', async (req, res) => {
  try {
    const profile = await upsertProfile(req.auth0Sub, req.body || {});
    res.json({ profile: mapProfileRow(profile) });
  } catch (err) {
    console.error('Failed to save profile:', err.message);
    res.status(500).json({ error: 'Erro ao salvar dados do perfil' });
  }
});

const mapHistoryRows = (rows = []) =>
  rows.map((row) => ({
    bookAbbrev: row.book_abbrev || '',
    bookName: row.book_name || '',
    chapter: row.chapter || null,
    timestamp: row.read_at ? new Date(row.read_at).toISOString() : null
  }));

secureRouter.get('/activities', async (req, res) => {
  try {
    const quizStats = (await getQuizStats(req.auth0Sub)) || { correct: 0, total: 0 };
    const historyRows = await getReadingHistory(req.auth0Sub);
    res.json({
      quizStats: {
        correct: quizStats.correct || 0,
        total: quizStats.total || 0,
        updatedAt: quizStats.updated_at || null
      },
      readingHistory: mapHistoryRows(historyRows)
    });
  } catch (err) {
    console.error('Failed to load activities:', err.message);
    res.status(500).json({ error: 'Erro ao carregar atividades' });
  }
});

secureRouter.put('/activities', async (req, res) => {
  try {
    const payload = req.body || {};
    const quiz = await upsertQuizStats(req.auth0Sub, payload.quizStats || {});
    const historyCount = await replaceReadingHistory(req.auth0Sub, payload.readingHistory || []);
    res.json({
      quizStats: {
        correct: quiz.correct || 0,
        total: quiz.total || 0,
        updatedAt: quiz.updated_at || null
      },
      readingHistoryCount: historyCount
    });
  } catch (err) {
    console.error('Failed to sync activities:', err.message);
    res.status(500).json({ error: 'Erro ao sincronizar atividades' });
  }
});

app.use(API_PREFIX, secureRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/entries', async (req, res) => {
  const { q, language } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (q && typeof q === 'string') {
    const trimmed = q.trim();
    if (trimmed) {
      const term = `%${trimmed}%`;
      conditions.push(
        `(number ILIKE $${paramIndex} OR lemma ILIKE $${paramIndex + 1} OR translit ILIKE $${paramIndex + 2})`
      );
      params.push(term, term, term);
      paramIndex += 3;
    }
  }

  if (language && typeof language === 'string') {
    conditions.push(`language = $${paramIndex}`);
    params.push(language.toLowerCase());
    paramIndex += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT number, lemma, translit, language
    FROM entries
    ${whereClause}
    ORDER BY number
    LIMIT $${paramIndex}
  `;

  params.push(limit);

  try {
    const { rows } = await pool.query(sql, params);
    res.json({ results: rows, count: rows.length });
  } catch (err) {
    console.error('Failed to fetch entries:', err.message);
    res.status(500).json({ error: 'Erro interno ao consultar verbetes' });
  }
});

app.get('/entries/:number', async (req, res) => {
  const number = req.params.number.toUpperCase();

  try {
    const { rows } = await pool.query('SELECT * FROM entries WHERE number = $1', [number]);
    if (!rows.length) {
      return res.status(404).json({ error: `Entry ${number} not found` });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(`Failed to fetch entry ${number}:`, err.message);
    res.status(500).json({ error: 'Erro interno ao consultar o verbete solicitado' });
  }
});

async function start() {
  await seedDatabase();

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
