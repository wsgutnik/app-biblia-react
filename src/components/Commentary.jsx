import React, { useState, useMemo } from 'react';
import { BOOKS, VERSIONS } from '../data';

// Função para verificar se um versículo está dentro do intervalo de um comentário
const isVerseInRange = (verseNumber, start, end) => {
    const startVerse = start % 1000000;
    const endVerse = end % 1000000;
    return verseNumber >= startVerse && verseNumber <= endVerse;
};

// Sub-componente para um único comentário, agora com estado para minimizar
const Comment = ({ comment }) => {
    const [isMinimized, setIsMinimized] = useState(true);

    return (
        <div className="bg-white/80 p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsMinimized(!isMinimized)}>
                <h4 className="font-semibold text-slate-700">{comment.father_name}</h4>
                <span className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    {isMinimized ? '+' : '−'}
                </span>
            </div>
            {!isMinimized && (
                <p className="mt-1 text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.txt}</p>
            )}
        </div>
    );
};


function Commentary({ commentaryData, bibleData }) {
    const [version, setVersion] = useState('almeida_rc');
    const [book, setBook] = useState('gn');
    const [chapter, setChapter] = useState('1');
    const [selectedAuthor, setSelectedAuthor] = useState('Todos');
    const [openVerses, setOpenVerses] = useState({});

    const selectedBookInfo = useMemo(() => BOOKS.find((b) => b.abbrev === book), [book]);

    const chapterText = useMemo(() => {
        if (!bibleData || !bibleData[version]) return [];
        return bibleData[version].filter(
            (verse) => verse.book_abbrev === book && Number(verse.chapter) === Number(chapter)
        );
    }, [version, book, chapter, bibleData]);

    const availableAuthors = useMemo(() => {
        if (!commentaryData) return [];
        const authors = new Set(commentaryData.map(c => c.father_name));
        return ['Todos', ...Array.from(authors).sort()];
    }, [commentaryData]);

    const chapterCommentaries = useMemo(() => {
        if (!commentaryData || !selectedBookInfo) return [];
        const bookName = selectedBookInfo.name_en.toLowerCase().replace(" ", "");
        const chapterNum = Number(chapter);

        const encode = (chap, verse) => (chap * 1000000) + verse;
        const chapterStart = encode(chapterNum, 1);
        const chapterEnd = encode(chapterNum, 200);

        let comments = commentaryData.filter(comment => 
            comment.book === bookName &&
            comment.location_start <= chapterEnd &&
            comment.location_end >= chapterStart
        );
        
        if (selectedAuthor !== 'Todos') {
            comments = comments.filter(c => c.father_name === selectedAuthor);
        }
        
        return comments;
    }, [chapter, selectedAuthor, commentaryData, selectedBookInfo]);

    const toggleVerseComments = (verseKey) => {
        setOpenVerses((prev) => ({
            ...prev,
            [verseKey]: !prev[verseKey]
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Controles de Seleção */}
            <div className="bg-card p-6 rounded-2xl shadow-card border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select value={version} onChange={e => setVersion(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                        {VERSIONS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <select value={book} onChange={e => { setBook(e.target.value); setChapter('1'); }} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                        {BOOKS.map((b) => <option key={b.abbrev} value={b.abbrev}>{b.name_pt}</option>)}
                    </select>
                    <select value={chapter} onChange={e => setChapter(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                        {selectedBookInfo && Array.from({ length: selectedBookInfo.chapters }, (_, i) => i + 1).map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select value={selectedAuthor} onChange={e => setSelectedAuthor(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500">
                        {availableAuthors.map(author => <option key={author} value={author}>{author}</option>)}
                    </select>
                </div>
            </div>

            {/* Conteúdo Principal: Texto e Comentários */}
            <div className="bg-card rounded-3xl shadow-card border border-slate-100 p-6 sm:p-8">
                <h2 className="text-3xl font-bold text-brand-900 mb-6 border-b pb-4 border-slate-100">
                    Estudo de {selectedBookInfo?.name_pt} {chapter}
                </h2>
                <div className="space-y-6">
                    {chapterText.length > 0 ? chapterText.map(verse => {
                        const commentariesForVerse = chapterCommentaries.filter(c => 
                            isVerseInRange(Number(verse.verse), c.location_start, c.location_end)
                        );
                        const verseKey = `${book}-${chapter}-${verse.verse}`;
                        const hasComments = commentariesForVerse.length > 0;
                        const isVerseOpen = !!openVerses[verseKey];

                        return (
                            <div key={verse.verse} className="border-b border-slate-200 pb-4 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => hasComments && toggleVerseComments(verseKey)}
                                    className={`flex w-full items-start gap-4 bg-transparent border-0 p-0 text-left ${hasComments ? 'cursor-pointer' : 'cursor-default'} hover:text-brand-800`}
                                    aria-expanded={hasComments ? isVerseOpen : undefined}
                                    aria-controls={`verse-comments-${verseKey}`}
                                >
                                    <span className="font-bold text-brand-700 w-10 text-right">{verse.verse}</span>
                                    <p className="flex-1 text-gray-800 leading-relaxed text-lg">{verse.text}</p>
                                    {hasComments && (
                                        <span className="text-brand-600 text-xl font-bold" aria-hidden="true">
                                            {isVerseOpen ? '−' : '+'}
                                        </span>
                                    )}
                                </button>
                                {hasComments && isVerseOpen && (
                                    <div id={`verse-comments-${verseKey}`} className="mt-4 pl-12 space-y-3">
                                        {commentariesForVerse.map(comment => (
                                            <Comment key={comment.id} comment={comment} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }) : <p className="text-slate-500">Selecione uma versão da Bíblia para ler o texto.</p>}
                </div>
            </div>
        </div>
    );
}

export default Commentary;
