import React, { useState, useEffect } from 'react';
import { BOOKS, VERSIONS } from '../data';

function RandomVerse({ bibleData }) {
    const [version, setVersion] = useState(VERSIONS[0].id);
    const [verse, setVerse] = useState(null);
    
    const fetchRandomVerse = () => {
        const versionData = bibleData[version];
        if (!versionData || versionData.length === 0) return;
        const randomVerseData = versionData[Math.floor(Math.random() * versionData.length)];
        const bookInfo = BOOKS.find(b => b.abbrev === randomVerseData.book_abbrev);
        setVerse({ ...randomVerseData, bookName: bookInfo ? bookInfo.name_pt : '?' });
    };

    // useEffect is used to load the first random verse when the component appears
    // or when the selected version changes.
    useEffect(() => {
        if (bibleData[version]) {
            fetchRandomVerse();
        }
    }, [version, bibleData]);

    return (
        <div className="animate-fade-in">
            {verse ? (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[120px]">
                    <p className="text-lg text-gray-800 leading-relaxed">"{verse.text}"</p>
                    <p className="text-right font-semibold text-slate-600 mt-4">{verse.bookName} {verse.chapter}:{verse.verse}</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 min-h-[120px]">
                    <p>Carregando verso...</p>
                </div>
            )}
            <div className="mt-6 flex justify-end items-center gap-4">
                <select 
                    value={version} 
                    onChange={e => setVersion(e.target.value)} 
                    className="w-full sm:w-auto p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
                >
                    {VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button 
                    onClick={fetchRandomVerse} 
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Novo Verso
                </button>
            </div>
        </div>
    );
}

export default RandomVerse;