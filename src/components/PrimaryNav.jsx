import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { isAuth0Configured } from '../config/auth0';

const IconButton = ({ label, children, onClick }) => (
  <button
    type="button"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
    aria-label={label}
    onClick={onClick}
  >
    {children}
  </button>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M6 12h12M8 17h8" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="6" />
    <path d="m14 14 4 4" />
  </svg>
);

const dispatchTabNavigation = (tab) => {
  if (!tab) return;
  window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab } }));
};

const BrandCluster = () => (
  <div className="flex flex-col items-center text-center leading-tight">
    <p className="text-2xl font-semibold text-slate-900 sm:text-3xl">Bíblia Sagrada</p>
    <p className="text-sm font-medium text-slate-500">- Plus Tools</p>
  </div>
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
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-2xl border border-slate-200 bg-white shadow-lg p-2 text-sm text-slate-600">
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

const dispatchProfileNavigation = () => dispatchTabNavigation('profile');

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

function PrimaryNav({ onSearch, onToggleMenu, onHeightChange }) {
  const [term, setTerm] = useState('');
  const headerRef = useRef(null);

  useLayoutEffect(() => {
    if (typeof onHeightChange !== 'function') return undefined;
    const calculateHeight = () => {
      if (headerRef.current) {
        onHeightChange(headerRef.current.offsetHeight);
      }
    };
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [onHeightChange]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    if (!term.trim()) return;
    if (typeof onSearch === 'function') {
      onSearch(term.trim());
      setTerm('');
    }
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-white/70 bg-[#f6f8fb]/95 backdrop-blur">
      <div className="mx-auto max-w-5xl w-full px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <IconButton label="Abrir menu" onClick={onToggleMenu}>
            <MenuIcon />
          </IconButton>
          <AccountMenu />
        </div>

        <div className="flex justify-center mb-6">
          <BrandCluster />
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex max-w-2xl mx-auto">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar em toda a Bíblia..."
            className="w-full rounded-[28px] border border-white/70 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </form>
      </div>
    </header>
  );
}

export default PrimaryNav;
