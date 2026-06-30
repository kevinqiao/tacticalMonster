import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  APP_LOCALE_STORAGE_KEY,
  LOCALE_DISPLAY_NAMES,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type AppLocale,
} from "./supportedLocales";

export function persistLocale(locale: AppLocale): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
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
        persistLocale(lng);
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
