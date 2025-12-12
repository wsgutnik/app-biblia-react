import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import AuthActions from './AuthActions';
import { isAuth0Configured } from '../config/auth0';

const usePersistentNotes = (userSub) => {
  const storageKey = userSub ? `profile_notes_${userSub}` : null;
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setNotes(stored);
    } else {
      setNotes('');
    }
  }, [storageKey]);

  const saveNotes = (value) => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, value);
    setNotes(value);
  };

  return [notes, saveNotes];
};

function Profile() {
  const { isAuthenticated, isLoading, user } = useAuth0();

  const [notesDraft, setNotesDraft] = useState('');
  const [status, setStatus] = useState('');
  const userSub = user?.sub;
  const [savedNotes, saveNotes] = usePersistentNotes(userSub);

  useEffect(() => {
    setNotesDraft(savedNotes || '');
  }, [savedNotes]);

  const handleSaveNotes = () => {
    saveNotes(notesDraft);
    setStatus('Notas salvas!');
    setTimeout(() => setStatus(''), 2000);
  };

  if (!isAuth0Configured) {
    return (
      <section className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-10 text-center space-y-4">
        <h2 className="text-2xl font-bold text-brand-900">Configuração necessária</h2>
        <p className="text-slate-600">
          Para habilitar login e perfil, defina as variáveis <code className="font-mono bg-slate-100 px-2 py-1 rounded">VITE_AUTH0_DOMAIN</code> e{' '}
          <code className="font-mono bg-slate-100 px-2 py-1 rounded">VITE_AUTH0_CLIENT_ID</code> no arquivo <code>.env.local</code>.
        </p>
        <p className="text-slate-500 text-sm">Depois reinicie <code>npm run dev</code>.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-brand-900">Conta</h2>
          <p className="text-slate-500">Gerencie seu acesso e dados pessoais.</p>
        </div>
        <AuthActions />
        {isLoading && <p className="text-slate-500">Verificando sessão...</p>}
        {isAuthenticated && user && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
              )}
              <div>
                <p className="text-xl font-semibold text-brand-900">{user.name || 'Usuário'}</p>
                <p className="text-slate-500 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-surface p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ID Auth0</p>
              <p className="font-mono text-sm text-slate-500 break-all">{user.sub}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-brand-900">Notas pessoais</h3>
          <p className="text-slate-500 text-sm">Escreva insights, pedidos de oração ou qualquer lembrete. Os dados ficam salvos neste navegador.</p>
        </div>
        {!isAuthenticated ? (
          <div className="text-center text-slate-500">
            <p>Faça login para liberar as notas e sincronizar com seu perfil.</p>
          </div>
        ) : (
          <>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-surface text-slate-700"
              placeholder="Digite aqui..."
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-6 py-3 rounded-full text-white font-semibold shadow-lg"
                style={{ backgroundColor: 'var(--color-brand, #1d4ed8)' }}
              >
                Salvar notas
              </button>
              {status && <span className="text-sm text-green-600">{status}</span>}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Profile;
