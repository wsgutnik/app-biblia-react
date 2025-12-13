import React from 'react';

const PLAN_CONFIG = [
  {
    title: 'Plano anual 2025',
    subtitle: '365 dias • Cronológico',
    detail: 'Em andamento',
    tag: 'Sincronizado com sua conta',
  },
  {
    title: 'Livro a Livro',
    subtitle: 'Escolha livros específicos (ex: João, Salmos)',
    detail: 'Próximo: Evangelhos',
    tag: 'Progresso salva automaticamente',
  },
  {
    title: 'Planos temáticos',
    subtitle: 'Fé, Família, Discipulado',
    detail: 'Novas séries mensais',
    tag: 'Compartilhável com o grupo',
  },
];

function ReadingPlansPanel() {
  return (
    <section
      id="reading-plans"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Planos de leitura</p>
        <h2 className="text-2xl font-semibold text-slate-900">Anuais, por livros e com histórico do usuário</h2>
        <p className="text-sm text-slate-500">
          Monte planos alinhados ao ano corrente, percorra livros específicos da Bíblia e mantenha tudo conectado ao seu perfil ADBelem.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {PLAN_CONFIG.map((plan) => (
          <div
            key={plan.title}
            className="rounded-2xl border border-slate-100 px-4 py-3 flex items-start justify-between gap-4 bg-slate-50/60"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{plan.title}</p>
              <p className="text-xs text-slate-500">{plan.subtitle}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-brand-700">{plan.detail}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">{plan.tag}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Gerenciar meus planos
        </button>
        <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
          Criar plano por livro
        </button>
      </div>
    </section>
  );
}

export default ReadingPlansPanel;
