import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AuthActions from './AuthActions';

function HeroAuthPanel() {
  const { isAuthenticated, user } = useAuth0();

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl border border-brand-50 p-4 shadow-md w-full max-w-xs">
      <p className="text-xs uppercase tracking-[0.4em] text-brand-500 mb-2">Sua conta</p>
      {isAuthenticated && user ? (
        <>
          <div className="flex items-center gap-3">
            {user.picture && (
              <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full border border-slate-200 object-cover" />
            )}
            <div>
              <p className="text-sm font-semibold text-brand-900">{user.name || user.email}</p>
              <p className="text-xs text-slate-500">Pronto para continuar o estudo</p>
            </div>
          </div>
          <div className="mt-4">
            <AuthActions />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Faça login para salvar notas, ver histórico e personalizar seu estudo diário.
          </p>
          <div className="mt-4">
            <AuthActions />
          </div>
        </>
      )}
    </div>
  );
}

export default HeroAuthPanel;
