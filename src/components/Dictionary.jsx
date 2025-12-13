import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BOOKS } from '../data';

const PT_TO_EN_MAP = {
  amor: 'love',
  fé: 'faith',
  deus: 'god',
  senhor: 'lord',
  espírito: 'spirit',
  salvação: 'salvation',
  graça: 'grace',
  pecado: 'sin',
  justiça: 'righteousness',
  coração: 'heart',
  palavra: 'word',
  luz: 'light',
  vida: 'life',
  morte: 'death'
};

// --- Sub-componente para a nova página de detalhes da palavra ---
const EntryDetailView = ({ entry, bibleData, onBack }) => {
  const [translation, setTranslation] = useState('Traduzindo...');

  // Efeito para traduzir a definição quando a palavra muda
  useEffect(() => {
    const translateDefinition = async () => {
      if (!entry.strongs_def) {
        setTranslation('Definição não disponível.');
        return;
      }
      try {
        const response = await fetch('https://libretranslate.de/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: entry.strongs_def,
            source: 'en',
            target: 'pt',
            format: 'text'
          })
        });

        if (!response.ok) {
          throw new Error(`Erro na API: ${response.statusText}`);
        }

        const result = await response.json();

        if (result && result.translatedText) {
          setTranslation(result.translatedText);
        } else {
          throw new Error('Resposta da API inválida.');
        }
      } catch (error) {
        console.error('Erro de tradução:', error);
        setTranslation('Não foi possível traduzir a definição.');
      }
    };

    translateDefinition();
  }, [entry.strongs_def]);

  // Procura por todas as referências da palavra na Bíblia
  const references = useMemo(() => {
    const found = [];
    const strongId = entry.strong_number;
    const kjvStrongs = bibleData['kjv_strongs'];
    const almeidaRC = bibleData['almeida_rc'];

    if (!strongId || !kjvStrongs || !almeidaRC) return [];

    for (const verse of kjvStrongs) {
      const strongRegex = new RegExp(`[<{]${strongId}[>}]`);
      if (verse.text && verse.text.match(strongRegex)) {
        const bookInfo = BOOKS.find((b) => b.abbrev === verse.book_abbrev);

        // Agora, encontra o mesmo versículo na Almeida RC
        const almeidaVerse = almeidaRC.find(
          (v) =>
            v.book_abbrev === verse.book_abbrev &&
            v.chapter === verse.chapter &&
            v.verse === verse.verse
        );

        if (bookInfo && almeidaVerse) {
          found.push({
            ref: `${bookInfo.name_pt} ${verse.chapter}:${verse.verse}`,
            text_kjv: verse.text.replace(/<[^>]*>/g, ''), // Limpa tags da KJV
            text_arc: almeidaVerse.text
          });
        }
      }
    }
    return found;
  }, [entry.strong_number, bibleData]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md animate-fade-in">
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">
        ← Voltar
      </button>

      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">{entry.lemma}</h2>
        <p className="text-lg text-slate-500">{entry.translit}</p>
        <p className="text-sm text-slate-400">Strongs: {entry.strong_number}</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-slate-700">Definição (Strongs):</h3>
          <p className="text-slate-600 italic pl-4 border-l-2 border-slate-200">{entry.strongs_def}</p>
        </div>
        <div>
          <h3 className="font-bold text-lg text-blue-700">Tradução (IA):</h3>
          <p className="text-blue-600 pl-4 border-l-2 border-blue-200">{translation}</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-bold text-xl text-slate-800 mb-4">Ocorrências na Bíblia ({references.length})</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {references.map((ref, index) => (
            <div key={index} className="border-b pb-2">
              <p className="font-semibold text-slate-700">{ref.ref}</p>
              <p className="text-slate-600 pl-4 border-l-2 border-slate-200">
                <span className="font-bold text-xs text-slate-400">KJV:</span> {ref.text_kjv}
              </p>
              <p className="text-blue-600 pl-4 border-l-2 border-blue-200">
                <span className="font-bold text-xs text-blue-400">ARC:</span> {ref.text_arc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal do Dicionário (com paginação e busca inteligente) ---
function Dictionary({ greekDict, hebrewDict, bibleData }) {
  const [term, setTerm] = useState('');
  const [searchIn, setSearchIn] = useState('greek');
  const [results, setResults] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 100;

  const processedDictionary = useMemo(() => {
    const dict = searchIn === 'greek' ? greekDict : hebrewDict;
    if (!dict) return [];
    return Object.entries(dict).map(([strong_number, entryData]) => ({
      ...entryData,
      strong_number,
      translit: entryData.translit || entryData.xlit || ''
    }));
  }, [searchIn, greekDict, hebrewDict]);

  const updateResults = useCallback(
    (searchTerm = '') => {
        let filteredEntries = processedDictionary;
        if (searchTerm) {
          const lowerCaseTerm = searchTerm.toLowerCase();
          const englishTerm = PT_TO_EN_MAP[lowerCaseTerm];
        filteredEntries = processedDictionary.filter((entry) => {
          const def = entry.strongs_def?.toLowerCase() || '';
          const definitionMatch = englishTerm
            ? def.includes(englishTerm) || def.includes(lowerCaseTerm)
            : def.includes(lowerCaseTerm);
          return (
            entry.strong_number?.toLowerCase().includes(lowerCaseTerm) ||
            entry.lemma?.toLowerCase().includes(lowerCaseTerm) ||
            entry.translit?.toLowerCase().includes(lowerCaseTerm) ||
            definitionMatch
          );
        });
      }
      setResults(filteredEntries);
      setCurrentPage(1);
    },
    [processedDictionary]
  );

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      updateResults(term);
    },
    [term, updateResults]
  );

  useEffect(() => {
    updateResults();
  }, [updateResults]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, results]);

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));

  if (!greekDict && !hebrewDict) {
    return <p>Carregando dicionários...</p>;
  }

  if (selectedEntry) {
    return <EntryDetailView entry={selectedEntry} bibleData={bibleData} onBack={() => setSelectedEntry(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por número Strong, lema ou definição"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Buscar
            </button>
          </div>
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="dict"
                value="greek"
                checked={searchIn === 'greek'}
                onChange={() => setSearchIn('greek')}
              />
              <span>Grego</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="dict"
                value="hebrew"
                checked={searchIn === 'hebrew'}
                onChange={() => setSearchIn('hebrew')}
              />
              <span>Hebraico</span>
            </label>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 divide-y">
        {paginatedResults.length === 0 ? (
          <p className="p-4 text-slate-600">Nenhum resultado encontrado.</p>
        ) : (
          paginatedResults.map((entry) => (
            <button
              key={entry.strong_number}
              type="button"
              onClick={() => setSelectedEntry(entry)}
              className="w-full text-left p-4 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm text-slate-400">{entry.strong_number}</p>
                  <p className="text-lg font-semibold text-slate-800">{entry.lemma}</p>
                  {entry.translit && <p className="text-sm text-slate-500">{entry.translit}</p>}
                </div>
                <span className="text-blue-600 text-sm font-medium">
                  {searchIn === 'greek' ? 'Grego' : 'Hebraico'}
                </span>
              </div>
              {entry.strongs_def && (
                <p className="mt-2 text-slate-600 line-clamp-2">{entry.strongs_def}</p>
              )}
            </button>
          ))
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">
          Página {currentPage} de {totalPages} — {results.length} resultados
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dictionary;
