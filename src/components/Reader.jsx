import React, { useState, useMemo, useRef } from 'react';
import { BOOKS, VERSIONS } from '../data';

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


function Reader({ bibleData }) {
  const [viewMode, setViewMode] = useState('single'); // 'single' ou 'compare'
  const [version1, setVersion1] = useState('almeida_rc');
  const [version2, setVersion2] = useState('kjv');
  const [book, setBook] = useState('gn');
  const [chapter, setChapter] = useState('1');
  
  // Estados para o pop-up de partilha
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const readerRef = useRef(null); // Ref para a área de leitura

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

  return (
    <div className="space-y-6 relative" onMouseUp={handleMouseUp} ref={readerRef}>
      <SharePopup text={selectedText} position={popupPosition} onShare={handleShare} />
      
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
      </div>

      {/* Conteúdo do Capítulo */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">{selectedBookInfo?.name_pt} {chapter}</h2>
        <div className={`grid ${viewMode === 'compare' ? 'grid-cols-1 md:grid-cols-2 gap-8' : 'grid-cols-1'}`}>
            {/* Coluna 1 */}
            <div className="space-y-4 text-lg">
                {chapterContent1.map((v) => (
                    <p key={v.verse} className="text-gray-700 leading-relaxed"><span className="font-bold text-blue-600 pr-2">{v.verse}</span>{v.text}</p>
                ))}
            </div>
            {/* Coluna 2 (Apenas no modo Comparar) */}
            {viewMode === 'compare' && (
                <div className="space-y-4 text-lg border-l border-slate-200 pl-8">
                    {chapterContent2.map((v) => (
                        <p key={v.verse} className="text-gray-700 leading-relaxed"><span className="font-bold text-green-600 pr-2">{v.verse}</span>{v.text}</p>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Reader;