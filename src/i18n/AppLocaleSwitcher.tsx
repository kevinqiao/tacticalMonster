import React from "react";
import { useTranslation } from "react-i18next";

import { useAppLocale } from "@/i18n/useAppLocale";

export const AppLocaleSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("portal.player");
  const { locale, changeLocale, supportedLocales, localeDisplayNames } = useAppLocale();

  return (
    <div
      className={className ?? "campaign-locale-switcher"}
      role="group"
      aria-label={t("localeSwitcher.ariaLabel")}
    >
      {supportedLocales.map((loc) => (
        <button
          key={loc}
          type="button"
          className={`campaign-locale-switcher__btn${
            locale === loc ? " campaign-locale-switcher__btn--active" : ""
          }`}
          aria-pressed={locale === loc}
          onClick={() => changeLocale(loc)}
        >
          {localeDisplayNames[loc]}
        </button>
      ))}
    </div>
  );
};
