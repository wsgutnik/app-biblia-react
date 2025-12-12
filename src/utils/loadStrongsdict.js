const withBase = (assetPath) => {
  const base = (import.meta?.env?.BASE_URL ?? '/').replace(/\/$/, '');
  return `${base}/${assetPath.replace(/^\//, '')}`;
};

const fetchJson = async (assetPath) => {
  try {
    const res = await fetch(withBase(assetPath));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`loadStrongs: failed to fetch ${assetPath}`, error);
    return null;
  }
};

export async function loadStrongs() {
  const combined = await fetchJson('strongs-dictionary.json');

  let greek =
    combined?.greek ||
    combined?.strongs_greek ||
    combined?.greek_dictionary ||
    null;
  let hebrew =
    combined?.hebrew ||
    combined?.strongs_hebrew ||
    combined?.hebrew_dictionary ||
    null;

  const needsGreek = !greek || !Object.keys(greek).length;
  const needsHebrew = !hebrew || !Object.keys(hebrew).length;

  if (needsGreek || needsHebrew) {
    const [greekJson, hebrewJson] = await Promise.all([
      needsGreek ? fetchJson('strongs-greek-dictionary.json') : Promise.resolve(null),
      needsHebrew ? fetchJson('strongs-hebrew-dictionary.json') : Promise.resolve(null),
    ]);
    if (needsGreek && greekJson) greek = greekJson;
    if (needsHebrew && hebrewJson) hebrew = hebrewJson;
  }

  return { greek: greek || null, hebrew: hebrew || null };
}
