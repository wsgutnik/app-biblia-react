import { API_PREFIX, authorizedJsonFetch } from './apiClient';

export async function fetchLastReading(userSub) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/profile/last-reading`,
    userSub
  });
  return result?.lastReading || result?.last_reading || null;
}

export async function saveLastReading(userSub, payload) {
  const body = JSON.stringify({ lastReading: payload });
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/profile/last-reading`,
    method: 'PUT',
    userSub,
    body
  });
  return result?.lastReading || result?.last_reading || null;
}
