import React from 'react';

const TABS_CONFIG = [
  { id: 'reader', label: 'Leitura' },
  { id: 'search', label: 'Busca' },
  { id: 'dictionary', label: 'Dicionários' },
  { id: 'commentary', label: 'Comentários' },
  { id: 'history', label: 'Histórico' }, // ADICIONADO DE VOLTA
  { id: 'profile', label: 'Perfil' },
];

function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="mb-8">
      <div className="bg-card border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
        <nav
          className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start"
          aria-label="Tabs"
        >
          {TABS_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition shadow-sm ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'bg-white text-brand-700 hover:text-brand-900'
                }`}
                style={
                  isActive
                    ? { backgroundColor: 'var(--color-brand, #1d4ed8)' }
                    : undefined
                }
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
