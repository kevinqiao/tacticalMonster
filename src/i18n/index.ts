import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { applyDocumentLocale } from "./useAppLocale";
import { resolveInitialLocale } from "./detectLocale";
import { DEFAULT_LOCALE } from "./supportedLocales";

import campaignPlayerZh from "./locales/zh-CN/campaign.player.json";
import campaignMerchantZh from "./locales/zh-CN/campaign.merchant.json";
import campaignErrorsZh from "./locales/zh-CN/campaign.errors.json";
import sharedCasualZh from "./locales/zh-CN/shared.casual.json";
import portalPlayerZh from "./locales/zh-CN/portal.player.json";
import portalErrorsZh from "./locales/zh-CN/portal.errors.json";
import hostShellZh from "./locales/zh-CN/host.shell.json";

import campaignPlayerEn from "./locales/en-US/campaign.player.json";
import campaignMerchantEn from "./locales/en-US/campaign.merchant.json";
import campaignErrorsEn from "./locales/en-US/campaign.errors.json";
import sharedCasualEn from "./locales/en-US/shared.casual.json";
import portalPlayerEn from "./locales/en-US/portal.player.json";
import portalErrorsEn from "./locales/en-US/portal.errors.json";
import hostShellEn from "./locales/en-US/host.shell.json";

const initialLocale = resolveInitialLocale();

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ["zh-CN", "en-US"],
  ns: ["campaign.player", "campaign.merchant", "campaign.errors", "shared.casual", "portal.player", "portal.errors", "host.shell"],
  defaultNS: "campaign.player",
  interpolation: {
    escapeValue: false,
  },
  resources: {
    "zh-CN": {
      "campaign.player": campaignPlayerZh,
      "campaign.merchant": campaignMerchantZh,
      "campaign.errors": campaignErrorsZh,
      "shared.casual": sharedCasualZh,
      "portal.player": portalPlayerZh,
      "portal.errors": portalErrorsZh,
      "host.shell": hostShellZh,
    },
    "en-US": {
      "campaign.player": campaignPlayerEn,
      "campaign.merchant": campaignMerchantEn,
      "campaign.errors": campaignErrorsEn,
      "shared.casual": sharedCasualEn,
      "portal.player": portalPlayerEn,
      "portal.errors": portalErrorsEn,
      "host.shell": hostShellEn,
    },
  },
});

applyDocumentLocale(initialLocale);

export default i18n;
