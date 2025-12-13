import React from 'react';

const TABS_CONFIG = [
  { id: 'reader', label: 'Leitura' },
  { id: 'search', label: 'Busca' },
  { id: 'dictionary', label: 'Dicionários' },
  { id: 'commentary', label: 'Comentários' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'history', label: 'Histórico' }, // ADICIONADO DE VOLTA
  { id: 'profile', label: 'Perfil' },
];

function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="hidden lg:block">
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Navegação</p>
            <p className="text-sm text-slate-500">Escolha um modo de estudo</p>
          </div>
          <span className="text-xs font-semibold uppercase text-slate-400">Desktop</span>
        </div>
        <nav
          className="mt-4 flex flex-wrap gap-3"
          aria-label="Seções principais"
        >
          {TABS_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-6 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default Tabs;
