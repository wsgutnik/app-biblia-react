import React, { useEffect, useState, Suspense, lazy, useRef } from 'react';
import Papa from 'papaparse';
import { VERSIONS, BOOKS } from './data';
import Tabs from './components/Tabs';
import VerseOfTheDay from './components/VerseOfTheDay';
import Streak from './components/Streak';
import HeroAuthPanel from './components/HeroAuthPanel';
import { loadStrongs } from './utils/loadStrongsdict';
import { isAuth0Configured } from './config/auth0.js';
import PrimaryNav from './components/PrimaryNav';
import MobileNav from './components/MobileNav';
import ReadingPlansPanel from './components/ReadingPlansPanel';
import VideoHighlightPanel from './components/VideoHighlightPanel';
import GlobalMenu from './components/GlobalMenu';

const Reader = lazy(() => import('./components/Reader'));
const Search = lazy(() => import('./components/Search'));
const Dictionary = lazy(() => import('./components/Dictionary'));
const Commentary = lazy(() => import('./components/Commentary'));
const History = lazy(() => import('./components/History'));
const Profile = lazy(() => import('./components/Profile'));
const Quiz = lazy(() => import('./components/Quiz'));

const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
});

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Carregando Bíblias...');
  const [error, setError] = useState(null);
  const [bibleData, setBibleData] = useState({});
  const [dicts, setDicts] = useState({ greek: null, hebrew: null });
  const [commentaryData, setCommentaryData] = useState([]);
  const [activeTab, setActiveTab] = useState('reader');
  const [initialChapter, setInitialChapter] = useState(null);
  const readerSectionRef = useRef(null);
  const [streakRefreshKey, setStreakRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isReaderExpanded, setIsReaderExpanded] = useState(false);
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      const loadBibleVersion = (version) => new Promise((resolve, reject) => {
        Papa.parse(`/${version.id}.csv`, {
          download: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rows = results.data;
            let headerIndex = -1;
            for(let i = 0; i < rows.length; i++) { if (String(rows[i][0]).toLowerCase().includes('id')) { headerIndex = i; break; } }
            if (headerIndex === -1) return reject(`Cabeçalho com 'ID' não encontrado em ${version.id}.csv`);
            const headers = rows[headerIndex].map(h => String(h).trim().toLowerCase());
            const versesData = rows.slice(headerIndex + 1);
            const colMap = { bookNum: headers.indexOf("book number"), chapter: headers.indexOf("chapter"), verse: headers.indexOf("verse"), text: headers.indexOf("text") };
            if (Object.values(colMap).some(index => index === -1)) { return reject(`Cabeçalho esperado não encontrado em ${version.id}.csv`); }
            const formattedData = versesData.map(row => {
                const bookInfo = BOOKS.find(b => b.num == row[colMap.bookNum]);
                if (!bookInfo) return null;
                return { book_abbrev: bookInfo.abbrev, chapter: row[colMap.chapter], verse: row[colMap.verse], text: row[colMap.text] };
            }).filter(Boolean);
            resolve({ id: version.id, data: formattedData });
          },
          error: (err) => reject(`Erro ao carregar ${version.id}.csv: ${err.message}`)
        });
      });
      const loadCommentaries = async () => {
        setLoadingMessage('Carregando Comentários...');
        const response = await fetch('/commentaries.json');
        if (!response.ok) { throw new Error('Não foi possível carregar o ficheiro de comentários.'); }
        return response.json();
      };
      try {
        setLoadingMessage('Carregando Bíblias...');
        const biblePromises = VERSIONS.map(v => loadBibleVersion(v));
        const allBibleData = await Promise.all(biblePromises);
        const bibleObject = allBibleData.reduce((acc, v) => { acc[v.id] = v.data; return acc; }, {});
        setBibleData(bibleObject);
        setLoadingMessage('Carregando Dicionários...');
        const d = await loadStrongs();
        setDicts(d);
        const commentaries = await loadCommentaries();
        setCommentaryData(commentaries);
      } catch (err) {
        console.error("Falha Crítica ao carregar dados:", err);
        setError(err.toString());
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  useEffect(() => {
    const handleExternalNavigation = (event) => {
      const tab = event.detail?.tab;
      if (tab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('app:navigate', handleExternalNavigation);
    return () => window.removeEventListener('app:navigate', handleExternalNavigation);
  }, []);

  useEffect(() => {
    if (activeTab !== 'reader' && isReaderExpanded) {
      setIsReaderExpanded(false);
    }
  }, [activeTab, isReaderExpanded]);

  const handleNavigateFromHistory = (item) => {
    setInitialChapter(item);
    setActiveTab('reader');
  };

  const handleQuickAction = (tab) => {
    setActiveTab(tab);
    if (readerSectionRef.current) {
      readerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleStreakRecorded = () => {
    setStreakRefreshKey((prev) => prev + 1);
  };

  const handleGlobalSearch = (term) => {
    const normalized = term.trim();
    if (!normalized) return;
    setSearchQuery(normalized);
    setActiveTab('search');
    window.scrollTo({ top: readerSectionRef.current?.offsetTop || 0, behavior: 'smooth' });
  };

  const handleToggleReaderFocus = () => {
    setIsReaderExpanded((prev) => !prev);
    if (!isReaderExpanded && readerSectionRef.current) {
      readerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-surface">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-brand-800">{loadingMessage}</h1>
                <p className="text-slate-600 mt-2">Isso pode levar alguns segundos...</p>
            </div>
        </div>
    );
  }

  if (error) {
     return (
        <div className="flex items-center justify-center h-screen bg-surface px-4">
            <div className="text-center p-6 max-w-lg rounded-2xl bg-white shadow-card border border-red-100">
                <h1 className="text-xl font-bold text-red-600">Erro Crítico ao Carregar Dados</h1>
                <p className="font-mono bg-red-50 text-red-800 p-3 rounded mt-3 break-all">{error}</p>
            </div>
        </div>
     );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 lg:pb-0">
      <PrimaryNav onSearch={handleGlobalSearch} onToggleMenu={() => setIsMenuDrawerOpen((prev) => !prev)} />
      <GlobalMenu
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickAction={handleQuickAction}
        isDrawerOpen={isMenuDrawerOpen}
        setDrawerOpen={setIsMenuDrawerOpen}
      />
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {!isReaderExpanded && (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-7 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Continuar estudo</p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-900">Bíblia Sagrada ADBelem</h1>
                  <p className="mt-2 text-sm text-slate-500 max-w-xl">
                    Configure planos anuais por livros, acompanhe o progresso do seu perfil e mergulhe nos vídeos da ADBelem USA sem sair do painel.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAction('history')}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                  >
                    Histórico rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction('dictionary')}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                  >
                    Dicionário Strong
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction('reader')}
                    className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    Ler agora
                  </button>
                </div>
              </div>
            </section>

            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          </>
        )}

        <div className={`grid gap-8 ${isReaderExpanded ? '' : 'lg:grid-cols-[3fr,2fr]'}`}>
          <main
            ref={readerSectionRef}
            className={`rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm ${isReaderExpanded ? 'lg:col-span-2' : ''}`}
          >
            <Suspense fallback={<div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-500">Carregando conteúdo...</div>}>
              {(() => {
                switch (activeTab) {
                  case 'reader':
                    return (
                      <Reader
                        bibleData={bibleData}
                        initialChapter={initialChapter}
                        setInitialChapter={setInitialChapter}
                        onStreakRecorded={handleStreakRecorded}
                        isFocused={isReaderExpanded}
                        onToggleFocus={handleToggleReaderFocus}
                      />
                    );
                  case 'search':
                    return <Search bibleData={bibleData} initialQuery={searchQuery} />;
                  case 'dictionary':
                    return <Dictionary greekDict={dicts.greek} hebrewDict={dicts.hebrew} bibleData={bibleData} />;
                  case 'commentary':
                    return <Commentary commentaryData={commentaryData} bibleData={bibleData} />;
                  case 'quiz':
                    return <Quiz />;
                  case 'history':
                    return <History onNavigate={handleNavigateFromHistory} />;
                  case 'profile':
                    return <Profile />;
                  default:
                    return null;
                }
              })()}
            </Suspense>
          </main>

          {!isReaderExpanded && (
            <aside className="space-y-6">
              {isAuth0Configured && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <HeroAuthPanel />
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Sequência diária</p>
                <p className="mt-2 text-sm text-slate-500">Reforce o hábito de leitura mantendo sua sequência ativa.</p>
                <div className="mt-4">
                  <Streak refreshToken={streakRefreshKey} />
                </div>
                <button className="mt-4 text-sm font-semibold text-brand-700 hover:text-brand-900">
                  Ver atividade completa &rarr;
                </button>
              </div>

              <VerseOfTheDay bibleData={bibleData} className="w-full" />

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                    <img
                      src="/logos/Bethlehem-Brasao-Novo-black.png"
                      alt="Logo ADBelem"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Obtenha o app ADBelem</p>
                    <p className="text-xs text-slate-500">Leia planos, receba notificações e continue no mobile.</p>
                  </div>
                </div>
                <button className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black">
                  Usar app
                </button>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <button className="block w-full text-left hover:text-slate-900">Ajuda &amp; suporte</button>
                  <button className="block w-full text-left hover:text-slate-900">Definições da conta</button>
                  <button className="block w-full text-left hover:text-slate-900">Terminar sessão</button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {!isReaderExpanded && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ReadingPlansPanel />
            <VideoHighlightPanel />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
