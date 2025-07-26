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
@@ -104,51 +100,56 @@ const EntryDetailView = ({ entry, bibleData, onBack }) => {
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