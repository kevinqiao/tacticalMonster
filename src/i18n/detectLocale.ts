import {
  APP_LOCALE_STORAGE_KEY,
  APP_LOCALE_USER_SET_KEY,
  DEFAULT_LOCALE,
  isSupportedLocale,
  type AppLocale,
} from "./supportedLocales";

function matchAppLocale(tag: string): AppLocale | null {
  const lang = tag.toLowerCase();
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("en")) return "en-US";
  return null;
}

/** 按浏览器 / 系统语言偏好列表解析（navigator.languages → navigator.language）。 */
export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const candidates = [...(navigator.languages ?? [])];
  if (navigator.language) candidates.push(navigator.language);

  for (const tag of candidates) {
    const matched = matchAppLocale(tag);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}

export function readStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  const saved = localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  return isSupportedLocale(saved) ? saved : null;
}

export function readUserLocaleChoice(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(APP_LOCALE_USER_SET_KEY) === "1";
}

export function resolveInitialLocale(): AppLocale {
  if (readUserLocaleChoice()) {
    const stored = readStoredLocale();
    if (stored) return stored;
  }
  return detectBrowserLocale();
}
