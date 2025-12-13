import { API_PREFIX, authorizedJsonFetch } from './apiClient';

export async function fetchStreak(userSub) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/streak`,
    userSub
  });
  return result?.streak || { count: 0, bestCount: 0, lastVisit: null, updatedAt: null };
}

export async function recordStreak(userSub, performedAt) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/streak`,
    method: 'POST',
    userSub,
    body: JSON.stringify({ performedAt })
  });
  return result?.streak || { count: 0, bestCount: 0, lastVisit: null, updatedAt: null };
}
