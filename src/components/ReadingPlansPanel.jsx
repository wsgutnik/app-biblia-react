import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Papa from 'papaparse';
import { isAuth0Configured } from '../config/auth0';
import { fetchPlans, updatePlanProgress } from '../utils/planService';

const planFiles = import.meta.glob('/plan/*.csv', {
  eager: true,
  import: 'default',
  query: '?url',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
});

const formatPlanName = (path) => {
  const fileName = path.split('/').pop() || '';
  const withoutExt = fileName.replace(/\.csv$/i, '');
  return withoutExt
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
};

const planSlugFromPath = (path) => {
  const fileName = path.split('/').pop() || '';
  const base = fileName.replace(/\.csv$/i, '');
  return base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeEntry = ({ date, passage }) => {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    date,
    passage: (passage || '').trim(),
    dateObj: parsed,
  };
};

const buildPlanSummary = ({ entries, name, slug, filePath }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const total = entries.length;
  const completed = entries.filter((entry) => entry.dateObj < today).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const nextEntry = entries.find((entry) => entry.dateObj >= today) || entries[entries.length - 1];
  const nextLabel = nextEntry
    ? `${DATE_FORMATTER.format(nextEntry.dateObj)} • ${nextEntry.passage || 'Dia de revisão'}`
    : 'Nenhuma leitura programada';
  let statusLabel = 'Agendado';
  if (progress === 100 && total > 0) statusLabel = 'Concluído';
  else if (progress > 0) statusLabel = 'Em andamento';

  return {
    slug,
    filePath,
    name,
    total,
    progress,
    nextLabel,
    statusLabel,
  };
};

function ReadingPlansPanel() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remotePlans, setRemotePlans] = useState({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [progressStatus, setProgressStatus] = useState('');
  const auth = isAuth0Configured ? useAuth0() : { isAuthenticated: false, user: null };
  const { isAuthenticated, user } = auth;

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const planEntries = Object.entries(planFiles);
        const loadedPlans = await Promise.all(
          planEntries.map(async ([path, url]) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Falha ao carregar ${path}`);
            }
            const text = await response.text();
            const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
            const normalized = data
              .map((row) => normalizeEntry({ date: row.Date?.trim(), passage: row.Passage }))
              .filter(Boolean);
            return buildPlanSummary({
              entries: normalized,
              name: formatPlanName(path),
              slug: planSlugFromPath(path),
              filePath: path,
            });
          })
        );
        loadedPlans.sort((a, b) => a.name.localeCompare(b.name));
        setPlans(loadedPlans);
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
        setError('Não foi possível carregar os planos de leitura.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) {
      setRemotePlans({});
      return;
    }
    let cancelled = false;
    setProgressLoading(true);
    setProgressError('');
    fetchPlans(user.sub)
      .then((planList) => {
        if (cancelled) return;
        const map = {};
        planList.forEach((plan) => {
          map[plan.slug] = plan;
        });
        setRemotePlans(map);
      })
      .catch((err) => {
        if (cancelled) return;
        setProgressError(err.message || 'Não foi possível carregar o progresso dos planos.');
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.sub]);

  const handleAdvancePlan = async (planSlug, fallbackTotal) => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
    const remotePlan = remotePlans[planSlug];
    if (!remotePlan) return;
    const totalDays = remotePlan.totalDays || fallbackTotal || 0;
    const currentDay = remotePlan.progress?.currentDay || 0;
    if (!totalDays || currentDay >= totalDays) return;

    setProgressStatus('Atualizando progresso...');
    setProgressError('');
    try {
      const response = await updatePlanProgress(user.sub, remotePlan.id, {
        currentDay: currentDay + 1,
      });
      setRemotePlans((prev) => ({
        ...prev,
        [planSlug]: {
          ...remotePlan,
          progress: response.progress,
        },
      }));
      setProgressStatus('Progresso atualizado!');
      setTimeout(() => setProgressStatus(''), 2500);
    } catch (err) {
      console.error('Erro ao atualizar progresso do plano:', err);
      setProgressError(err.message || 'Falha ao atualizar progresso.');
    }
  };

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          Carregando planos...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
          {error}
        </div>
      );
    }

    if (!plans.length) {
      return (
        <div className="rounded-2xl border border-slate-100 px-4 py-6 text-center text-sm text-slate-500">
          Nenhum plano disponível em <code className="font-mono">/plan</code>.
        </div>
      );
    }

    return plans.map((plan) => {
      const remotePlan = remotePlans[plan.slug];
      const totalDays = remotePlan?.totalDays || plan.total;
      const currentDay = remotePlan?.progress?.currentDay || 0;
      const completionPercent = totalDays ? Math.round((currentDay / totalDays) * 100) : plan.progress;

      return (
        <div
          key={plan.slug || plan.name}
          className="rounded-2xl border border-slate-100 px-4 py-3 flex flex-col gap-2 bg-slate-50/60"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              <p className="text-xs text-slate-500">
                {totalDays ? `${totalDays} dias programados` : 'Plano personalizado'}
              </p>
              {remotePlan && (
                <p className="text-xs text-brand-700 mt-1">
                  Dia {currentDay} de {totalDays} • {completionPercent}%
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-brand-700">{plan.nextLabel}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {plan.statusLabel} • {completionPercent}%
              </p>
            </div>
          </div>
          {isAuth0Configured && isAuthenticated && remotePlan && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleAdvancePlan(plan.slug, plan.total)}
                disabled={progressLoading || currentDay >= totalDays}
                className="text-xs font-semibold rounded-full border border-slate-900 px-3 py-1 text-slate-900 hover:bg-slate-900 hover:text-white disabled:opacity-50"
              >
                Marcar próximo dia
              </button>
            </div>
          )}
        </div>
      );
    });
  }, [error, isLoading, plans, remotePlans, isAuthenticated, progressLoading]);

  return (
    <section
      id="reading-plans"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Planos de leitura</p>
        <h2 className="text-2xl font-semibold text-slate-900">Anuais, por livros e com histórico do usuário</h2>
        <p className="text-sm text-slate-500">
          Monte planos alinhados ao ano corrente, percorra livros específicos da Bíblia e mantenha tudo conectado ao seu perfil ADBelem.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {(progressError || progressStatus) && (
          <div className="rounded-2xl border border-slate-100 px-4 py-3 text-sm">
            {progressError && <p className="text-red-600">{progressError}</p>}
            {progressStatus && <p className="text-brand-700">{progressStatus}</p>}
          </div>
        )}
        {content}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Gerenciar meus planos
        </button>
        <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
          Criar plano por livro
        </button>
      </div>
    </section>
  );
}

export default ReadingPlansPanel;
