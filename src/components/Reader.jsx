import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BOOKS, VERSIONS } from '../data';
import { recordStreak } from '../utils/streakService';
import { appendReadingHistory } from '../utils/activitiesService';
import { isAuth0Configured } from '../config/auth0';

// --- Sub-componente para o Pop-up de Partilha ---
const SharePopup = ({ text, position, onShare }) => {
  if (!text) return null;

  // Função para evitar que o clique no botão desfaça a seleção de texto
  const handleMouseDown = (e) => {
    e.preventDefault(); 
  };
  
  return (
    <div
      className="absolute z-10"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -120%)' }}
      onMouseDown={handleMouseDown}
    >
      <button 
        onClick={onShare} 
        className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm hover:bg-slate-700 transition-colors"
      >
        Partilhar
      </button>
    </div>
  );
};


const HIGHLIGHTS_STORAGE_KEY = 'verseHighlights';
const buildVerseKey = (bookAbbrev, chapterNumber, verseNumber) =>
  `${bookAbbrev}-${chapterNumber}-${verseNumber}`;

function Reader({ bibleData, initialChapter, setInitialChapter, onStreakRecorded, isFocused = false, onToggleFocus }) {
  const [viewMode, setViewMode] = useState('single'); // 'single' ou 'compare'
  const [version1, setVersion1] = useState('almeida_rc');
  const [version2, setVersion2] = useState('kjv');
  const [book, setBook] = useState('gn');
  const [chapter, setChapter] = useState('1');
  
  // Estados para o pop-up de partilha
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const readerRef = useRef(null); // Ref para a área de leitura
  const lastStreakUpdateRef = useRef(null);
  const lastHistoryEntryRef = useRef(null);
  const auth = isAuth0Configured ? useAuth0() : { isAuthenticated: false, user: null };
  const { isAuthenticated, user } = auth;
  const [highlightedVerses, setHighlightedVerses] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

    useEffect(() => {
    if (initialChapter) {
      setBook(initialChapter.bookAbbrev);
      setChapter(String(initialChapter.chapter));
      setInitialChapter(null);
    }
  }, [initialChapter, setInitialChapter]);

  useEffect(() => {
    const entry = {
      bookAbbrev: book,
      bookName: BOOKS.find((b) => b.abbrev === book).name_pt,
      chapter,
      timestamp: Date.now(),
    };
    let history = JSON.parse(localStorage.getItem('readingHistory')) || [];
    history = history.filter(
      (h) => !(h.bookAbbrev === book && String(h.chapter) === String(chapter))
    );
    history.unshift(entry);
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('readingHistory', JSON.stringify(history));

    const trySyncHistory = async () => {
      if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
      const entryKey = `${entry.bookAbbrev}-${entry.chapter}`;
      if (lastHistoryEntryRef.current === entryKey) return;
      try {
        await appendReadingHistory(user.sub, {
          bookAbbrev: entry.bookAbbrev,
          bookName: entry.bookName,
          chapter: entry.chapter,
          timestamp: entry.timestamp
        });
        lastHistoryEntryRef.current = entryKey;
      } catch (err) {
        console.error('Falha ao sincronizar histórico:', err);
      }
    };

    const tryRecordStreak = async () => {
      if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
      const todayKey = new Date().toISOString().slice(0, 10);
      if (lastStreakUpdateRef.current === todayKey) return;

      try {
        await recordStreak(user.sub);
        lastStreakUpdateRef.current = todayKey;
        if (typeof onStreakRecorded === 'function') {
          onStreakRecorded();
        }
      } catch (err) {
        console.error('Falha ao registrar streak:', err);
      }
    };

    trySyncHistory();
    tryRecordStreak();
  }, [book, chapter, isAuthenticated, user?.sub, onStreakRecorded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(highlightedVerses));
    } catch (err) {
      console.warn('Não foi possível guardar destaques:', err);
    }
  }, [highlightedVerses]);

  const selectedBookInfo = useMemo(() => BOOKS.find((b) => b.abbrev === book), [book]);
  
  const chapterContent1 = useMemo(() => {
    return bibleData[version1]?.filter(v => v.book_abbrev === book && Number(v.chapter) === Number(chapter)) || [];
  }, [version1, book, chapter, bibleData]);

  const chapterContent2 = useMemo(() => {
    if (viewMode === 'single') return [];
    return bibleData[version2]?.filter(v => v.book_abbrev === book && Number(v.chapter) === Number(chapter)) || [];
  }, [version2, book, chapter, bibleData, viewMode]);

  const handleBookChange = (e) => {
    setBook(e.target.value);
    setChapter('1');
  };

  // Lógica para capturar a seleção de texto
  const handleMouseUp = () => {
    // Timeout para garantir que o evento de clique não limpe a seleção antes de ser processado
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text.length > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const containerRect = readerRef.current.getBoundingClientRect();
          
          setSelectedText(text);
          setPopupPosition({
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top - containerRect.top,
          });
        } else {
          setSelectedText('');
        }
    }, 10);
  };

  const handleShare = async () => {
    const textToShare = `"${selectedText}" (${selectedBookInfo.name_pt} - Bíblia App)`;
    if (navigator.share) {
      await navigator.share({ title: 'Trecho da Bíblia', text: textToShare });
    } else {
      await navigator.clipboard.writeText(textToShare);
      alert('Texto copiado para a área de transferência!');
    }
    setSelectedText(''); // Esconde o pop-up após partilhar/copiar
    window.getSelection().removeAllRanges(); // Limpa a seleção azul
  };

  const goToNextChapter = () => {
    const currentBook = BOOKS.find((b) => b.abbrev === book);
    if (!currentBook) return;
    const currentChapter = Number(chapter);
    if (currentChapter < currentBook.chapters) {
      setChapter(String(currentChapter + 1));
      return;
    }
    const currentIndex = BOOKS.findIndex((b) => b.abbrev === book);
    const nextIndex = (currentIndex + 1) % BOOKS.length;
    setBook(BOOKS[nextIndex].abbrev);
    setChapter('1');
  };

  const toggleHighlight = (verseNumber) => {
    const verseKey = buildVerseKey(book, chapter, verseNumber);
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      if (next[verseKey]) {
        delete next[verseKey];
      } else {
        next[verseKey] = true;
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 relative" onMouseUp={handleMouseUp} ref={readerRef}>
      <SharePopup text={selectedText} position={popupPosition} onShare={handleShare} />
      {typeof onToggleFocus === 'function' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onToggleFocus}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${isFocused ? 'border-slate-900 bg-slate-900 text-white hover:bg-black' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
          >
            {isFocused ? 'Sair do modo imersivo' : 'Modo imersivo'}
          </button>
        </div>
      )}
      
      {/* Controles de Seleção */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        {/* Seletor de Modo de Visualização */}
        <div className="flex justify-center mb-4">
            <div className="bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setViewMode('single')} className={`px-4 py-1 rounded-md font-semibold ${viewMode === 'single' ? 'bg-white shadow' : 'text-slate-600'}`}>Simples</button>
                <button onClick={() => setViewMode('compare')} className={`px-4 py-1 rounded-md font-semibold ${viewMode === 'compare' ? 'bg-white shadow' : 'text-slate-600'}`}>Comparar</button>
            </div>
        </div>

        <div className={`grid grid-cols-1 ${viewMode === 'compare' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
          <select value={version1} onChange={(e) => setVersion1(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
            {VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {viewMode === 'compare' && (
            <select value={version2} onChange={(e) => setVersion2(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
              {VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <select value={book} onChange={handleBookChange} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
            {BOOKS.map((b) => <option key={b.abbrev} value={b.abbrev}>{b.name_pt}</option>)}
          </select>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
            {selectedBookInfo && Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={goToNextChapter}
            className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-black transition"
          >
            Próximo capítulo
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Conteúdo do Capítulo */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">{selectedBookInfo?.name_pt} {chapter}</h2>
        <div className={`grid ${viewMode === 'compare' ? 'grid-cols-1 md:grid-cols-2 gap-8' : 'grid-cols-1'}`}>
            {/* Coluna 1 */}
            <div className="space-y-4 text-lg">
                {chapterContent1.map((v) => {
                    const verseKey = buildVerseKey(book, chapter, v.verse);
                    const isHighlighted = Boolean(highlightedVerses[verseKey]);
                    return (
                        <div
                          key={v.verse}
                          className={`rounded-2xl border px-3 py-2 transition ${isHighlighted ? 'border-yellow-200 bg-yellow-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-start gap-3">
                            <p className="text-gray-700 leading-relaxed flex-1">
                              <span className="font-bold text-blue-600 pr-2">{v.verse}</span>
                              {v.text}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleHighlight(v.verse)}
                              className={`text-xs font-semibold rounded-full px-3 py-1 border transition ${isHighlighted ? 'border-yellow-400 text-yellow-700 bg-yellow-100' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}
                            >
                              {isHighlighted ? 'Remover' : 'Destacar'}
                            </button>
                          </div>
                        </div>
                    );
                })}
            </div>
            {/* Coluna 2 (Apenas no modo Comparar) */}
            {viewMode === 'compare' && (
                <div className="space-y-4 text-lg border-l border-slate-200 pl-8">
                    {chapterContent2.map((v) => {
                        const verseKey = buildVerseKey(book, chapter, v.verse);
                        const isHighlighted = Boolean(highlightedVerses[verseKey]);
                        return (
                          <div
                            key={v.verse}
                            className={`rounded-2xl border px-3 py-2 transition ${isHighlighted ? 'border-yellow-200 bg-yellow-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                          >
                            <div className="flex items-start gap-3">
                              <p className="text-gray-700 leading-relaxed flex-1">
                                <span className="font-bold text-green-600 pr-2">{v.verse}</span>
                                {v.text}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleHighlight(v.verse)}
                                className={`text-xs font-semibold rounded-full px-3 py-1 border transition ${isHighlighted ? 'border-yellow-400 text-yellow-700 bg-yellow-100' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}
                              >
                                {isHighlighted ? 'Remover' : 'Destacar'}
                              </button>
                            </div>
                          </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Reader;
