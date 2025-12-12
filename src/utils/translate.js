const translationCache = new Map();

const translateWithGoogle = async (text) => {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'en',
    tl: 'pt',
    dt: 't',
    q: text
  });
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Erro Google Translate: ${response.status}`);
  }
  const data = await response.json();
  const translatedSegments = data?.[0]?.map((segment) => segment?.[0]).filter(Boolean);
  if (!translatedSegments || translatedSegments.length === 0) {
    throw new Error('Resposta sem texto traduzido.');
  }
  return translatedSegments.join(' ');
};

export const translateText = async (text) => {
  const normalized = text?.trim();
  if (!normalized) return '';
  if (translationCache.has(normalized)) {
    return translationCache.get(normalized);
  }
  const translated = await translateWithGoogle(normalized);
  translationCache.set(normalized, translated);
  return translated;
};
