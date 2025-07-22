import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { VERSIONS, BOOKS } from './data';
import Tabs from './components/Tabs';
import Reader from './components/Reader';
import Search from './components/Search';
import Dictionary from './components/Dictionary';
import Commentary from './components/Commentary';
import VerseOfTheDay from './components/VerseOfTheDay';

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
  const [greekDict, setGreekDict] = useState(null);
  const [hebrewDict, setHebrewDict] = useState(null);
  const [commentaryData, setCommentaryData] = useState([]);
  const [activeTab, setActiveTab] = useState('reader'); // A aba de leitura será a padrão

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
        await loadScript('/strongs-greek-dictionary.js');
        await loadScript('/strongs-hebrew-dictionary.js');
        if (window.strongsGreekDictionary) setGreekDict(window.strongsGreekDictionary);
        if (window.strongsHebrewDictionary) setHebrewDict(window.strongsHebrewDictionary);
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

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-800">{loadingMessage}</h1>
                <p className="text-gray-600 mt-2">Isso pode levar alguns segundos...</p>
            </div>
        </div>
    );
  }

  if (error) {
     return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center p-4 max-w-lg">
                <h1 className="text-xl font-bold text-red-600">Erro Crítico ao Carregar Dados</h1>
                <p className="font-mono bg-red-100 text-red-800 p-2 rounded mt-2 break-all">{error}</p>
            </div>
        </div>
     );
  }
  
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Bíblia Sagrada</h1>
          <p className="text-lg text-slate-600 mt-2">Sua ferramenta de estudo das Escrituras.</p>
        </header>
        
        {/* NOVO LAYOUT: Verso do Dia sempre visível no topo */}
        <VerseOfTheDay bibleData={bibleData} />
        
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="mt-8">
          {activeTab === 'reader' && <Reader bibleData={bibleData} />}
          {activeTab === 'search' && <Search bibleData={bibleData} />}
          {activeTab === 'dictionary' && <Dictionary greekDict={greekDict} hebrewDict={hebrewDict} bibleData={bibleData} />}
          {activeTab === 'commentary' && <Commentary commentaryData={commentaryData} bibleData={bibleData} />}
        </main>
      </div>
    </div>
  );
}

export default App;
