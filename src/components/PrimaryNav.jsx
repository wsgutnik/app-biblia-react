import React from 'react';

const navLinks = [
  { id: 'bible', label: 'Bíblia' },
  { id: 'plans', label: 'Planos' },
  { id: 'videos', label: 'Vídeos' },
];

const IconButton = ({ label, children }) => (
  <button
    type="button"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition"
    aria-label={label}
  >
    {children}
  </button>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c-2.5 3.5-2.5 14 0 18" />
    <path d="M12 3c2.5 3.5 2.5 14 0 18" transform="scale(-1,1) translate(-24,0)" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M6 12h12M8 17h8" />
  </svg>
);

const DotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 6h.01" />
    <path d="M12 12h.01" />
    <path d="M12 18h.01" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4" />
  </svg>
);

function PrimaryNav() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <img
                  src="/logos/Bethlehem-Brasao-Novo-black.png"
                  alt="ADBelem logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">ADBelem</p>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bible</p>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-600">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  className="px-3 py-1.5 rounded-full hover:bg-slate-100"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#"
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black transition"
            >
              Get the app
            </a>
            <IconButton label="Alterar idioma">
              <GlobeIcon />
            </IconButton>
            <IconButton label="Abrir menu">
              <MenuIcon />
            </IconButton>
            <IconButton label="Mais opções">
              <DotsIcon />
            </IconButton>
            <button
              type="button"
              className="h-9 w-9 rounded-full border border-slate-200 bg-gradient-to-br from-pink-500 via-orange-400 to-lime-400 p-[2px]"
              aria-label="Acessar conta"
            >
              <span className="block h-full w-full rounded-full border border-white bg-white/80" aria-hidden="true">
                <img
                  src="https://avatar.vercel.sh/adbelem?text=WG"
                  alt="Conta"
                  className="h-full w-full rounded-full object-cover"
                />
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Pesquisar em toda a Bíblia..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="flex gap-2 text-sm font-semibold text-slate-600 sm:ml-4">
            <a
              href="#reading-plans"
              className="rounded-full border border-slate-200 px-4 py-2 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition"
            >
              Continuar plano
            </a>
            <a
              href="https://www.youtube.com/@adbelemusa"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex rounded-full border border-slate-200 px-4 py-2 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition"
            >
              Explorar vídeos
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

export default PrimaryNav;
