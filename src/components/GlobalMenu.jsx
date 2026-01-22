import React from 'react';

const MENU_ITEMS = [
  { id: 'reader', label: 'Leitura', description: 'Capítulos e versões' },
  { id: 'search', label: 'Busca', description: 'Palavras e referências' },
  { id: 'dictionary', label: 'Dicionário', description: 'Strong e léxicos' },
  { id: 'commentary', label: 'Comentários', description: 'Contexto histórico' },
  { id: 'quiz', label: 'Quiz', description: 'Teste seus conhecimentos' },
  { id: 'history', label: 'Histórico', description: 'Últimas leituras' },
  { id: 'profile', label: 'Perfil', description: 'Dados e estatísticas' },
];

const QUICK_ACTIONS = [
  { id: 'history', label: 'Histórico rápido' },
  { id: 'dictionary', label: 'Dicionário Strong' },
  { id: 'quiz', label: 'Iniciar quiz' },
  { id: 'reader', label: 'Ler agora', primary: true },
];

function GlobalMenu({ activeTab, setActiveTab, onQuickAction, isDrawerOpen, setDrawerOpen, topOffset = 0 }) {
  const drawerTop = Math.max(0, topOffset || 0);
  const handleClose = () => {
    if (typeof setDrawerOpen === 'function') {
      setDrawerOpen(false);
    }
  };

  const handleSelect = (id) => {
    setActiveTab(id);
    handleClose();
  };

  const handleAction = (id) => {
    if (onQuickAction) onQuickAction(id);
    handleClose();
  };

  const renderLinks = () => (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {MENU_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              isActive
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-white'
            }`}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className={`hidden text-xs md:block ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
              {item.description}
            </p>
          </button>
        );
      })}
    </div>
  );

  const renderActions = () => (
    <div className="flex flex-wrap gap-3">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => handleAction(action.id)}
          className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
            action.primary
              ? 'bg-slate-900 text-white hover:bg-black'
              : 'border border-slate-200 text-slate-700 hover:border-slate-400'
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div
        className={`fixed left-0 right-0 bottom-0 z-40 bg-slate-900/40 transition-opacity ${
          isDrawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ top: drawerTop }}
        onClick={handleClose}
        aria-hidden={!isDrawerOpen}
      />
      <aside
        className={`fixed left-0 z-50 w-80 max-w-[90%] transform bg-white shadow-2xl transition-transform ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ top: drawerTop, bottom: 0 }}
        aria-hidden={!isDrawerOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Menu</p>
            <p className="text-sm text-slate-500">Escolha uma seção</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-900"
            aria-label="Fechar menu lateral"
          >
            ✕
          </button>
        </div>
        <div className="space-y-5 px-4 py-6">
          {renderLinks()}
          <div className="border-t border-slate-200 pt-4">{renderActions()}</div>
        </div>
      </aside>
    </>
  );
}

export default GlobalMenu;
