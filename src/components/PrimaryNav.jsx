import React, { useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { isAuth0Configured } from '../config/auth0';

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

const AccountMenuBase = ({ avatar, name, onProfile, onLogout, isAuthenticated }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = isAuthenticated ? 'Abrir menu da conta' : 'Iniciar sessão';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-10 rounded-full border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        aria-label={label}
      >
        <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-slate-200 bg-white shadow-lg p-2 text-sm text-slate-600">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"
          >
            Ver perfil
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-50"
          >
            {isAuthenticated ? 'Sair' : 'Entrar'}
          </button>
        </div>
      )}
    </div>
  );
};

const dispatchProfileNavigation = () => {
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab: 'profile' } }));
};

const AccountMenuFallback = () => (
  <AccountMenuBase
    avatar="https://avatar.vercel.sh/adbelem?text=AD"
    name="Conta"
    isAuthenticated={false}
    onProfile={dispatchProfileNavigation}
    onLogout={() => alert('Configure Auth0 para ativar login.')}
  />
);

const AccountMenuAuth = () => {
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
  const avatar = user?.picture || 'https://avatar.vercel.sh/adbelem?text=AD';
  const name = user?.name || 'Conta ADBelem';
  const handleProfile = () => dispatchProfileNavigation();
  const handleLogout = () => {
    if (isAuthenticated) {
      logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      loginWithRedirect();
    }
  };
  return (
    <AccountMenuBase
      avatar={avatar}
      name={name}
      isAuthenticated={isAuthenticated}
      onProfile={handleProfile}
      onLogout={handleLogout}
    />
  );
};

const AccountMenu = () => (isAuth0Configured ? <AccountMenuAuth /> : <AccountMenuFallback />);

function PrimaryNav({ onSearch }) {
  const [term, setTerm] = useState('');

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (!term.trim()) return;
    if (typeof onSearch === 'function') {
      onSearch(term.trim());
      setTerm('');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logos/Bethlehem-Brasao-Novo-black.png"
                alt="ADBelem logo"
                className="h-10 w-auto object-contain"
              />
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
            <AccountMenu />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Pesquisar em toda a Bíblia..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button type="submit" className="sr-only">Buscar</button>
          </form>
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
