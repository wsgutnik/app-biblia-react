import React, { useState, useEffect, useMemo } from 'react';
import { BOOKS } from '../data';

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
        const response = await fetch("https://libretranslate.de/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: entry.strongs_def,
            source: "en",
            target: "pt",
            format: "text"
          })
        });

        if (!response.ok) {
          throw new Error(`Erro na API: ${response.statusText}`);
        }

        const result = await response.json();

        if (result && result.translatedText) {
          setTranslation(result.translatedText);
        } else {
          throw new Error("Resposta da API inválida.");
        }
      } catch (error) {
        console.error("Erro de tradução:", error);
        setTranslation("Não foi possível traduzir a definição.");
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
        const bookInfo = BOOKS.find(b => b.abbrev === verse.book_abbrev);
        
        // Agora, encontra o mesmo versículo na Almeida RC
        const almeidaVerse = almeidaRC.find(v => 
            v.book_abbrev === verse.book_abbrev && 
            v.chapter === verse.chapter && 
            v.verse === verse.verse
        );

        if (bookInfo && almeidaVerse) {
          found.push({
            ref: `${bookInfo.name} ${verse.chapter}:${verse.verse}`,
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
      <button onClick={onBack} className="mb-4 text-blue-600 hover:underline">← Voltar</button>
      
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

  const ptToEnMap = { 'amor': 'love', 'fé': 'faith', 'deus': 'god', 'senhor': 'lord', 'espírito': 'spirit', 'salvação': 'salvation', 'graça': 'grace', 'pecado': 'sin', 'justiça': 'righteousness', 'coração': 'heart', 'palavra': 'word', 'luz': 'light', 'vida': 'life', 'morte': 'death' };

  const processedDictionary = useMemo(() => {
    const dict = searchIn === 'greek' ? greekDict : hebrewDict;
    if (!dict) return [];
    return Object.entries(dict).map(([strong_number, entryData]) => ({
      ...entryData,
      strong_number,
      translit: entryData.translit || entryData.xlit || ''
    }));
  }, [searchIn, greekDict, hebrewDict]);

  const updateResults = (searchTerm = '') => {
    let filteredEntries = processedDictionary;
    if (searchTerm) {
      const lowerCaseTerm = searchTerm.toLowerCase();
      const englishTerm = ptToEnMap[lowerCaseTerm];
      filteredEntries = processedDictionary.filter(entry => {
        const def = entry.strongs_def?.toLowerCase() || '';
        const definitionMatch = englishTerm ? def.includes(englishTerm) || def.includes(lowerCaseTerm) : def.includes(lowerCaseTerm);
        return entry.strong_number?.toLowerCase().includes(lowerCaseTerm) || entry.lemma?.toLowerCase().includes(lowerCaseTerm) || entry.translit?.toLowerCase().includes(lowerCaseTerm) || definitionMatch;
      });
    }
    setResults(filteredEntries);
    setCurrentPage(1);
  };
  
  const handleSearch = (e) => { e.preventDefault(); updateResults(term); };
  
  useEffect(() => { updateResults(); }, [processedDictionary]);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, results]);

  if (selectedEntry) {
    return (
      <EntryDetailView
        entry={selectedEntry}
        bibleData={bibleData}
        onBack={() => setSelectedEntry(null)}
      />
    );
  }

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar palavra ou número Strong"
            className="grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={searchIn}
            onChange={(e) => setSearchIn(e.target.value)}
            className="w-full sm:w-auto p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="greek">Grego</option>
            <option value="hebrew">Hebraico</option>
          </select>
          <button
            type="submit"
            className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Buscar
          </button>
        </form>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <p className="text-sm font-medium text-gray-600">
              {results.length} resultados encontrados.
            </p>
          </div>
          <ul className="divide-y divide-slate-200 max-h-128 overflow-y-auto">
            {paginatedResults.map((entry) => (
              <li
                key={entry.strong_number}
                className="p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <p className="font-bold text-blue-700">
                  {entry.lemma} ({entry.translit})
                </p>
                <p className="text-sm text-slate-500">
                  Strongs: {entry.strong_number}
                </p>
                {entry.strongs_def && (
                  <p className="mt-1 text-gray-700 leading-relaxed">
                    {entry.strongs_def}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {results.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dictionary;