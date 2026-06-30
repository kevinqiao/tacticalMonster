export const APP_LOCALE_STORAGE_KEY = "app_locale";

export const SUPPORTED_LOCALES = ["zh-CN", "en-US"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "zh-CN";

export const LOCALE_DISPLAY_NAMES: Record<AppLocale, string> = {
  "zh-CN": "中文",
  "en-US": "EN",
};

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}
