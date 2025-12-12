require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { pool, seedDatabase } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

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
