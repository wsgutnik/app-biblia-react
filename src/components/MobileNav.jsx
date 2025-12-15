import React from 'react';

const NAV_ITEMS = [
  { id: 'reader', label: 'Bíblia', icon: 'home' },
  { id: 'search', label: 'Busca', icon: 'search' },
  { id: 'dictionary', label: 'Dicio.', icon: 'book' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'commentary', label: 'Coments', icon: 'spark' },
  { id: 'history', label: 'Hist.', icon: 'menu' },
];

const icons = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="m15.5 15.5 4 4" />
    </svg>
  ),
  book: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5V5a2 2 0 0 1 2-2h13" />
      <path d="M6 2.5C7.5 2.5 9 3.5 9 5v15.5" />
      <path d="M9 5c0-1.5 1.5-2.5 3-2.5h5v17.5" />
    </svg>
  ),
  spark: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="m19.1 4.9-2.8 2.8" />
      <path d="M22 12h-4" />
      <path d="m19.1 19.1-2.8-2.8" />
      <path d="M12 18v4" />
      <path d="m7.7 16.3-2.8 2.8" />
      <path d="M6 12H2" />
      <path d="m7.7 7.7-2.8-2.8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  menu: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  ),
  quiz: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 9a3 3 0 1 1 3 3v2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  ),
};

function MobileNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-white/70 bg-white/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(15,23,42,.12)]">
      <div className="mx-auto flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition ${
                isActive ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-500'
                }`}
                aria-hidden="true"
              >
                {icons[item.icon]}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
