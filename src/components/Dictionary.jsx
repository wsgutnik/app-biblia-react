import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { translateText } from '../utils/translate';
import { recordSearchTerm } from '../utils/trackingService';

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

  useEffect(() => {
    let isMounted = true;
    if (!entry) {
      setTranslation('Definição não disponível.');
      return () => {
        isMounted = false;
      };
    }

    const translateDefinition = async () => {
      if (!entry.strongs_def) {
        setTranslation('Definição não disponível.');
        return;
      }
      try {
        const translatedText = await translateText(entry.strongs_def);
        if (isMounted) setTranslation(translatedText);
      } catch (error) {
        console.warn('Falha ao traduzir com Google Translate:', error);
        if (isMounted) setTranslation('Não foi possível traduzir a definição automaticamente.');
      }
    };

    translateDefinition();
    return () => {
      isMounted = false;
    };
  }, [entry]);

  const references = useMemo(() => {
    if (!entry) return [];
    const found = [];
    const strongId = entry.strong_number;
    const kjvStrongs = bibleData?.kjv_strongs;
    const almeidaRC = bibleData?.almeida_rc;

    if (!strongId || !Array.isArray(kjvStrongs) || !Array.isArray(almeidaRC)) return found;

    const strongRegex = new RegExp(`[<{]${strongId}[>}]`);

    for (const verse of kjvStrongs) {
      if (!verse?.text) continue;
      if (!strongRegex.test(verse.text)) continue;

      const almeidaVerse = almeidaRC.find(
        (v) =>
          v.book_abbrev === verse.book_abbrev &&
          Number(v.chapter) === Number(verse.chapter) &&
          Number(v.verse) === Number(verse.verse)
      );

      found.push({
        ref: `${verse.book_abbrev} ${verse.chapter}:${verse.verse}`,
        text_kjv: verse.text || '',
        text_arc: almeidaVerse?.text || ''
      });
    }

    return found;
  }, [entry, bibleData]);

  if (!entry) return null;

  return (
    <div className="p-6 bg-card rounded-2xl shadow-card border border-slate-100">
      <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-brand-600 hover:text-brand-800 font-semibold">
        <span>←</span>
        Voltar
      </button>
      
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-brand-900">{entry.lemma}</h2>
        <p className="text-lg text-slate-500">{entry.translit}</p>
        <p className="text-sm text-slate-400">Strongs: {entry.strong_number}</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-brand-800">Definição (Strongs):</h3>
          <p className="text-slate-600 italic pl-4 border-l-2 border-brand-100">{entry.strongs_def}</p>
        </div>
        <div>
          <h3 className="font-bold text-lg text-brand-700">Tradução (IA):</h3>
          <p className="text-brand-700 pl-4 border-l-2 border-brand-100">{translation}</p>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="font-bold text-xl text-slate-800 mb-4">Ocorrências na Bíblia ({references.length})</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {references.map((ref, index) => (
            <div key={index} className="border-b pb-2">
              <p className="font-semibold text-slate-700">{ref.ref}</p>
              <p className="text-slate-600 pl-4 border-l-2 border-slate-200"> <span className="font-bold text-xs text-slate-400">KJV:</span> {ref.text_kjv}</p>
              <p className="text-blue-600 pl-4 border-l-2 border-blue-200"> <span className="font-bold text-xs text-blue-400">ARC:</span> {ref.text_arc}</p>
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__DICT_SAMPLE = {
      greekSample: greekDict ? Object.keys(greekDict).slice(0, 10) : null,
      hebrewSample: hebrewDict ? Object.keys(hebrewDict).slice(0, 10) : null
    };
    console.log('DEBUG Dictionary props:', { greekDict, hebrewDict, bibleData });
  }, [greekDict, hebrewDict, bibleData]);

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
  
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = term.trim();
    updateResults(trimmed);
    if (trimmed) {
      recordSearchTerm(searchIn, trimmed);
    }
  };
  
  useEffect(() => {
    updateResults();
  }, [updateResults]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, results]);

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const dictionaryLabel = searchIn === 'greek' ? 'grego' : 'hebraico';

  const switchDictionary = (type) => {
    if (searchIn === type) return;
    setSearchIn(type);
    setSelectedEntry(null);
    setTerm('');
    updateResults('');
  };

  const handleClear = () => {
    setTerm('');
    updateResults('');
  };

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => {
      if (direction === 'prev') return Math.max(1, prev - 1);
      if (direction === 'next') return Math.min(totalPages, prev + 1);
      return prev;
    });
  };

  if (!greekDict && !hebrewDict) {
    return <div style={{ padding: 20 }}>Dicionários ausentes no componente Dictionary. Ver Console.</div>;
  }

  return (
    <section className="bg-card rounded-2xl shadow-card border border-slate-100 p-6 sm:p-8 min-h-[70vh] flex flex-col gap-8">
      {selectedEntry ? (
        <EntryDetailView
          entry={selectedEntry}
          bibleData={bibleData}
          onBack={() => setSelectedEntry(null)}
        />
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchDictionary('greek')}
                className={`px-4 py-2 rounded-full border transition font-semibold ${
                  searchIn === 'greek'
                    ? 'text-white border-transparent shadow-lg'
                    : 'border-slate-200 text-brand-700 hover:border-brand-300 bg-white'
                }`}
                style={
                  searchIn === 'greek'
                    ? { backgroundColor: 'var(--color-brand, #1d4ed8)' }
                    : undefined
                }
              >
                Grego
              </button>
              <button
                type="button"
                onClick={() => switchDictionary('hebrew')}
                className={`px-4 py-2 rounded-full border transition font-semibold ${
                  searchIn === 'hebrew'
                    ? 'text-white border-transparent shadow-lg'
                    : 'border-slate-200 text-brand-700 hover:border-brand-300 bg-white'
                }`}
                style={
                  searchIn === 'hebrew'
                    ? { backgroundColor: 'var(--color-brand, #1d4ed8)' }
                    : undefined
                }
              >
                Hebraico
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Procure por número Strong, lema ou definição"
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 bg-surface focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition"
              >
                Buscar
              </button>
              {term && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:border-slate-400"
                >
                  Limpar
                </button>
              )}
            </form>
          </div>

          <div className="text-sm text-slate-500">
            {results.length
              ? `Encontradas ${results.length.toLocaleString()} palavras no dicionário ${dictionaryLabel}.`
              : `Nenhuma palavra encontrada no dicionário ${dictionaryLabel}.`}
          </div>

          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-surface">
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
              {paginatedResults.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Digite um termo para começar a pesquisar ou tente outro filtro.
                </div>
              ) : (
                paginatedResults.map((entry) => (
                  <button
                    key={entry.strong_number}
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full text-left p-4 hover:bg-brand-50/80 transition flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span className="font-semibold uppercase tracking-wide text-brand-800">
                        {entry.lemma || '—'}
                      </span>
                      <span className="text-xs font-mono bg-white text-brand-700 px-2 py-1 rounded-md border border-brand-100">
                        {entry.strong_number}
                      </span>
                    </div>
                    {entry.translit && (
                      <p className="text-xs text-slate-400">{entry.translit}</p>
                    )}
                    {entry.strongs_def && (
                      <p className="text-sm text-slate-600">
                        {entry.strongs_def}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {results.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between text-sm text-slate-500">
              <button
                type="button"
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Anterior
              </button>
              <span>
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange('next')}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Ensure the main component is exported as default
export default Dictionary;
