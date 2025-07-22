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
        const prompt = `Traduza o seguinte texto teológico do inglês para o português brasileiro, mantendo o sentido original de forma concisa: "${entry.strongs_def}"`;
        
        // Chamada para a API da Máquina (Gemini)
        const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiKey = ""; // A chave é fornecida pelo ambiente
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            setTranslation(result.candidates[0].content.parts[0].text);
        } else {
            throw new Error('Resposta da API inválida.');
        }

      } catch (error) {
        console.error("Erro de tradução:", error);
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
        const bookInfo = BOOKS.find(b => b.abbrev === verse.book_abbrev);
        
        // Agora, encontra o mesmo versículo na Almeida RC
        const almeidaVerse = almeidaRC.find(v => 
            v.book_abbrev === verse.book_abbrev && 
            v.chapter === verse.chapter && 
            v.verse === verse.verse
        );

        found.push({
          key: `${verse.book_abbrev}-${verse.chapter}-${verse.verse}`,
          ref: `${bookInfo ? bookInfo.name_pt : verse.book_abbrev} ${verse.chapter}:${verse.verse}`,
          text_kjv: verse.text.replace(/<[GH]\d+>|\{[GH]\d+\}|\([GH]\d+\)/g, ''),
          text_arc: almeidaVerse ? almeidaVerse.text : "Versículo não encontrado na ARC."
        });
      }
    }
    return found;
  }, [entry, bibleData]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
      <button onClick={onBack} className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Voltar à Pesquisa
      </button>

      <div className="border-b border-slate-200 pb-4 mb-4">
        <h2 className="text-3xl font-bold text-slate-800">{entry.lemma}</h2>
        <p className="text-lg text-slate-600">{entry.translit}</p>
        <p className="mt-1 font-semibold text-blue-700">{entry.strong_number}</p>
        <p className="mt-4 text-gray-700 leading-relaxed text-lg">{entry.strongs_def}</p>
        {/* Exibe a tradução */}
        <p className="mt-2 text-blue-800 bg-blue-50 p-2 rounded-md leading-relaxed text-lg italic">{translation}</p>
      </div>

      <div>
        <h3 className="font-bold text-slate-800 text-xl mb-3">Concordância ({references.length})</h3>
        <div className="max-h-96 overflow-y-auto pr-2 space-y-4">
          {references.map((ref) => (
            <div key={ref.key}>
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
    return Object.entries(dict).map(([strong_number, entryData]) => ({ ...entryData, strong_number }));
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
  
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

  if (selectedEntry) {
    return <EntryDetailView entry={selectedEntry} bibleData={bibleData} onBack={() => setSelectedEntry(null)} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <form onSubmit={handleSearch}>
          <div className="flex justify-center space-x-4 mb-4">
            <button type="button" onClick={() => setSearchIn('greek')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${searchIn === 'greek' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Grego</button>
            <button type="button" onClick={() => setSearchIn('hebrew')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${searchIn === 'hebrew' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>Hebraico</button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <input type="text" value={term} onChange={e => setTerm(e.target.value)} placeholder={`Buscar no Dicionário ${searchIn === 'greek' ? 'Grego' : 'Hebraico'}...`} className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700">Buscar</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <p className="text-sm font-medium text-gray-600">{results.length} resultado(s) no total.</p>
        </div>
        <ul className="divide-y divide-slate-200 min-h-[40rem]">
          {paginatedResults.map((entry) => (
            <li key={entry.strong_number} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedEntry(entry)}>
              <h3 className="font-bold text-blue-700 text-lg">{entry.lemma} ({entry.translit}) - {entry.strong_number}</h3>
              <p className="mt-1 text-gray-700 leading-relaxed">{entry.strongs_def}</p>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex justify-between items-center">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
            <span className="font-semibold text-slate-600">Página {currentPage} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Próximo</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dictionary;
