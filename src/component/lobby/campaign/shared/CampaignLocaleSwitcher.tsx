import React from "react";

import { isStaffWebSignInContext } from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { useAppLocale } from "@/i18n/useAppLocale";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";
import { useTranslation } from "react-i18next";

export const CampaignLocaleSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("campaign.player");
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

export const MerchantPageToolbar: React.FC<{
  children?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}> = ({ children, showBack = false, onBack }) => {
  const { t } = useTranslation("campaign.merchant");
  const { user, askAuth, logout } = useUserManager();
  const authed = isPlatformAuthed(user);
  const merchantStaffConsole = isStaffWebSignInContext();

  return (
    <div className="merchant-toolbar">
      {showBack && onBack ? (
        <div className="merchant-toolbar__leading">
          <button type="button" className="merchant-link-btn" onClick={onBack}>
            ← {t("nav.back")}
          </button>
        </div>
      ) : null}
      <div className="merchant-toolbar__actions">
        <CampaignLocaleSwitcher className="campaign-locale-switcher campaign-locale-switcher--merchant" />
        <nav className="merchant-toolbar__auth" aria-label={t("auth.navLabel")}>
          {authed ? (
            <button type="button" className="merchant-auth-btn" onClick={() => void logout()}>
              {t("auth.signOut")}
            </button>
          ) : (
            <button
              type="button"
              className="merchant-auth-btn merchant-auth-btn--filled"
              onClick={() => askAuth({})}
              title={merchantStaffConsole ? t("auth.webSignInShort") : undefined}
            >
              {merchantStaffConsole ? t("auth.webSignIn") : t("auth.signIn")}
            </button>
          )}
        </nav>
      </div>
      {!authed && merchantStaffConsole ? (
        <p className="merchant-note merchant-toolbar__web-hint">{t("auth.webSignInShort")}</p>
      ) : null}
      {children}
    </div>
  );
};
