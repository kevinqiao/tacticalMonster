import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  isSupportedLocale,
  type AppLocale,
} from "./supportedLocales";

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("en")) return "en-US";
  return DEFAULT_LOCALE;
}

export function readStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  const saved = localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  return isSupportedLocale(saved) ? saved : null;
}

export function resolveInitialLocale(): AppLocale {
  return readStoredLocale() ?? detectBrowserLocale();
}
