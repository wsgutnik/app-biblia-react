import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { fetchStreak } from '../utils/streakService';
import { isAuth0Configured } from '../config/auth0';

const LightningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);

const LOCAL_STORAGE_KEY = 'streakData';

const readLocalStreak = () => {
  if (typeof window === 'undefined') return { count: 0, bestCount: 0, lastVisit: null };
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { count: 0, bestCount: 0, lastVisit: null };
  } catch {
    return { count: 0, bestCount: 0, lastVisit: null };
  }
};

const updateLocalStreak = () => {
  if (typeof window === 'undefined') return { count: 0, bestCount: 0, lastVisit: null };
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const previous = readLocalStreak();

  if (previous.lastVisit === today) {
    return previous;
  }

  const isYesterday = previous.lastVisit === yesterday.toDateString();
  const newCount = isYesterday ? (previous.count || 0) + 1 : 1;
  const bestCount = Math.max(previous.bestCount || 0, newCount);
  const updated = { count: newCount, bestCount, lastVisit: today };
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

function Streak({ refreshToken = 0 }) {
  const auth = isAuth0Configured ? useAuth0() : { isAuthenticated: false, user: null };
  const { isAuthenticated, user } = auth;
  const [streakData, setStreakData] = useState(() => readLocalStreak());
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuth0Configured || !isAuthenticated || !user?.sub) {
      setStreakData(updateLocalStreak());
      return;
    }

    let cancelled = false;
    setIsSyncing(true);
    setError('');

    fetchStreak(user.sub)
      .then((streak) => {
        if (cancelled) return;
        setStreakData({
          count: streak.count || 0,
          bestCount: streak.bestCount || 0,
          lastVisit: streak.lastVisit || null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load streak:', err);
        setError('Não foi possível sincronizar a sequência.');
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.sub, refreshToken]);

  if (!streakData.count && !isSyncing) return null;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-2 text-yellow-600 font-semibold"
        title={
          streakData.bestCount
            ? `Sequência atual: ${streakData.count} • Melhor sequência: ${streakData.bestCount}`
            : `Você está numa sequência de ${streakData.count} dias!`
        }
      >
        <LightningIcon />
        <span>
          {streakData.count} {streakData.count > 1 ? 'dias' : 'dia'}
          {isSyncing && <span className="ml-2 text-xs text-slate-500">sync...</span>}
        </span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default Streak;
