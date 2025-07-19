import React from 'react';

// Adicionamos o novo objeto 'Dicionários'
const TABS_CONFIG = [
  { id: 'reader', label: 'Leitura' },
  { id: 'search', label: 'Busca' },
  { id: 'dictionary', label: 'Dicionários' },
  { id: 'random', label: 'Verso Aleatório' },
];

function Tabs({ activeTab, setActiveTab }) {
  return (
    <div className="mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {TABS_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-base transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Tabs;