require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { db, seedDatabase } = require('./db');

seedDatabase();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/entries', (req, res) => {
  const { q, language } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

  const conditions = [];
  const params = [];

  if (q && typeof q === 'string') {
    const trimmed = q.trim();
    if (trimmed) {
      const term = `%${trimmed}%`;
      conditions.push('(number LIKE ? OR lemma LIKE ? OR translit LIKE ?)');
      params.push(term, term, term);
    }
  }

  if (language && typeof language === 'string') {
    conditions.push('language = ?');
    params.push(language.toLowerCase());
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT number, lemma, translit, language
    FROM entries
    ${whereClause}
    ORDER BY number
    LIMIT ?
  `;

  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  res.json({ results: rows, count: rows.length });
});

app.get('/entries/:number', (req, res) => {
  const number = req.params.number.toUpperCase();
  const entry = db.prepare('SELECT * FROM entries WHERE number = ?').get(number);

  if (!entry) {
    return res.status(404).json({ error: `Entry ${number} not found` });
  }

  res.json(entry);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
