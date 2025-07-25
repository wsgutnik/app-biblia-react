import React from 'react';

function History({ onNavigate }) {
    const readingHistory = JSON.parse(localStorage.getItem('readingHistory')) || [];

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
                Histórico de Leitura
            </h2>
            {readingHistory.length > 0 ? (
                <ul className="space-y-4">
                    {readingHistory.map((item, index) => (
                        <li 
                            key={index} 
                            className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            onClick={() => onNavigate(item)}
                        >
                            <p className="font-bold text-blue-700 text-lg">{item.bookName} {item.chapter}</p>
                            <p className="text-sm text-slate-500">Lido em: {new Date(item.timestamp).toLocaleDateString()}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-500">O seu histórico de leitura está vazio. Comece a ler na aba "Leitura" para registar o seu progresso.</p>
            )}
        </div>
    );
}

export default History;
