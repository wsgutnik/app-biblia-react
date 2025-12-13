import { API_PREFIX, authorizedJsonFetch } from './apiClient';

export async function appendReadingHistory(userSub, entry) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/history`,
    method: 'POST',
    userSub,
    body: JSON.stringify(entry)
  });
  return result?.entry || null;
}

export async function syncQuizStats(userSub, stats) {
  return authorizedJsonFetch({
    path: `${API_PREFIX}/activities`,
    method: 'PUT',
    userSub,
    body: JSON.stringify({ quizStats: stats })
  });
}
