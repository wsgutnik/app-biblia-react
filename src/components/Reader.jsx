import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { BOOKS, VERSIONS } from '../data';
import { recordStreak } from '../utils/streakService';
import { appendReadingHistory } from '../utils/activitiesService';
import { isAuth0Configured } from '../config/auth0';
import { saveLastReading } from '../utils/profileService';
import { API_PREFIX, authorizedJsonFetch } from '../utils/apiClient';

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
const DICTIONARY_LOOKUP_STORAGE_KEY = 'lastDictionaryLookup';
const buildVerseKey = (bookAbbrev, chapterNumber, verseNumber) =>
  `${bookAbbrev}-${chapterNumber}-${verseNumber}`;

const HIGHLIGHT_OPTIONS = [
  { id: 'sun', label: 'Amarelo', background: '#fff7c2', accent: '#facc15' },
  { id: 'sky', label: 'Azul', background: '#d7f0ff', accent: '#38bdf8' },
  { id: 'mint', label: 'Verde', background: '#dff8e3', accent: '#34d399' },
  { id: 'blush', label: 'Rosa', background: '#ffe3f0', accent: '#f472b6' },
  { id: 'lavender', label: 'Lilás', background: '#eee4ff', accent: '#c084fc' },
  { id: 'underline', label: 'Sublinhar', accent: '#94a3b8', variant: 'underline' }
];

const normalizeHighlightPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {};
  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value;
    } else if (value === true) {
      acc[key] = 'sun';
    }
    return acc;
  }, {});
};

function ReaderContent({
  bibleData,
  initialChapter,
  setInitialChapter,
  onStreakRecorded,
  isFocused = false,
  onToggleFocus,
  auth
}) {
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
  const lastSavedReadingRef = useRef(null);
  const { isAuthenticated, user } = auth ?? { isAuthenticated: false, user: null };
  const [highlightedVerses, setHighlightedVerses] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      return raw ? normalizeHighlightPayload(JSON.parse(raw)) : {};
    } catch {
      return {};
    }
  });
  const [activePalette, setActivePalette] = useState(null);
  const lastSyncedHighlightsRef = useRef(null);

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

    const syncLastReading = async () => {
      if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
      const key = `${book}-${chapter}-${version1}`;
      if (lastSavedReadingRef.current === key) return;
      try {
        await saveLastReading(user.sub, {
          bookAbbrev: book,
          bookName: entry.bookName,
          chapter: Number(chapter),
          versionId: version1
        });
        lastSavedReadingRef.current = key;
      } catch (err) {
        console.error('Falha ao salvar última leitura:', err);
      }
    };

    trySyncHistory();
    tryRecordStreak();
    syncLastReading();
  }, [book, chapter, isAuthenticated, user?.sub, onStreakRecorded, version1]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(highlightedVerses));
    } catch (err) {
      console.warn('Não foi possível guardar destaques:', err);
    }
  }, [highlightedVerses]);

  useEffect(() => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
    let isMounted = true;
    const loadHighlights = async () => {
      try {
        const result = await authorizedJsonFetch({
          path: `${API_PREFIX}/profile/highlights`,
          userSub: user.sub
        });
        if (!isMounted) return;
        const normalized = normalizeHighlightPayload(result?.highlights || {});
        setHighlightedVerses(normalized);
        lastSyncedHighlightsRef.current = JSON.stringify(normalized);
      } catch (err) {
        console.error('Falha ao carregar destaques remotos:', err);
      }
    };
    loadHighlights();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.sub]);

  useEffect(() => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) return;
    const serialized = JSON.stringify(highlightedVerses);
    if (lastSyncedHighlightsRef.current === serialized) return;
    let cancelled = false;
    const syncHighlights = async () => {
      try {
        await authorizedJsonFetch({
          path: `${API_PREFIX}/profile/highlights`,
          method: 'PUT',
          userSub: user.sub,
          body: JSON.stringify({ highlights: highlightedVerses })
        });
        if (!cancelled) {
          lastSyncedHighlightsRef.current = serialized;
        }
      } catch (err) {
        console.error('Falha ao sincronizar destaques:', err);
      }
    };
    syncHighlights();
    return () => {
      cancelled = true;
    };
  }, [highlightedVerses, isAuthenticated, user?.sub]);

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

  const handleVerseShare = async (verseNumber, verseText = '') => {
    const reference = `${selectedBookInfo?.name_pt || ''} ${chapter}:${verseNumber}`;
    const message = `${reference} — ${verseText.trim()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reference, text: message });
      } else {
        await navigator.clipboard.writeText(message);
        alert('Versículo copiado para partilha!');
      }
    } catch (err) {
      console.error('Falha ao partilhar versículo:', err);
    }
  };

  const isOldTestament = (selectedBookInfo?.num || 0) <= 39;

  const handleVerseLookup = (verseData) => {
    if (!verseData || typeof window === 'undefined') return;
    const payload = {
      bookAbbrev: book,
      bookName: selectedBookInfo?.name_pt || '',
      chapter: Number(chapter),
      verse: Number(verseData.verse),
      verseText: verseData.text,
      versionId: version1,
      testament: isOldTestament ? 'ot' : 'nt',
      timestamp: Date.now()
    };
    try {
      window.localStorage.setItem(DICTIONARY_LOOKUP_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage failures
    }
    window.dispatchEvent(new CustomEvent('dictionary:lookup', { detail: payload }));
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { tab: 'dictionary' } }));
  };

  const renderVerseColumn = (content, accentTone = 'brand') => {
    const paletteBorder =
      accentTone === 'emerald' ? 'border-emerald-200' : 'border-brand-200';

    const togglePalette = (verseKey) => {
      setActivePalette((prev) => (prev === verseKey ? null : verseKey));
    };

    return (
      <div className="rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-sm">
        <p className="text-base leading-relaxed text-slate-800">
          {content.map((v, index) => {
            const verseKey = buildVerseKey(book, chapter, v.verse);
            const highlightId = highlightedVerses[verseKey];
            const highlightOption = HIGHLIGHT_OPTIONS.find((opt) => opt.id === highlightId);
            const isUnderline = highlightOption?.variant === 'underline';
            const verseStyle =
              highlightOption && !isUnderline
                ? {
                    background: highlightOption.background,
                    boxShadow: `inset 0 -0.15em 0 ${highlightOption.accent}30`
                  }
                : {};
            const isPaletteOpen = activePalette === verseKey;

            return (
              <span key={v.verse} className="relative inline-block align-baseline">
                <button
                  type="button"
                  onClick={() => togglePalette(verseKey)}
                  className={`inline text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
                    isUnderline ? 'border-b border-dashed pb-[2px]' : 'rounded-2xl px-1'
                  }`}
                  style={verseStyle}
                  aria-label={`Abrir opções para o versículo ${v.verse}`}
                >
                  <span className="font-semibold text-slate-900">{v.verse}.</span>{' '}
                  {v.text.trim()}
                </button>
                {isPaletteOpen && (
                  <div
                    className={`absolute left-0 top-[calc(100%+0.35rem)] z-30 w-60 rounded-2xl border bg-white p-3 shadow-2xl ${paletteBorder}`}
                  >
                    <p className="text-xs font-semibold uppercase text-slate-400">Destaques</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {HIGHLIGHT_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => applyHighlight(v.verse, option.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white shadow-inner"
                          style={{
                            borderColor: option.accent,
                            background:
                              option.variant === 'underline' ? '#f8fafc' : option.background
                          }}
                          aria-label={`Aplicar ${option.label}`}
                        >
                          {option.variant === 'underline' ? (
                            <span
                              className="block h-[2px] w-4 rounded-full"
                              style={{ background: option.accent }}
                            />
                          ) : null}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => applyHighlight(v.verse, null)}
                        className="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Limpar
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerseShare(v.verse, v.text)}
                        className="flex-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      >
                        Compartilhar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('compare');
                          setActivePalette(null);
                        }}
                        className="flex-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      >
                        Comparar
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerseLookup(v)}
                      className="mt-2 w-full rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {isOldTestament ? 'Pesquisar no hebraico' : 'Pesquisar no grego'}
                    </button>
                  </div>
                )}
                {index < content.length - 1 && <span> </span>}
              </span>
            );
          })}
        </p>
      </div>
    );
  };

  const applyHighlight = (verseNumber, colorId) => {
    const verseKey = buildVerseKey(book, chapter, verseNumber);
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      if (!colorId) {
        delete next[verseKey];
      } else {
        next[verseKey] = colorId;
      }
      return next;
    });
    setActivePalette(null);
  };

  return (
    <div className="space-y-6 relative" onMouseUp={handleMouseUp} ref={readerRef}>
      <SharePopup text={selectedText} position={popupPosition} onShare={handleShare} />
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-white p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-4 py-1 text-xs font-semibold ${
                viewMode === 'single'
                  ? 'rounded-full bg-slate-900 text-white shadow'
                  : 'text-slate-500'
              }`}
            >
              Simples
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`px-4 py-1 text-xs font-semibold ${
                viewMode === 'compare'
                  ? 'rounded-full bg-slate-900 text-white shadow'
                  : 'text-slate-500'
              }`}
            >
              Comparar
            </button>
          </div>
          {typeof onToggleFocus === 'function' && (
            <button
              type="button"
              onClick={onToggleFocus}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                isFocused
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-700'
              }`}
            >
              {isFocused ? 'Modo padrão' : 'Modo imersivo'}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={version1}
            onChange={(e) => setVersion1(e.target.value)}
            className="w-full rounded-[22px] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {VERSIONS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            value={book}
            onChange={handleBookChange}
            className="w-full rounded-[22px] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {BOOKS.map((b) => (
              <option key={b.abbrev} value={b.abbrev}>
                {b.name_pt}
              </option>
            ))}
          </select>
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="w-full rounded-[22px] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {selectedBookInfo &&
              Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
          </select>
          {viewMode === 'compare' && (
            <select
              value={version2}
              onChange={(e) => setVersion2(e.target.value)}
              className="w-full rounded-[22px] border border-white/80 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={goToNextChapter}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-black"
          >
            Próximo capítulo
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/70 bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Leitura atual</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {selectedBookInfo?.name_pt} {chapter}
            </h2>
          </div>
          <div className="text-sm text-slate-500">
            {viewMode === 'compare'
              ? `${VERSIONS.find((v) => v.id === version1)?.name} × ${
                  VERSIONS.find((v) => v.id === version2)?.name
                }`
              : VERSIONS.find((v) => v.id === version1)?.name}
          </div>
        </div>

        <div
          className={`mt-6 grid gap-6 ${
            viewMode === 'compare' ? 'md:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {renderVerseColumn(chapterContent1, 'brand')}
          {viewMode === 'compare' && renderVerseColumn(chapterContent2, 'emerald')}
        </div>
      </div>
    </div>
  );
}

function ReaderWithAuth(props) {
  const auth = useAuth0();
  return <ReaderContent {...props} auth={auth} />;
}

export default function Reader(props) {
  if (!isAuth0Configured) {
    return <ReaderContent {...props} auth={null} />;
  }
  return <ReaderWithAuth {...props} />;
}
