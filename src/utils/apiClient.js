const DEFAULT_DEV_API = 'http://localhost:4000';
const DEFAULT_PROD_API = 'https://strongs-api.onrender.com';

const normalizeBaseUrl = (value) => {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

export const API_PREFIX = '/api';

export const API_BASE_URL = (() => {
  const envValue = normalizeBaseUrl(import.meta.env.VITE_API_URL);
  if (envValue) return envValue;
  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API;
  }
  return DEFAULT_PROD_API;
})();

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
      const data = await response.clone().json();
      message = data.error || message;
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore secondary failure
      }
    }
    throw new Error(message);
  }

  return response.json();
}

export async function publicJsonFetch({ path, method = 'GET', body, headers }) {
  const requestHeaders = new Headers(headers || {});
  if (body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body
  });

  if (!response.ok) {
    let message = 'Erro ao comunicar com o servidor';
    try {
      const data = await response.clone().json();
      message = data.error || message;
    } catch {
      try {
        const text = await response.text();
        if (text) message = text;
      } catch {
        // ignore secondary failure
      }
    }
    throw new Error(message);
  }

  return response.json();
}
