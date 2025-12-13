import React, { useEffect, useState } from 'react';
import { BOOKS, VERSIONS } from '../data';

function Search({ bibleData, initialQuery = '' }) {
    const [version, setVersion] = useState(VERSIONS[0].id);
    const [term, setTerm] = useState(initialQuery);
    const [results, setResults] = useState(null);
    const [status, setStatus] = useState('');

    const runSearch = (query) => {
        const formatted = query.trim();
        if (!formatted) {
            setResults(null);
            setStatus('');
            return;
        }
        const verses = bibleData[version] || [];
        const searchResults = verses.filter(v =>
            v.text && v.text.toLowerCase().includes(formatted.toLowerCase())
        );
        const enriched = searchResults.map(v => {
            const bookInfo = BOOKS.find(b => b.abbrev === v.book_abbrev);
            return { ...v, bookName: bookInfo ? bookInfo.name_pt : '?' };
        });
        setResults(enriched);
        setStatus(`${enriched.length} resultado${enriched.length === 1 ? '' : 's'} encontrados para "${formatted}".`);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        runSearch(term);
    };

    useEffect(() => {
        if (initialQuery) {
            setTerm(initialQuery);
            runSearch(initialQuery);
        }
    }, [initialQuery]);

    useEffect(() => {
        if (term) {
            runSearch(term);
        }
    }, [version]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <select value={version} onChange={e => setVersion(e.target.value)} className="w-full sm:w-auto p-3 border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500">
                        {VERSIONS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                    <input type="text" value={term} onChange={e => setTerm(e.target.value)} placeholder="Digite o termo da busca..." className="grow p-3 border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500" />
                    {/* NOVO: Botão azul com estilo de mídia social */}
                    <button type="submit" className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Buscar
                    </button>
                </form>
                {status && <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{status}</p>}
            </div>

            {results && (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200">
                    <div className="p-4 border-b border-slate-200"><p className="text-sm font-medium text-gray-600">{results.length} resultados encontrados.</p></div>
                    <ul className="divide-y divide-slate-200 max-h-128 overflow-y-auto">
                        {results.map((v, i) => (
                            <li key={i} className="p-4 hover:bg-slate-50">
                                <h3 className="font-bold text-blue-700">{v.bookName} {v.chapter}:{v.verse}</h3>
                                <p className="mt-1 text-gray-700 leading-relaxed">{v.text}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
export default Search;
