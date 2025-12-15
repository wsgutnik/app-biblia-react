import React from 'react';

function VideoHighlightPanel() {
  return (
    <section
      id="video-library"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Vídeos ADBelem USA</p>
        <h2 className="text-2xl font-semibold text-slate-900">Conteúdo direto do nosso YouTube</h2>
        <p className="text-sm text-slate-500">
          Conectamos a aba de vídeos ao canal oficial da ADBelem USA. Assista a mensagens, devocionais
          e transmissões recentes sem sair do app.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {['Culto Domingo', 'Devocional Diário'].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/70">
            <p className="text-sm font-semibold text-slate-900">{item}</p>
            <p className="text-xs text-slate-500">Atualizado automaticamente pelo canal.</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="https://www.youtube.com/@adbelemusa"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
        >
          Abrir YouTube
        </a>
        <a
          href="#"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
        >
          Ver vídeos no app
        </a>
      </div>
    </section>
  );
}

export default VideoHighlightPanel;
