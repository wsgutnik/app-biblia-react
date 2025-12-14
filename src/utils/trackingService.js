import { publicJsonFetch } from './apiClient';

const TRACKING_BASE_PATH = '/tracking/search';

export async function recordSearchTerm(language, term) {
  const normalizedLanguage = typeof language === 'string' ? language.toLowerCase() : '';
  const normalizedTerm = typeof term === 'string' ? term.trim() : '';
  if (!normalizedLanguage || !normalizedTerm) return null;

  try {
    const result = await publicJsonFetch({
      path: TRACKING_BASE_PATH,
      method: 'POST',
      body: JSON.stringify({
        language: normalizedLanguage,
        term: normalizedTerm
      })
    });
    return result?.stat || null;
  } catch (err) {
    console.warn('Falha ao registrar busca mais popular:', err);
    return null;
  }
}

export async function fetchTopSearchTerms(language, limit = 5) {
  const normalizedLanguage = typeof language === 'string' ? language.toLowerCase() : '';
  if (!normalizedLanguage) return [];
  const params = new URLSearchParams({
    language: normalizedLanguage,
    limit: String(limit)
  });

  const result = await publicJsonFetch({
    path: `${TRACKING_BASE_PATH}/top?${params.toString()}`
  });
  return result?.stats || [];
}
