import React, { useState, useEffect, useMemo } from 'react';
import { BOOKS, VERSIONS } from '../data';

function Reader({ bibleData }) {
  const [version, setVersion] = useState(VERSIONS[0].id);
  const [book, setBook] = useState('gn');
  const [chapter, setChapter] = useState('1');
  
  // O estado agora é um objeto simples que guarda os versículos destacados
  const [highlights, setHighlights] = useState({});

  // Carrega e salva os destaques no localStorage (exatamente como antes)
  useEffect(() => {
    const savedHighlights = JSON.parse(localStorage.getItem('bibleHighlights')) || {};
    setHighlights(savedHighlights);
  }, []);

  useEffect(() => {
    localStorage.setItem('bibleHighlights', JSON.stringify(highlights));
  }, [highlights]);
  
  const selectedBookInfo = useMemo(() => BOOKS.find((b) => b.abbrev === book), [book]);
  
  const chapterContent = useMemo(() => {
    return bibleData[version]?.filter(
      (verse) => verse.book_abbrev === book && Number(verse.chapter) === Number(chapter)
    ) || [];
  }, [version, book, chapter, bibleData]);

  const handleBookChange = (e) => {
    setBook(e.target.value);
    setChapter('1');
  };

  // NOVA LÓGICA: Clicar no versículo para adicionar ou remover o destaque
  const handleVerseClick = (verseNumber) => {
    const verseRef = `${version}_${book}_${chapter}_${verseNumber}`;
    
    setHighlights(prevHighlights => {
      const newHighlights = { ...prevHighlights };
      if (newHighlights[verseRef]) {
        // Se já está destacado, remove
        delete newHighlights[verseRef];
      } else {
        // Se não, adiciona
        newHighlights[verseRef] = true;
      }
      return newHighlights;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select value={version} onChange={(e) => setVersion(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">{VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
          <select value={book} onChange={handleBookChange} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">{BOOKS.map((b) => <option key={b.abbrev} value={b.abbrev}>{b.name_pt}</option>)}</select>
          <select value={chapter} onChange={(e) => setChapter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">{selectedBookInfo && Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map((c) => (<option key={c} value={c}>{c}</option>))}</select>
        </div>
      </div>

      {chapterContent.length > 0 ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">{selectedBookInfo.name_pt} {chapter}</h2>
          <div className="space-y-2 text-lg">
            {chapterContent.map((v) => {
              const verseRef = `${version}_${book}_${chapter}_${v.verse}`;
              const isHighlighted = highlights[verseRef];

              return (
                <div 
                  key={v.verse} 
                  className={`flex p-2 rounded-md cursor-pointer transition-colors ${isHighlighted ? 'bg-yellow-200' : 'hover:bg-slate-100'}`}
                  onClick={() => handleVerseClick(v.verse)}
                >
                  <span className="font-bold text-blue-600 pr-4 w-12 text-right">{v.verse}</span>
                  <p className="flex-1 text-gray-700 leading-relaxed">{v.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : ( <div className="bg-yellow-100 text-yellow-800 p-4 rounded-lg"><p>Não foi possível carregar o capítulo.</p></div> )}
    </div>
  );
}

export default Reader;