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
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                <h4 className="font-semibold text-slate-700">{comment.father_name}</h4>
                <button className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                    {isMinimized ? '+' : '−'}
                </button>
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
    }, [book, chapter, selectedAuthor, commentaryData, selectedBookInfo]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Controles de Seleção */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
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
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
                    Estudo de {selectedBookInfo?.name_pt} {chapter}
                </h2>
                <div className="space-y-6">
                    {chapterText.length > 0 ? chapterText.map(verse => {
                        const commentariesForVerse = chapterCommentaries.filter(c => 
                            isVerseInRange(Number(verse.verse), c.location_start, c.location_end)
                        );

                        return (
                            <div key={verse.verse} className="border-b border-slate-200 pb-4 last:border-b-0">
                                {/* O Texto do Versículo */}
                                <div className="flex">
                                    <span className="font-bold text-blue-800 pr-4 w-12 text-right">{verse.verse}</span>
                                    <p className="flex-1 text-gray-800 leading-relaxed text-lg">{verse.text}</p>
                                </div>
                                {/* A Lista de Comentários para este Versículo */}
                                {commentariesForVerse.length > 0 && (
                                    <div className="mt-4 pl-12 space-y-3">
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
