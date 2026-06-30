import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { persistLocale } from "./useAppLocale";
import { resolveInitialLocale } from "./detectLocale";
import { DEFAULT_LOCALE } from "./supportedLocales";

import campaignPlayerZh from "./locales/zh-CN/campaign.player.json";
import campaignMerchantZh from "./locales/zh-CN/campaign.merchant.json";
import campaignErrorsZh from "./locales/zh-CN/campaign.errors.json";
import sharedCasualZh from "./locales/zh-CN/shared.casual.json";

import campaignPlayerEn from "./locales/en-US/campaign.player.json";
import campaignMerchantEn from "./locales/en-US/campaign.merchant.json";
import campaignErrorsEn from "./locales/en-US/campaign.errors.json";
import sharedCasualEn from "./locales/en-US/shared.casual.json";

const initialLocale = resolveInitialLocale();

void i18n.use(initReactI18next).init({
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ["zh-CN", "en-US"],
  ns: ["campaign.player", "campaign.merchant", "campaign.errors", "shared.casual"],
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
    },
    "en-US": {
      "campaign.player": campaignPlayerEn,
      "campaign.merchant": campaignMerchantEn,
      "campaign.errors": campaignErrorsEn,
      "shared.casual": sharedCasualEn,
    },
  },
});

persistLocale(initialLocale);

export default i18n;
