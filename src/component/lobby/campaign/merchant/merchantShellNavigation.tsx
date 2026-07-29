import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { partnerOperationHref } from "../../partner/partnerPaths";
import { MerchantRedeemInner } from "./MerchantRedeemPage";
import MerchantHomePanel from "./MerchantHomePanel";
import {
  type MerchantEmbeddedRoute,
  merchantRouteKey,
  parseMerchantRouteFromLocation,
} from "./merchantEmbeddedNav";
import { MerchantTeamInner } from "./MerchantTeamPage";

export function useMerchantShellStack() {
  const [stack, setStack] = useState<MerchantEmbeddedRoute[]>([{ view: "home" }]);

  const navigate = useCallback((route: MerchantEmbeddedRoute) => {
    setStack((prev) => {
      const key = merchantRouteKey(route);
      const topKey = merchantRouteKey(prev[prev.length - 1]!);
      if (key === topKey) return prev;
      return [...prev, route];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const resetToHome = useCallback(() => {
    setStack([{ view: "home" }]);
  }, []);

  useEffect(() => {
    const deep = parseMerchantRouteFromLocation();
    if (!deep || deep.view === "home") return;
    setStack([{ view: "home" }, deep]);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      window.history.replaceState(
        null,
        "",
        code
          ? partnerOperationHref({ view: "redeem", code })
          : partnerOperationHref()
      );
    }
  }, []);

  const current = stack[stack.length - 1]!;

  return {
    stack,
    current,
    navigate,
    goBack,
    resetToHome,
    canGoBack: stack.length > 1,
  };
}

type MerchantShellBodyProps = {
  current: MerchantEmbeddedRoute;
  /** Hide duplicate page chrome (toolbar/title) on inner views. */
  embedded?: boolean;
};

export const MerchantShellBody: React.FC<MerchantShellBodyProps> = ({ current, embedded }) => {
  const { t } = useTranslation("campaign.merchant");

  switch (current.view) {
    case "home":
      return (
        <>
          {!embedded ? <p className="merchant-note">{t("home.subtitle")}</p> : null}
          <MerchantHomePanel />
        </>
      );
    case "campaigns":
    case "coupon-defs":
    case "coupons":
    case "brand":
      return (
        <p className="merchant-note">
          活动配置已迁至{" "}
          <a href="/platform/admin">平台运营</a> 或{" "}
          <a href="/partner/admin">Partner 管理</a>（需 campaignOps）；门店在「团队」，兑换券 SKU 在「商店」。
          本控制台仅支持核销与门店团队。
        </p>
      );
    case "redeem":
      return <MerchantRedeemInner visible={1} initialStoreId={current.storeId} embedded />;
    case "team":
      return <MerchantTeamInner visible={1} storeId={current.storeId} embedded />;
  }
};

export function merchantShellTitle(
  current: MerchantEmbeddedRoute,
  t: (key: string) => string,
  opts?: { prefix?: string }
): string {
  const prefix = opts?.prefix ?? t("home.title");
  switch (current.view) {
    case "home":
      return prefix;
    case "campaigns":
      return `${prefix} · ${t("nav.campaigns")}`;
    case "coupon-defs":
      return `${prefix} · ${t("nav.couponDefs")}`;
    case "coupons":
      return `${prefix} · ${t("nav.coupons")}`;
    case "redeem":
      return `${prefix} · ${t("nav.redeem")}`;
    case "brand":
      return `${prefix} · ${t("nav.brand")}`;
    case "team":
      return `${prefix} · ${t("nav.team")}`;
  }
}
