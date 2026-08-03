import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  APP_LOCALE_STORAGE_KEY,
  APP_LOCALE_USER_SET_KEY,
  LOCALE_DISPLAY_NAMES,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type AppLocale,
} from "./supportedLocales";

export function applyDocumentLocale(locale: AppLocale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function persistUserLocaleChoice(locale: AppLocale): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
    localStorage.setItem(APP_LOCALE_USER_SET_KEY, "1");
  }
  applyDocumentLocale(locale);
}

/** @deprecated Prefer applyDocumentLocale / persistUserLocaleChoice */
export function persistLocale(locale: AppLocale): void {
  persistUserLocaleChoice(locale);
}

export function useAppLocale() {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState<AppLocale>(() =>
    isSupportedLocale(i18n.language) ? i18n.language : "zh-CN"
  );

  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      if (isSupportedLocale(lng)) {
        setLocale(lng);
        persistUserLocaleChoice(lng);
      }
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n]);

  const changeLocale = useCallback(
    (next: AppLocale) => {
      void i18n.changeLanguage(next);
    },
    [i18n]
  );

  return {
    locale,
    changeLocale,
    supportedLocales: SUPPORTED_LOCALES,
    localeDisplayNames: LOCALE_DISPLAY_NAMES,
  };
}
