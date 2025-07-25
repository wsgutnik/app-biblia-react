import React, { useState, useEffect } from 'react';

const LightningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);

function Streak() {
    const [streakCount, setStreakCount] = useState(0);

    useEffect(() => {
        const today = new Date().toDateString();
        const streakData = JSON.parse(localStorage.getItem('streakData')) || { count: 0, lastVisit: null };

        if (streakData.lastVisit === today) {
            setStreakCount(streakData.count);
            return;
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (streakData.lastVisit === yesterday.toDateString()) {
            const newCount = streakData.count + 1;
            setStreakCount(newCount);
            localStorage.setItem('streakData', JSON.stringify({ count: newCount, lastVisit: today }));
        } else {
            setStreakCount(1);
            localStorage.setItem('streakData', JSON.stringify({ count: 1, lastVisit: today }));
        }
    }, []);

    if (streakCount === 0) return null;

    return (
        <div className="flex items-center gap-2 text-yellow-600 font-semibold" title={`Você está numa sequência de ${streakCount} dias!`}>
            <LightningIcon />
            <span>{streakCount} {streakCount > 1 ? 'dias' : 'dia'}</span>
        </div>
    );
}

export default Streak;
