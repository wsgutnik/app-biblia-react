require('dotenv').config();

const express = require('express');
const cors = require('cors');

const {
  pool,
  seedDatabase,
  getProfile,
  getProfileHighlights,
  getProfileLastReading,
  upsertProfile,
  saveProfileHighlights,
  saveProfileLastReading,
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
  upsertPlanProgress,
  recordSearchStat,
  getTopSearchStats
} = require('./db');

const API_PREFIX = '/api';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:5173';
const DONATION_MIN_AMOUNT_CENTS = 100;
const DONATION_MAX_AMOUNT_CENTS = 500000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let stripeClient = null;

const isValidAbsoluteHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const getStripeClient = () => {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) return null;
  if (!stripeClient) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
};

const resolveDonationOrigin = (req) => {
  const envUrl = (process.env.DONATION_SITE_URL || '').trim();
  if (isValidAbsoluteHttpUrl(envUrl)) return envUrl;
  const requestOrigin = req.get('origin');
  if (isValidAbsoluteHttpUrl(requestOrigin)) return requestOrigin;
  return DEFAULT_FRONTEND_ORIGIN;
};

const resolveDonationAmount = (rawAmount) => {
  const envAmount = parseInt(process.env.DONATION_AMOUNT_CENTS, 10);
  const fallback = Number.isInteger(envAmount) ? envAmount : 500;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    return fallback;
  }
  const parsed = parseInt(rawAmount, 10);
  return Number.isInteger(parsed) ? parsed : NaN;
};

const resolveDonationCurrency = () => {
  const value = (process.env.DONATION_CURRENCY || 'usd').trim().toLowerCase();
  return /^[a-z]{3}$/.test(value) ? value : 'usd';
};

const requireUser = (req, res, next) => {
  const auth0Sub = req.header('x-user-sub');
  if (!auth0Sub) {
    return res.status(401).json({ error: 'Cabeçalho x-user-sub obrigatório para operações autenticadas.' });
  }
  req.auth0Sub = auth0Sub;
  next();
};

const formatLastReading = (row) =>
  row?.last_book_abbrev && row?.last_chapter
    ? {
        bookAbbrev: row.last_book_abbrev,
        bookName: row.last_book_name || '',
        chapter: row.last_chapter,
        versionId: row.last_version_id || null
      }
    : null;

const mapProfileRow = (row, fallbackName = '') =>
  row
    ? {
        fullName: row.full_name || fallbackName || '',
        congregation: row.congregation || '',
        birthDate: row.birth_date || null,
        maritalStatus: row.marital_status || '',
        highlights: row.highlights || {},
        lastReading: formatLastReading(row)
      }
    : {
        fullName: fallbackName || '',
        congregation: '',
        birthDate: null,
        maritalStatus: '',
        highlights: {},
        lastReading: null
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

secureRouter.get('/profile/highlights', async (req, res) => {
  try {
    const highlights = await getProfileHighlights(req.auth0Sub);
    res.json({ highlights: highlights || {} });
  } catch (err) {
    console.error('Failed to load highlights:', err.message);
    res.status(500).json({ error: 'Erro ao carregar destaques' });
  }
});

secureRouter.put('/profile/highlights', async (req, res) => {
  try {
    const payload = req.body?.highlights ?? req.body ?? {};
    const highlights = await saveProfileHighlights(req.auth0Sub, payload);
    res.json({ highlights });
  } catch (err) {
    console.error('Failed to save highlights:', err.message);
    res.status(500).json({ error: 'Erro ao salvar destaques' });
  }
});

secureRouter.get('/profile/last-reading', async (req, res) => {
  try {
    const lastReading = await getProfileLastReading(req.auth0Sub);
    res.json({ lastReading: lastReading || null });
  } catch (err) {
    console.error('Failed to load last reading:', err.message);
    res.status(500).json({ error: 'Erro ao carregar última leitura' });
  }
});

secureRouter.put('/profile/last-reading', async (req, res) => {
  try {
    const payload = req.body?.lastReading ?? req.body ?? {};
    const lastReading = await saveProfileLastReading(req.auth0Sub, payload);
    res.json({ lastReading });
  } catch (err) {
    console.error('Failed to save last reading:', err.message);
    res.status(500).json({ error: 'Erro ao salvar última leitura' });
  }
});

const mapHistoryRows = (rows = []) =>
  rows.map((row) => ({
    bookAbbrev: row.book_abbrev || '',
    bookName: row.book_name || '',
    chapter: row.chapter || null,
    timestamp: row.read_at ? new Date(row.read_at).toISOString() : null
  }));

const mapStreakRow = (row) =>
  row
    ? {
        count: row.count || 0,
        bestCount: row.best_count || 0,
        lastVisit: row.last_visit || null,
        updatedAt: row.updated_at || null
      }
    : { count: 0, bestCount: 0, lastVisit: null, updatedAt: null };

const mapPlanRow = (plan, progress = null) => ({
  id: plan.id,
  slug: plan.slug,
  title: plan.title,
  description: plan.description || '',
  filePath: plan.file_path || '',
  totalDays: plan.total_days || 0,
  progress: progress
    ? {
        currentDay: progress.current_day || 0,
        completedAt: progress.completed_at || null,
        updatedAt: progress.updated_at || null
      }
    : null
});

const mapSearchStat = (row) =>
  row
    ? {
        term: row.term,
        language: row.language,
        count: row.count || 0,
        lastSearch: row.last_search || null
      }
    : null;

const isValidSearchLanguage = (value) => {
  if (!value) return false;
  const normalized = value.toString().trim().toLowerCase();
  return normalized === 'greek' || normalized === 'hebrew';
};

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
    const quizPayload = payload.quizStats || null;
    const historyPayload = Array.isArray(payload.readingHistory) ? payload.readingHistory : null;

    let quizResult = null;
    if (quizPayload) {
      const quiz = await upsertQuizStats(req.auth0Sub, quizPayload);
      quizResult = {
        correct: quiz.correct || 0,
        total: quiz.total || 0,
        updatedAt: quiz.updated_at || null
      };
    } else {
      const quiz = await getQuizStats(req.auth0Sub);
      quizResult = {
        correct: quiz?.correct || 0,
        total: quiz?.total || 0,
        updatedAt: quiz?.updated_at || null
      };
    }

    let historyCount = null;
    if (historyPayload) {
      historyCount = await replaceReadingHistory(req.auth0Sub, historyPayload);
    }

    res.json({
      quizStats: quizResult,
      readingHistoryCount: historyCount
    });
  } catch (err) {
    console.error('Failed to sync activities:', err.message);
    res.status(500).json({ error: 'Erro ao sincronizar atividades' });
  }
});

secureRouter.post('/history', async (req, res) => {
  try {
    const saved = await insertReadingHistoryEntry(req.auth0Sub, req.body || {});
    if (!saved) {
      return res.status(400).json({ error: 'Entrada de histórico inválida' });
    }
    res.status(201).json({ entry: mapHistoryRows([saved])[0] });
  } catch (err) {
    console.error('Failed to append history:', err.message);
    res.status(500).json({ error: 'Erro ao registar histórico de leitura' });
  }
});

secureRouter.get('/streak', async (req, res) => {
  try {
    const streak = await getReadingStreak(req.auth0Sub);
    res.json({ streak: mapStreakRow(streak) });
  } catch (err) {
    console.error('Failed to load streak:', err.message);
    res.status(500).json({ error: 'Erro ao carregar sequência de leitura' });
  }
});

secureRouter.get('/plans', async (req, res) => {
  try {
    const plans = await listReadingPlans();
    const progressRows = await getPlanProgress(req.auth0Sub);
    const progressMap = progressRows.reduce((acc, progress) => {
      acc[progress.plan_id] = progress;
      return acc;
    }, {});
    res.json({
      plans: plans.map((plan) => mapPlanRow(plan, progressMap[plan.id]))
    });
  } catch (err) {
    console.error('Failed to load plans:', err.message);
    res.status(500).json({ error: 'Erro ao carregar planos' });
  }
});

secureRouter.put('/plans/:planId/progress', async (req, res) => {
  const { planId } = req.params;
  try {
    const plan = await getReadingPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }
    const progress = await upsertPlanProgress(req.auth0Sub, planId, req.body || {});
    res.json({
      plan: mapPlanRow(plan, progress),
      progress: progress
        ? {
            currentDay: progress.current_day || 0,
            completedAt: progress.completed_at || null,
            updatedAt: progress.updated_at || null
          }
        : null
    });
  } catch (err) {
    console.error('Failed to save plan progress:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar progresso do plano' });
  }
});

secureRouter.post('/streak', async (req, res) => {
  try {
    const payload = req.body || {};
    const streak = await recordReadingStreak(req.auth0Sub, payload.performedAt);
    res.json({ streak: mapStreakRow(streak) });
  } catch (err) {
    console.error('Failed to record streak:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar sequência de leitura' });
  }
});

app.use(API_PREFIX, secureRouter);

app.post('/tracking/search', async (req, res) => {
  try {
    const payload = req.body || {};
    const saved = await recordSearchStat(payload.language, payload.term);
    if (!saved) {
      return res.status(400).json({ error: 'Parâmetros de busca inválidos' });
    }
    res.status(201).json({ stat: mapSearchStat(saved) });
  } catch (err) {
    console.error('Failed to track search term:', err.message);
    res.status(500).json({ error: 'Erro ao registrar busca' });
  }
});

app.get('/tracking/search/top', async (req, res) => {
  const { language } = req.query;
  const limit = parseInt(req.query.limit, 10) || 10;
  if (!isValidSearchLanguage(language)) {
    return res.status(400).json({ error: 'Parâmetro language inválido. Use greek ou hebrew.' });
  }
  try {
    const stats = await getTopSearchStats(language, limit);
    res.json({ stats: stats.map(mapSearchStat) });
  } catch (err) {
    console.error('Failed to load search leaderboard:', err.message);
    res.status(500).json({ error: 'Erro ao consultar ranking de buscas' });
  }
});

app.post('/donations/checkout-session', async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe não configurado no servidor.' });
  }

  const amount = resolveDonationAmount(req.body?.amount);
  if (!Number.isInteger(amount) || amount < DONATION_MIN_AMOUNT_CENTS || amount > DONATION_MAX_AMOUNT_CENTS) {
    return res.status(400).json({
      error: `Valor inválido. Use um valor entre ${DONATION_MIN_AMOUNT_CENTS} e ${DONATION_MAX_AMOUNT_CENTS} centavos.`
    });
  }

  const currency = resolveDonationCurrency();
  const origin = resolveDonationOrigin(req);
  const successUrl = `${origin}/?donation=success`;
  const cancelUrl = `${origin}/?donation=cancelled`;
  const productName = (process.env.DONATION_PRODUCT_NAME || 'Apoie o projeto Bíblia Sagrada').trim();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: productName
            }
          }
        }
      ]
    });

    if (!session?.url) {
      throw new Error('Checkout session sem URL de redirecionamento.');
    }

    res.status(201).json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Failed to create Stripe Checkout session:', err.message);
    res.status(500).json({ error: 'Erro ao iniciar checkout de doação' });
  }
});

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
