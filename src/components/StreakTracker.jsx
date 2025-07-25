import React, { useState, useEffect } from 'react';

const FireIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
        <path d="M14.5 9.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5S12.2 8 13 8s1.5.7 1.5 1.5z"/>
        <path d="M13 2.4c-3.4 3.4-3.4 8.9 0 12.3 1.6-1.6 2.4-3.8 2.4-6.1 0-2.4-1.9-4.3-4.3-4.3-1.2 0-2.3.5-3.1 1.2-2-1.8-4.8-1.8-6.8 0-1.8 1.8-1.8 4.8 0 6.8 3.4 3.4 8.9 3.4 12.3 0 1.8-1.8 1.8-4.8 0-6.8-2-1.8-4.8-1.8-6.8 0z"/>
    </svg>
);

function StreakTracker() {
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        const today = new Date().toDateString();
        const streakData = JSON.parse(localStorage.getItem('streakData')) || { count: 0, lastVisit: null };

        if (streakData.lastVisit === today) {
            // Já visitou hoje
            setStreak(streakData.count);
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (streakData.lastVisit === yesterday.toDateString()) {
            // Visita consecutiva
            const newCount = streakData.count + 1;
            setStreak(newCount);
            localStorage.setItem('streakData', JSON.stringify({ count: newCount, lastVisit: today }));
        } else {
            // Perdeu a sequência
            setStreak(1);
            localStorage.setItem('streakData', JSON.stringify({ count: 1, lastVisit: today }));
        }
    }, []);

    if (streak === 0) return null;

    return (
        <div className="flex items-center gap-2 text-orange-600 font-semibold" title={`Você está numa sequência de ${streak} dias!`}>
            <FireIcon />
            <span>{streak}</span>
        </div>
    );
}

export default StreakTracker;
