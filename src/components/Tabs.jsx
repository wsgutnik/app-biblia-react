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
    <div className="rounded-2xl border border-white/60 bg-white px-4 py-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Navegação</p>
          <p className="text-sm text-slate-500">Escolha um modo de estudo</p>
        </div>
      </div>
      <nav
        className="mt-4 flex gap-2 overflow-x-auto pb-2"
        aria-label="Seções principais"
      >
        {TABS_CONFIG.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-[110px] rounded-full border px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white shadow'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default Tabs;
