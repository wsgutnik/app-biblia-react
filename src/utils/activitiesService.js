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
