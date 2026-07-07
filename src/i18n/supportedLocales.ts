export const APP_LOCALE_STORAGE_KEY = "app_locale";
/** 用户在应用内手动切换语言后写入，用于区分「系统/浏览器偏好」与「用户显式选择」。 */
export const APP_LOCALE_USER_SET_KEY = "app_locale_user_set";

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
