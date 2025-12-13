const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const API_PREFIX = '/api';

export async function authorizedJsonFetch({ path, method = 'GET', body, userSub }) {
  if (!userSub) {
    throw new Error('userSub é obrigatório para chamadas autenticadas');
  }

  const headers = new Headers();
  headers.set('x-user-sub', userSub);
  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body
  });

  if (!response.ok) {
    let message = 'Erro ao comunicar com o servidor';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  return response.json();
}
