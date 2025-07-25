import React, { useState, useEffect, useMemo } from 'react';
import { BOOKS, VERSIONS } from '../data';

// Uma lista curada de versículos para o "Verso do Dia". Você pode adicionar quantos quiser.
const DAILY_VERSE_LIST = [
    { book: 'jo', chapter: 3, verse: 16 }, { book: 'rm', chapter: 8, verse: 28 },
    { book: 'fp', chapter: 4, verse: 13 }, { book: 'pv', chapter: 3, verse: 5 },
    { book: 'jr', chapter: 29, verse: 11 }, { book: 'is', chapter: 41, verse: 10 },
    { book: 'sl', chapter: 46, verse: 1 }, { book: 'gl', chapter: 5, verse: 22 },
    { book: 'hb', chapter: 11, verse: 1 }, { book: '2tm', chapter: 1, verse: 7 },
    { book: 'mt', chapter: 6, verse: 33 }, { book: 'ef', chapter: 2, verse: 8 },
];

const HeartIcon = ({ filled }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={filled ? 'text-red-500' : 'text-slate-400'}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const ShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
);

// NOVO: Ícone de seta para minimizar/expandir
const MinimizeIcon = ({ isMinimized }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
);


function VerseOfTheDay({ bibleData }) {
    const [verseData, setVerseData] = useState(null);
    const [version, setVersion] = useState('almeida_rc');
    const [isLoved, setIsLoved] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    // NOVO: Estado para controlar se o cartão está minimizado, lendo o valor salvo
    const [isMinimized, setIsMinimized] = useState(JSON.parse(localStorage.getItem('isVerseMinimized')) || false);

    const dayOfYear = useMemo(() => {
        const now = new Date();
        return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    }, []);

    useEffect(() => {
        const verseRef = DAILY_VERSE_LIST[dayOfYear % DAILY_VERSE_LIST.length];
        const bibleVersionData = bibleData[version];
        if (bibleVersionData && verseRef) {
            const foundVerse = bibleVersionData.find(v => 
                v.book_abbrev === verseRef.book &&
                Number(v.chapter) === verseRef.chapter &&
                Number(v.verse) === verseRef.verse
            );
            
            if (foundVerse) {
                const bookInfo = BOOKS.find(b => b.abbrev === foundVerse.book_abbrev);
                setVerseData({
                    text: foundVerse.text,
                    reference: `${bookInfo.name_pt} ${foundVerse.chapter}:${foundVerse.verse}`
                });
            }
        }
        const lovedVerses = JSON.parse(localStorage.getItem('lovedVerses')) || {};
        setIsLoved(!!lovedVerses[dayOfYear]);
    }, [version, bibleData, dayOfYear]);

    // NOVO: Efeito para salvar o estado minimizado sempre que ele muda
    useEffect(() => {
        localStorage.setItem('isVerseMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    const handleLoveClick = (e) => {
        e.stopPropagation(); // Evita que o clique minimize o cartão
        const lovedVerses = JSON.parse(localStorage.getItem('lovedVerses')) || {};
        const newLovedState = !isLoved;
        if (newLovedState) {
            lovedVerses[dayOfYear] = true;
        } else {
            delete lovedVerses[dayOfYear];
        }
        localStorage.setItem('lovedVerses', JSON.stringify(lovedVerses));
        setIsLoved(newLovedState);
    };

    const handleShareClick = async (e) => {
        e.stopPropagation(); // Evita que o clique minimize o cartão
        if (!verseData) return;
        const textToShare = `"${verseData.text}" (${verseData.reference})`;
        if (navigator.share) {
            await navigator.share({ title: 'Verso do Dia', text: textToShare });
        } else {
            await navigator.clipboard.writeText(textToShare);
            setCopySuccess('Verso copiado!');
            setTimeout(() => setCopySuccess(''), 2000);
        }
    };

    return (
        <div className="mb-12">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200">
                {/* NOVO: Cabeçalho clicável com o botão de minimizar */}
                <div 
                    className="flex justify-between items-center p-4 cursor-pointer" 
                    onClick={() => setIsMinimized(!isMinimized)}
                >
                    <h2 className="text-sm font-bold uppercase text-blue-600 tracking-widest">Verso do Dia</h2>
                    <button className="text-slate-400 hover:text-blue-600">
                       <MinimizeIcon isMinimized={isMinimized} />
                    </button>
                </div>
                
                {/* NOVO: O conteúdo do cartão só é mostrado se não estiver minimizado */}
                {!isMinimized && (
                    <div className="p-8 pt-4 text-center animate-fade-in">
                        {verseData ? (
                            <>
                                <p className="text-2xl md:text-3xl text-slate-700 leading-relaxed">
                                    "{verseData.text}"
                                </p>
                                <p className="font-bold text-slate-500 mt-6 text-xl">— {verseData.reference}</p>
                                
                                <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-slate-200">
                                    <select value={version} onChange={e => setVersion(e.target.value)} onClick={e => e.stopPropagation()} className="w-full max-w-xs p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                                        {VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                    <button onClick={handleLoveClick} className="p-2 rounded-full hover:bg-red-100 transition-colors" title="Amar">
                                        <HeartIcon filled={isLoved} />
                                    </button>
                                    <button onClick={handleShareClick} className="p-2 rounded-full text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors" title="Compartilhar">
                                        <ShareIcon />
                                    </button>
                                </div>
                                {copySuccess && <p className="text-green-600 text-sm mt-2">{copySuccess}</p>}
                            </>
                        ) : (
                            <p className="text-slate-500">Carregando verso do dia...</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default VerseOfTheDay;
