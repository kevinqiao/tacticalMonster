import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";

import { MerchantPageToolbar } from "../shared/CampaignLocaleSwitcher";
import { MerchantCampaignProvider } from "../service/useMerchantCampaignManager";
import { MerchantEmbeddedNavProvider } from "./MerchantEmbeddedNavContext";
import {
  MerchantShellBody,
  merchantShellTitle,
  useMerchantShellStack,
} from "./merchantShellNavigation";

import "./merchant.css";

const MerchantHomePage: React.FC<PageProp> = ({ visible }) => {
  const { t } = useTranslation("campaign.merchant");
  const { current, navigate, goBack, canGoBack } = useMerchantShellStack();

  useEffect(() => {
    if (!canGoBack) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoBack, goBack]);

  if (visible === 0) return null;

  const title = merchantShellTitle(current, t);

  return (
    <MerchantCampaignProvider>
      <MerchantEmbeddedNavProvider navigate={navigate}>
        <div className="merchant-page">
          <MerchantPageToolbar showBack={canGoBack} onBack={goBack} />
          <h1>{title}</h1>
          <MerchantShellBody current={current} />
        </div>
      </MerchantEmbeddedNavProvider>
    </MerchantCampaignProvider>
  );
};

export default MerchantHomePage;
