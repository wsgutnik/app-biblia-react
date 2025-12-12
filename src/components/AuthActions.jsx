import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function AuthActions() {
  const {
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
    error
  } = useAuth0();

  if (error) {
    console.error('Erro Auth0:', error);
  }

  if (isLoading) {
    return (
      <div className="px-5 py-2 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold shadow-sm">
        Conectando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={() => loginWithRedirect()}
        className="px-5 py-2 rounded-full text-sm font-semibold text-white shadow-lg"
        style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
      >
        Entrar
      </button>
    );
  }

  const displayName = user?.name || user?.email || 'Perfil';

  return (
    <div className="flex flex-col items-center sm:items-end gap-2 text-sm">
      <span className="font-semibold text-brand-900 truncate max-w-[220px]">
        {displayName}
      </span>
      <button
        type="button"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:text-brand-700 hover:border-brand-200 transition text-xs font-semibold"
      >
        Sair
      </button>
    </div>
  );
}

export default AuthActions;
