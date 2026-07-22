import React, { useEffect } from "react";

import { PageProp } from "host/RenderApp";

import { useLogoutUnauthorizedSession } from "../../shared/useLogoutUnauthorizedSession";
import PartnerAdminPartnerNav from "./PartnerAdminPartnerNav";
import PartnerAdminToolbar from "./PartnerAdminToolbar";
import {
  isPartnerAdminModalSection,
  usePartnerAdminModals,
} from "./usePartnerAdminModals";
import { useMyPartners, usePartnerAdminAuth } from "./usePartnerAdmin";

import "../../campaign/merchant/merchant.css";

const PartnerAdminHomePage: React.FC<PageProp> = ({ visible }) => {
  const { authed } = usePartnerAdminAuth();
  const partners = useMyPartners();
  const { partnerModals, openPartnerModal } = usePartnerAdminModals();

  const unauthorized = Boolean(authed && partners !== undefined && partners.length === 0);
  useLogoutUnauthorizedSession(unauthorized);

  useEffect(() => {
    if (!authed || partners === undefined || partners.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const partnerId = Number(params.get("partnerId"));
    const section = params.get("section");
    if (!Number.isFinite(partnerId) || partnerId <= 0 || !isPartnerAdminModalSection(section)) {
      return;
    }

    const partner = partners.find((p) => p.pid === partnerId);
    const campaignOps = partner?.capabilities?.campaignOps === true;
    const needsCampaignOps = ["campaigns", "coupon-defs", "coupons", "brand", "stores"].includes(
      section ?? ""
    );
    if (
      (needsCampaignOps && !campaignOps) ||
      ((section === "shop" || section === "redeem") && !partner?.capabilities?.portalGames)
    ) {
      return;
    }
    openPartnerModal(section, partnerId, partner?.name ?? `Partner ${partnerId}`);
    window.history.replaceState(null, "", "/partner/admin");
  }, [authed, openPartnerModal, partners]);

  if (visible === 0) return null;

  if (!authed || unauthorized || partners === undefined) {
    return (
      <div className="merchant-page">
        <PartnerAdminToolbar />
        <h1>Partner 管理</h1>
        <p className="merchant-note">
          {unauthorized
            ? "当前账号无 Partner 权限，正在退出并打开登录…（若刚被加入团队，请确认用 partner_staff 账号在本页登录，勿使用平台运营账号。）"
            : !authed
              ? "请通过登录窗口使用 partner_staff 账号登录。"
              : "加载中…"}
        </p>
        {partnerModals}
      </div>
    );
  }

  return (
    <div className="merchant-page">
      <PartnerAdminToolbar />
      <h1>Partner 管理</h1>
      <p className="merchant-note">
        管理您被授权的平台合作方（Partner）：资料、登录渠道、团队；若开通 campaignOps，还可管理活动 / 券 / 品牌 /
        门店。Partner 由平台运营创建，不能在此自助注册。
      </p>

      <section>
        <h2>我有权限的 Partner</h2>
        <p className="merchant-note">
          下列是您作为 <code>partner_staff</code> 可管理的合作方。若您同时在多个 Partner 团队，会全部列出。
        </p>
        {partners.map((p) => {
          const caps = p.capabilities ?? { portalGames: false, campaignOps: false };
          return (
            <article key={p.pid} className="merchant-card">
              <strong>{p.name}</strong>
              <p className="merchant-note">
                PID {p.pid}
                {p.host ? ` · ${p.host}` : ""}
                {p.slug ? ` · /campaign/${p.slug}` : ""} · 角色 {p.role}
                {caps.portalGames ? " · Portal" : ""}
                {caps.campaignOps ? " · CampaignOps" : ""}
              </p>
              {!caps.campaignOps ? (
                <p className="merchant-note">
                  未开通 campaignOps：无法管理活动 / 券 / 品牌 / 门店。请在{" "}
                  <a href="/platform/admin">/platform/admin</a> 为该 Partner 开启 campaignOps
                  并设置 slug，或本地运行 <code>npm run campaign:setup:dev</code>。
                </p>
              ) : null}
              <PartnerAdminPartnerNav
                partnerId={p.pid}
                campaignOps={caps.campaignOps}
                portalGames={caps.portalGames}
                onSectionClick={(section, partnerId) =>
                  openPartnerModal(section, partnerId, p.name)
                }
              />
            </article>
          );
        })}
      </section>
      {partnerModals}
    </div>
  );
};

export default PartnerAdminHomePage;
