import React, { useEffect, useMemo, useState } from 'react';
import { fetchTopSearchTerms } from '../utils/trackingService';

const LANG_LABELS = {
  greek: 'Mais buscadas (Grego)',
  hebrew: 'Mais buscadas (Hebraico)'
};

const formatTimestamp = (value) => {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Desconhecido';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
};

function TopSearchesPanel() {
  const [data, setData] = useState({ greek: [], hebrew: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setError('');
      setLoading(true);
      try {
        const [greek, hebrew] = await Promise.all([
          fetchTopSearchTerms('greek', 5),
          fetchTopSearchTerms('hebrew', 5)
        ]);
        if (!isMounted) return;
        setData({
          greek,
          hebrew
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Falha ao carregar ranking de buscas.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 60_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const metrics = useMemo(
    () => [
      { id: 'greek', label: LANG_LABELS.greek, entries: data.greek || [] },
      { id: 'hebrew', label: LANG_LABELS.hebrew, entries: data.hebrew || [] }
    ],
    [data.greek, data.hebrew]
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Insights</p>
        <h2 className="text-2xl font-semibold text-slate-900">Palavras Strong mais buscadas</h2>
        <p className="text-sm text-slate-500">
          Atualizado em tempo real conforme os usuários consultam os dicionários grego e hebraico.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.id} className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{metric.label}</p>
              {loading && <span className="text-[11px] text-slate-400">Atualizando...</span>}
            </div>
            {metric.entries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Ainda sem buscas registradas.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {metric.entries.map((entry, index) => (
                  <li
                    key={`${metric.id}-${entry.term}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{entry.term}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Última busca: {formatTimestamp(entry.lastSearch)}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{entry.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default TopSearchesPanel;
