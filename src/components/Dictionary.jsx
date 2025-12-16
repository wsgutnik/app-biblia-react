import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { translateText } from '../utils/translate';
import { recordSearchTerm } from '../utils/trackingService';
import { BOOKS, VERSIONS } from '../data';

const DICTIONARY_LOOKUP_STORAGE_KEY = 'lastDictionaryLookup';
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

// --- Componente Principal do Dicionário (com paginação, busca e análise lexical) ---
function Dictionary({ greekDict, hebrewDict, bibleData }) {
  const [term, setTerm] = useState('');
  const [searchIn, setSearchIn] = useState('greek');
  const [results, setResults] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lexiconData, setLexiconData] = useState(null);
  const [lexiconError, setLexiconError] = useState('');
  const [lexiconLoading, setLexiconLoading] = useState(false);
  const ITEMS_PER_PAGE = 100;

  const greekEntries = useMemo(() => {
    if (!greekDict) return [];
    return Object.entries(greekDict).map(([strong_number, entryData]) => ({
      ...entryData,
      strong_number,
      translit: entryData.translit || entryData.xlit || ''
    }));
  }, [greekDict]);

  const hebrewEntries = useMemo(() => {
    if (!hebrewDict) return [];
    return Object.entries(hebrewDict).map(([strong_number, entryData]) => ({
      ...entryData,
      strong_number,
      translit: entryData.translit || entryData.xlit || ''
    }));
  }, [hebrewDict]);

  const processedDictionary = useMemo(
    () => (searchIn === 'greek' ? greekEntries : hebrewEntries),
    [searchIn, greekEntries, hebrewEntries]
  );

  const versionLabelMap = useMemo(() => {
    return VERSIONS.reduce((acc, version) => {
      if (version?.id) acc[version.id] = version.name || version.id;
      return acc;
    }, {});
  }, []);

  const updateResults = useCallback(
    (searchTerm = '', sourceEntries) => {
      const dictionarySource = sourceEntries || processedDictionary;
      let filteredEntries = dictionarySource;
      if (searchTerm) {
        const lowerCaseTerm = searchTerm.toLowerCase();
        const englishTerm = PT_TO_EN_MAP[lowerCaseTerm];
        filteredEntries = dictionarySource.filter((entry) => {
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

  useEffect(() => {
    updateResults();
  }, [updateResults]);

  const getVerseFromData = useCallback((collection, payload) => {
    if (!Array.isArray(collection)) return null;
    return collection.find(
      (entry) =>
        entry.book_abbrev === payload.bookAbbrev &&
        Number(entry.chapter) === Number(payload.chapter) &&
        Number(entry.verse) === Number(payload.verse)
    );
  }, []);

  const parseStrongText = (text = '') => {
    const regex = /([^{}]*?)\{([HG][0-9a-zA-Z]+)\}/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const phrase = match[1]?.trim();
      const strongId = match[2]?.toUpperCase();
      if (strongId) {
        tokens.push({ word: phrase || `[${strongId}]`, strong: strongId });
      }
    }
    return tokens;
  };

  const buildLexicon = useCallback(
    (payload) => {
      if (!payload?.bookAbbrev || !payload?.chapter || !payload?.verse) {
        throw new Error('Referência incompleta para análise lexical.');
      }
      if (!bibleData?.kjv_strongs) {
        throw new Error('Versão KJV com Strong ainda não foi carregada.');
      }
      const bookInfo = BOOKS.find((bookItem) => bookItem.abbrev === payload.bookAbbrev);
      if (!bookInfo) {
        throw new Error('Livro bíblico não reconhecido.');
      }
      const testament = payload.testament || (bookInfo.num <= 39 ? 'ot' : 'nt');
      if (testament === 'ot' && !hebrewDict) {
        throw new Error('Dicionário hebraico não está disponível.');
      }
      if (testament === 'nt' && !greekDict) {
        throw new Error('Dicionário grego não está disponível.');
      }

      const kjvVerse = getVerseFromData(bibleData.kjv_strongs, payload);
      if (!kjvVerse) {
        throw new Error('Não foi possível localizar o versículo na KJV com Strong.');
      }
      const versionId = payload.versionId && bibleData?.[payload.versionId] ? payload.versionId : 'kjv';
      const targetVerse = getVerseFromData(bibleData[versionId] || [], payload);

      const tokens = parseStrongText(kjvVerse.text);
      if (!tokens.length) {
        throw new Error('O versículo selecionado não possui marcações de Strong disponíveis.');
      }

      const entries = tokens.map((token) => {
        const dictSource = token.strong.startsWith('H') ? hebrewDict : greekDict;
        const dictEntry = dictSource?.[token.strong] || null;
        return {
          word: token.word,
          strong: token.strong,
          lemma: dictEntry?.lemma || '',
          translit: dictEntry?.translit || dictEntry?.xlit || '',
          definition: dictEntry?.strongs_def || '',
          dictionaryEntry: dictEntry
            ? { ...dictEntry, strong_number: token.strong, translit: dictEntry.translit || dictEntry.xlit || '' }
            : null
        };
      });

      return {
        meta: {
          reference: `${bookInfo.name_pt} ${payload.chapter}:${payload.verse}`,
          testament,
          versionId,
          versionName: versionLabelMap[versionId] || versionId,
          versionText: targetVerse?.text || '',
          kjvText: kjvVerse.text
        },
        entries
      };
    },
    [bibleData, getVerseFromData, greekDict, hebrewDict, versionLabelMap]
  );

  const clearLexiconData = useCallback(() => {
    setLexiconData(null);
    setLexiconError('');
    setLexiconLoading(false);
  }, []);

  const applyLookupPayload = useCallback(
    (payload) => {
      if (!payload) return;
      if (typeof payload === 'string') {
        clearLexiconData();
        setTerm(payload);
        updateResults(payload);
        return;
      }
      if (payload?.term) {
        clearLexiconData();
        if (payload.language === 'hebrew' || payload.language === 'greek') {
          setSearchIn(payload.language);
        }
        setTerm(payload.term);
        updateResults(payload.term);
        return;
      }

      if (payload.bookAbbrev && payload.chapter && payload.verse) {
        setSelectedEntry(null);
        setLexiconLoading(true);
        setLexiconError('');
        try {
          const lexicon = buildLexicon(payload);
          setLexiconData(lexicon);
          const dictionaryType = lexicon.meta.testament === 'ot' ? 'hebrew' : 'greek';
          setSearchIn(dictionaryType);
          updateResults('', dictionaryType === 'hebrew' ? hebrewEntries : greekEntries);
        } catch (err) {
          setLexiconError(err.message || 'Falha ao montar análise lexical.');
          setLexiconData(null);
        } finally {
          setLexiconLoading(false);
        }
      }
    },
    [buildLexicon, clearLexiconData, updateResults, hebrewEntries, greekEntries]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleLookup = (event) => {
      const detail = event.detail;
      if (detail) {
        applyLookupPayload(detail);
        try {
          const payloadToStore =
            typeof detail === 'string' ? detail : JSON.stringify(detail);
          window.localStorage.setItem(DICTIONARY_LOOKUP_STORAGE_KEY, payloadToStore);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('dictionary:lookup', handleLookup);
    const stored = window.localStorage.getItem(DICTIONARY_LOOKUP_STORAGE_KEY);
    if (stored) {
      let payload = stored;
      if (stored.trim().startsWith('{')) {
        try {
          payload = JSON.parse(stored);
        } catch {
          payload = stored;
        }
      }
      applyLookupPayload(payload);
    }
    return () => window.removeEventListener('dictionary:lookup', handleLookup);
  }, [applyLookupPayload]);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = term.trim();
    clearLexiconData();
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
    clearLexiconData();
    updateResults('');
  };

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => {
      if (direction === 'prev') return Math.max(1, prev - 1);
      if (direction === 'next') return Math.min(totalPages, prev + 1);
      return prev;
    });
  };

  const handleLexiconStrongSelect = (entry) => {
    if (!entry?.dictionaryEntry) return;
    setSelectedEntry({
      ...entry.dictionaryEntry,
      strong_number: entry.dictionaryEntry.strong_number || entry.strong
    });
  };

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, results]);

  const totalPages = Math.max(1, Math.ceil(results.length / ITEMS_PER_PAGE));
  const dictionaryLabel = searchIn === 'greek' ? 'grego' : 'hebraico';

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
          {lexiconData && (
            <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-inner space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-brand-500">Análise lexical</p>
                  <h3 className="text-xl font-semibold text-slate-900">{lexiconData.meta.reference}</h3>
                  <p className="text-sm text-slate-500">
                    {lexiconData.meta.versionName}: {lexiconData.meta.versionText || 'Não disponível'}
                  </p>
                  <p className="text-xs text-slate-400 italic">
                    KJV+Strongs: {lexiconData.meta.kjvText}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400"
                  onClick={clearLexiconData}
                >
                  Limpar análise
                </button>
              </div>
              {lexiconLoading ? (
                <div className="py-6 text-center text-slate-500">Carregando análise lexical...</div>
              ) : lexiconError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {lexiconError}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-4">Segmento (KJV)</th>
                        <th className="py-2 pr-4">Strong</th>
                        <th className="py-2 pr-4">Lema / Transliteração</th>
                        <th className="py-2">Definição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lexiconData.entries.map((entry, index) => (
                        <tr key={`${entry.strong}-${index}`} className="border-t border-slate-100">
                          <td className="py-2 pr-4 font-semibold text-slate-800">{entry.word}</td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => handleLexiconStrongSelect(entry)}
                              className="rounded-full border border-brand-200 px-3 py-1 text-xs font-mono text-brand-700 hover:border-brand-400"
                            >
                              {entry.strong}
                            </button>
                          </td>
                          <td className="py-2 pr-4">
                            <div className="font-semibold text-slate-800">{entry.lemma || '—'}</div>
                            {entry.translit && (
                              <div className="text-xs text-slate-500">{entry.translit}</div>
                            )}
                          </td>
                          <td className="py-2 text-slate-600">{entry.definition || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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

export default Dictionary;
=======
  // Se o usuário selecionou uma língua específica e esse dicionário ainda não carregou
  if (searchIn === 'greek' && !greekDict) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Carregando dicionário grego…</p>
      </div>
    );
  }

  if (searchIn === 'hebrew' && !hebrewDict) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Carregando dicionário hebraico…</p>
      </div>
    );
  }

  // Caso contrário, o dicionário está carregado (ou ao menos o selecionado) — o resto do componente renderizará normalmente abaixo
}

export default Dictionary;
>>>>>>> Stashed changes
