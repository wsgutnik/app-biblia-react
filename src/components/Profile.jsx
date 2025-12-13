import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AuthActions from './AuthActions';
import { isAuth0Configured } from '../config/auth0';
import { CONGREGATIONS } from '../data/congregations';
import { API_PREFIX, authorizedJsonFetch } from '../utils/apiClient';
const QUIZ_STORAGE_KEY = 'quiz_progress_v1';
const READING_STORAGE_KEY = 'readingHistory';

const readLocalJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const getLocalQuizStats = () => readLocalJson(QUIZ_STORAGE_KEY, { correct: 0, total: 0 });
const getLocalReadingHistory = () => readLocalJson(READING_STORAGE_KEY, []);

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const usePersistentNotes = (userSub) => {
  const storageKey = userSub ? `profile_notes_${userSub}` : null;
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!storageKey) {
      setNotes('');
      return;
    }
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    setNotes(stored || '');
  }, [storageKey]);

  const saveNotes = (value) => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, value);
    setNotes(value);
  };

  return [notes, saveNotes];
};

const MARITAL_STATUS_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Noivo(a)', 'Divorciado(a)', 'Viúvo(a)'];

const normalizeReadingHistory = (items = []) => {
  const parseTimestamp = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };

  return items
    .map((entry) => {
      const timestamp = parseTimestamp(entry.timestamp ?? entry.readAt ?? entry.read_at);
      const chapterNumber = Number(entry.chapter);
      return {
        bookAbbrev: entry.bookAbbrev || entry.book_abbrev || '',
        bookName: entry.bookName || entry.book_name || '',
        chapter: Number.isFinite(chapterNumber) ? chapterNumber : null,
        timestamp: timestamp ?? Date.now()
      };
    })
    .slice(0, 50);
};

function Profile() {
  const { isAuthenticated, isLoading, user } = useAuth0();

  const userSub = user?.sub;
  const [notesDraft, setNotesDraft] = useState('');
  const [notesStatus, setNotesStatus] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [activitiesError, setActivitiesError] = useState('');
  const [activitiesStatus, setActivitiesStatus] = useState('');
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesSyncing, setActivitiesSyncing] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: user?.name || '',
    congregation: '',
    birthDate: '',
    maritalStatus: ''
  });
  const [quizStats, setQuizStats] = useState(() => getLocalQuizStats());
  const [readingHistory, setReadingHistory] = useState(() => normalizeReadingHistory(getLocalReadingHistory()));

  const [savedNotes, saveNotes] = usePersistentNotes(userSub);

  useEffect(() => {
    setNotesDraft(savedNotes || '');
  }, [savedNotes]);

  useEffect(() => {
    const localQuiz = getLocalQuizStats();
    const localHistory = normalizeReadingHistory(getLocalReadingHistory());
    setQuizStats(localQuiz);
    setReadingHistory(localHistory);
  }, []);

  useEffect(() => {
    if (user?.name && !profileLoaded) {
      setProfileData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name
      }));
    }
  }, [user?.name, profileLoaded]);

  const apiFetch = async (path, options = {}) => {
    if (!user?.sub) throw new Error('Usuário não autenticado');
    const normalizedPath = `${API_PREFIX}${path}`.replace(/\/{2,}/g, '/').replace(/^\/\//, '/');
    const payload = {
      path: normalizedPath,
      method: options.method || 'GET',
      body: options.body,
      userSub: user.sub
    };
    return authorizedJsonFetch(payload);
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    let isMounted = true;
    const loadProfile = async () => {
      setProfileLoading(true);
      setProfileError('');
      try {
        const data = await apiFetch('/profile');
        if (!isMounted || !data?.profile) return;
        setProfileData({
          fullName: data.profile.fullName || user.name || '',
          congregation: data.profile.congregation || '',
          birthDate: formatDateForInput(data.profile.birthDate),
          maritalStatus: data.profile.maritalStatus || ''
        });
        setProfileLoaded(true);
      } catch (err) {
        if (isMounted) {
          setProfileError(err.message || 'Falha ao carregar perfil');
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.sub]);

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    let isMounted = true;
    const loadActivities = async () => {
      setActivitiesLoading(true);
      setActivitiesError('');
      try {
        const data = await apiFetch('/activities');
        if (!isMounted) return;
        if (data?.quizStats) {
          setQuizStats({
            correct: data.quizStats.correct || 0,
            total: data.quizStats.total || 0
          });
        }
        if (Array.isArray(data?.readingHistory)) {
          setReadingHistory(normalizeReadingHistory(data.readingHistory));
        }
      } catch (err) {
        if (isMounted) {
          setActivitiesError(err.message || 'Falha ao carregar atividades');
        }
      } finally {
        if (isMounted) {
          setActivitiesLoading(false);
        }
      }
    };

    loadActivities();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.sub]);

  const handleSaveNotes = () => {
    saveNotes(notesDraft);
    setNotesStatus('Notas salvas!');
    setTimeout(() => setNotesStatus(''), 2000);
  };

  const handleProfileSave = async () => {
    if (!isAuthenticated || !user?.sub) return;
    setProfileSaving(true);
    setProfileStatus('');
    setProfileError('');
    try {
      const payload = {
        fullName: profileData.fullName,
        congregation: profileData.congregation || null,
        birthDate: profileData.birthDate || null,
        maritalStatus: profileData.maritalStatus || null
      };
      const data = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (data?.profile) {
        setProfileData({
          fullName: data.profile.fullName || profileData.fullName,
          congregation: data.profile.congregation || '',
          birthDate: formatDateForInput(data.profile.birthDate),
          maritalStatus: data.profile.maritalStatus || ''
        });
      }
      setProfileStatus('Dados sincronizados!');
      setTimeout(() => setProfileStatus(''), 2500);
    } catch (err) {
      setProfileError(err.message || 'Falha ao salvar dados');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSyncActivities = async () => {
    if (!isAuthenticated || !user?.sub) return;
    setActivitiesSyncing(true);
    setActivitiesStatus('');
    setActivitiesError('');

    const localQuiz = getLocalQuizStats();
    const localHistory = normalizeReadingHistory(getLocalReadingHistory());
    setQuizStats(localQuiz);
    setReadingHistory(localHistory);

    try {
      await apiFetch('/activities', {
        method: 'PUT',
        body: JSON.stringify({
          quizStats: localQuiz,
          readingHistory: localHistory
        })
      });
      setActivitiesStatus('Atividades sincronizadas com sucesso!');
      setTimeout(() => setActivitiesStatus(''), 2500);
    } catch (err) {
      setActivitiesError(err.message || 'Falha ao sincronizar atividades');
    } finally {
      setActivitiesSyncing(false);
    }
  };

  const quizAccuracy = quizStats.total ? Math.round((quizStats.correct / quizStats.total) * 100) : 0;
  const latestReads = useMemo(() => readingHistory.slice(0, 3), [readingHistory]);
  const lastPlanDate = readingHistory[0]?.timestamp
    ? new Date(readingHistory[0].timestamp).toLocaleDateString()
    : '—';

  if (!isAuth0Configured) {
    return (
      <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10 text-center space-y-4">
        <h2 className="text-2xl font-bold text-brand-900">Configuração necessária</h2>
        <p className="text-slate-600">
          Para habilitar login e perfil, defina as variáveis <code className="font-mono bg-slate-100 px-2 py-1 rounded">VITE_AUTH0_DOMAIN</code> e{' '}
          <code className="font-mono bg-slate-100 px-2 py-1 rounded">VITE_AUTH0_CLIENT_ID</code> no arquivo <code>.env.local</code>.
        </p>
        <p className="text-slate-500 text-sm">Depois reinicie <code>npm run dev</code>.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-brand-900">Conta</h2>
          <p className="text-slate-500">Gerencie seu acesso e dados pessoais.</p>
        </div>
        <AuthActions />
        {isLoading && <p className="text-slate-500">Verificando sessão...</p>}
        {isAuthenticated && user && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
              )}
              <div>
                <p className="text-xl font-semibold text-brand-900">{user.name || 'Usuário'}</p>
                <p className="text-slate-500 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ID Auth0</p>
              <p className="font-mono text-sm text-slate-500 break-all">{user.sub}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-brand-900">Notas pessoais</h3>
          <p className="text-slate-500 text-sm">Escreva insights, pedidos de oração ou qualquer lembrete. Os dados ficam salvos neste navegador.</p>
        </div>
        {!isAuthenticated ? (
          <div className="text-center text-slate-500">
            <p>Faça login para liberar as notas e sincronizar com seu perfil.</p>
          </div>
        ) : (
          <>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface text-slate-700"
              placeholder="Digite aqui..."
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-6 py-3 rounded-full text-white font-semibold shadow-lg"
                style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
              >
                Salvar notas
              </button>
              {notesStatus && <span className="text-sm text-green-600">{notesStatus}</span>}
            </div>
          </>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-brand-900">Dados pessoais & congregação</h3>
          <p className="text-slate-500 text-sm">Preencha para já pensar nas tabelas do Supabase enquanto o backend sincroniza.</p>
        </div>
        {!isAuthenticated ? (
          <p className="text-center text-slate-500">Entre com sua conta para registrar dados ministeriais.</p>
        ) : (
          <div className="space-y-4">
            {profileLoading && <p className="text-sm text-slate-500">Carregando dados salvos...</p>}
            {profileError && <p className="text-sm text-red-600">{profileError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-600">Nome completo</label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
                  placeholder="Seu nome"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-600">Data de nascimento</label>
                <input
                  type="date"
                  value={profileData.birthDate}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, birthDate: e.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-600">Congregação</label>
                <select
                  value={profileData.congregation}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, congregation: e.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
                >
                  <option value="">Selecione...</option>
                  {CONGREGATIONS.map((congregation) => (
                    <option key={congregation} value={congregation}>
                      {congregation}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-600">Estado civil</label>
                <select
                  value={profileData.maritalStatus}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, maritalStatus: e.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface"
                >
                  <option value="">Selecione...</option>
                  {MARITAL_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="px-6 py-3 rounded-full text-white font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
              >
                {profileSaving ? 'Salvando...' : 'Salvar dados'}
              </button>
              {profileStatus && <span className="text-sm text-green-600">{profileStatus}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-2xl font-semibold text-brand-900">Minhas atividades</h3>
          <p className="text-slate-500 text-sm">Resumo do quiz, plano de leitura e últimas leituras registradas neste dispositivo.</p>
        </div>
        {activitiesLoading && <p className="text-sm text-slate-500">Buscando últimas atividades sincronizadas...</p>}
        {activitiesError && <p className="text-sm text-red-600">{activitiesError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-surface p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Quiz bíblico</p>
            <p className="text-3xl font-bold text-brand-900">{quizAccuracy}%</p>
            <p className="text-sm text-slate-500">
              {quizStats.correct} acertos em {quizStats.total} perguntas respondidas.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-surface p-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plano de leitura</p>
            {planLoading ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : planOverview ? (
              <>
                <p className="text-3xl font-bold text-brand-900">
                  Dia {planOverview.currentDay}
                  {planOverview.totalDays ? ` / ${planOverview.totalDays}` : ''}
                </p>
                <p className="text-sm text-slate-500">
                  {planOverview.title}
                  {planOverview.updatedAt &&
                    ` • Atualizado em ${new Date(planOverview.updatedAt).toLocaleDateString()}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {planError || 'Nenhum plano sincronizado ainda. Use o painel principal para iniciar um plano.'}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-600">Últimas leituras</p>
          {latestReads.length === 0 ? (
            <p className="text-slate-500 text-sm">Ainda não há histórico salvo. Leia algum capítulo para iniciar o cronograma.</p>
          ) : (
            <ul className="space-y-2">
              {latestReads.map((entry, idx) => (
                <li key={`${entry.bookAbbrev}-${entry.chapter}-${idx}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-surface px-4 py-3">
                  <div>
                    <p className="text-brand-900 font-semibold">
                      {entry.bookName || entry.bookAbbrev} {entry.chapter}
                    </p>
                    <p className="text-xs text-slate-500">Lido em {new Date(entry.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Plano</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {isAuthenticated && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSyncActivities}
              disabled={activitiesSyncing}
              className="px-6 py-3 rounded-full text-white font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
            >
              {activitiesSyncing ? 'Sincronizando...' : 'Sincronizar com o servidor'}
            </button>
            {(activitiesStatus || activitiesError) && (
              <span className={`text-sm ${activitiesError ? 'text-red-600' : 'text-green-600'}`}>
                {activitiesError || activitiesStatus}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Profile;
