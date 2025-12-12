import React, { useEffect, useState, Suspense, lazy } from 'react';
import Papa from 'papaparse';
import { VERSIONS, BOOKS } from './data';
import Tabs from './components/Tabs';
import VerseOfTheDay from './components/VerseOfTheDay';
import Streak from './components/Streak';
import HeroAuthPanel from './components/HeroAuthPanel';
import { loadStrongs } from './utils/loadStrongsdict';
import { isAuth0Configured } from './config/auth0.js';

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

  const handleNavigateFromHistory = (item) => {
    setInitialChapter(item);
    setActiveTab('reader');
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
    <div className="bg-surface min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="relative mb-10 overflow-hidden rounded-3xl bg-card px-6 py-8 shadow-card border border-slate-100">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-50/80 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.35em] text-brand-500">ADBelem</p>
              <h1 className="text-4xl font-extrabold text-brand-900 mt-2">Bíblia Sagrada</h1>
              <p className="text-base text-slate-600 mt-2">Uma experiência moderna de leitura, estudo e pesquisa bíblica.</p>
            </div>
            <div className="self-center sm:self-auto flex flex-col items-center sm:items-end gap-4 w-full sm:w-auto">
              {isAuth0Configured && <HeroAuthPanel />}
              <Streak />
            </div>
          </div>
        </header>
        
        {/* VERSO DO DIA DE VOLTA AO TOPO */}
        <VerseOfTheDay bibleData={bibleData} />
        
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="mt-8">
          <Suspense fallback={<div className="rounded-3xl bg-card border border-slate-100 shadow-card p-8 text-center text-slate-500">Carregando conteúdo...</div>}>
            {(() => {
              switch (activeTab) {
                case 'reader':
                  return (
                    <Reader
                      bibleData={bibleData}
                      initialChapter={initialChapter}
                      setInitialChapter={setInitialChapter}
                    />
                  );
                case 'search':
                  return <Search bibleData={bibleData} />;
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
      </div>
    </div>
  );
}

export default App;
