import React from "react";
import { ConvexProvider, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";

import { api } from "@/convex/sso/convex/_generated/api";
import { ssoConvexClient } from "host/service/AppProviders";

import { useLogoutUnauthorizedSession } from "../../shared/useLogoutUnauthorizedSession";
import { MerchantNavLink } from "./MerchantEmbeddedNavContext";
import { useMerchantAdminAuth } from "./useMerchantAdminAuth";

/**
 * Store console home (`/partner/operation`): redeem + store team only.
 * Campaign ops (campaigns / coupon-defs / brand) live under Partner Admin when campaignOps.
 */
const MerchantHomePanelBody: React.FC = () => {
  const { t } = useTranslation("campaign.merchant");
  const { authed } = useMerchantAdminAuth();
  const stores = useQuery(
    api.service.partner.storeAdmin.listMyStores,
    authed ? {} : "skip"
  );

  const unauthorized = Boolean(authed && stores !== undefined && stores.length === 0);
  useLogoutUnauthorizedSession(unauthorized);

  if (!authed || unauthorized || stores === undefined) {
    return (
      <p className="merchant-note">
        {unauthorized
          ? "当前账号无门店权限，正在退出并打开登录…"
          : !authed
            ? "请通过登录窗口使用门店账号登录。"
            : "加载中…"}
      </p>
    );
  }

  return (
    <>
      <p className="merchant-note">
        门店作业台：仅核销与门店团队。活动 / 券定义 / 品牌请使用{" "}
        <a href="/partner/admin">Partner 管理</a>（需 campaignOps）。
      </p>
      <nav className="merchant-nav" style={{ marginBottom: "1rem" }}>
        <MerchantNavLink route={{ view: "redeem" }}>{t("nav.redeem")}</MerchantNavLink>
      </nav>
      <h2>{t("home.myStores", { defaultValue: t("home.myMerchants") })}</h2>
      <section>
        {stores.map((m) => (
          <article key={m.storeId} className="merchant-card">
            <strong>{m.name}</strong>
            <p className="merchant-note">
              /{m.slug} · {m.role}
            </p>
            <nav className="merchant-nav">
              <MerchantNavLink
                route={{ view: "redeem", storeId: m.storeId, storeName: m.name }}
              >
                {t("nav.redeem")}
              </MerchantNavLink>
              <MerchantNavLink
                route={{ view: "team", storeId: m.storeId, storeName: m.name }}
              >
                {t("nav.team")}
              </MerchantNavLink>
            </nav>
          </article>
        ))}
      </section>
    </>
  );
};

/** SSO listMyStores — must not use campaign ConvexProvider from MerchantCampaignProvider. */
const MerchantHomePanel: React.FC = () => (
  <ConvexProvider client={ssoConvexClient}>
    <MerchantHomePanelBody />
  </ConvexProvider>
);

export default MerchantHomePanel;
