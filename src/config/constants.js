/**
 * Application Constants
 * Centralized location for all magic strings and constants used throughout the app
 */

// ==================== LocalStorage Keys ====================
export const STORAGE_KEYS = {
  // Theme
  THEME: 'theme',

  // User Data
  VERSE_HIGHLIGHTS: 'verseHighlights',
  READING_HISTORY: 'readingHistory',
  LOVED_VERSES: 'lovedVerses',

  // Dictionary
  LAST_DICTIONARY_LOOKUP: 'lastDictionaryLookup',

  // Quiz
  QUIZ_PROGRESS: 'quiz_progress_v1',

  // Streak
  STREAK_DATA: 'streakData',

  // UI State
  VERSE_MINIMIZED: 'isVerseMinimized',
};

// ==================== Highlight Colors ====================
export const HIGHLIGHT_OPTIONS = [
  { id: 'sun', label: 'Amarelo', background: '#fff7c2', accent: '#facc15' },
  { id: 'sky', label: 'Azul', background: '#d7f0ff', accent: '#38bdf8' },
  { id: 'mint', label: 'Verde', background: '#dff8e3', accent: '#34d399' },
  { id: 'blush', label: 'Rosa', background: '#ffe3f0', accent: '#f472b6' },
  { id: 'lavender', label: 'Lilás', background: '#eee4ff', accent: '#c084fc' },
  { id: 'underline', label: 'Sublinhar', accent: '#94a3b8', variant: 'underline' }
];

// ==================== View Modes ====================
export const VIEW_MODES = {
  SINGLE: 'single',
  COMPARE: 'compare'
};

// ==================== Tab Names ====================
export const TABS = {
  READER: 'reader',
  SEARCH: 'search',
  DICTIONARY: 'dictionary',
  COMMENTARY: 'commentary',
  QUIZ: 'quiz',
  HISTORY: 'history',
  PROFILE: 'profile'
};

// ==================== API Configuration ====================
export const API_CONFIG = {
  PREFIX: import.meta.env.VITE_API_URL || '',
  TIMEOUT: 10000, // 10 seconds
};

// ==================== Default Values ====================
export const DEFAULTS = {
  BIBLE_VERSION: 'almeida_rc',
  COMPARE_VERSION: 'kjv',
  BOOK: 'gn',
  CHAPTER: '1',
  THEME: 'light',
  HIGHLIGHT_COLOR: 'sun'
};

// ==================== Limits ====================
export const LIMITS = {
  READING_HISTORY_MAX: 100,
  SEARCH_RESULTS_MAX: 500,
  DICTIONARY_SEARCH_LIMIT: 10
};

// ==================== Custom Events ====================
export const CUSTOM_EVENTS = {
  NAVIGATE: 'app:navigate',
  STREAK_RECORDED: 'streak:recorded',
  THEME_CHANGED: 'theme:changed'
};

// ==================== Loading Messages ====================
export const LOADING_MESSAGES = {
  BIBLES: 'Carregando Bíblias...',
  DICTIONARIES: 'Carregando Dicionários...',
  COMMENTARIES: 'Carregando Comentários...',
};

// ==================== Error Messages ====================
export const ERROR_MESSAGES = {
  BIBLE_LOAD_FAILED: 'Erro ao carregar a Bíblia',
  DICTIONARY_LOAD_FAILED: 'Erro ao carregar o dicionário',
  COMMENTARY_LOAD_FAILED: 'Não foi possível carregar o ficheiro de comentários',
  API_ERROR: 'Erro ao comunicar com o servidor',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
};

// ==================== Utility Functions ====================

/**
 * Build a unique key for a verse
 * @param {string} bookAbbrev - Book abbreviation (e.g., 'gn')
 * @param {string|number} chapterNumber - Chapter number
 * @param {string|number} verseNumber - Verse number
 * @returns {string} Verse key in format 'book-chapter-verse'
 */
export const buildVerseKey = (bookAbbrev, chapterNumber, verseNumber) =>
  `${bookAbbrev}-${chapterNumber}-${verseNumber}`;

/**
 * Get value from localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {*} Parsed value or default
 */
export const getFromStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Set value in localStorage with error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON.stringify'd)
 * @returns {boolean} Success status
 */
export const setInStorage = (key, value) => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
    return false;
  }
};

/**
 * Remove value from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} Success status
 */
export const removeFromStorage = (key) => {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage key "${key}":`, error);
    return false;
  }
};
