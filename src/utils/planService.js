import { API_PREFIX, authorizedJsonFetch } from './apiClient';

export async function fetchPlans(userSub) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/plans`,
    userSub
  });
  return result?.plans || [];
}

export async function updatePlanProgress(userSub, planId, payload) {
  const result = await authorizedJsonFetch({
    path: `${API_PREFIX}/plans/${planId}/progress`,
    method: 'PUT',
    userSub,
    body: JSON.stringify(payload)
  });
  return result;
}
