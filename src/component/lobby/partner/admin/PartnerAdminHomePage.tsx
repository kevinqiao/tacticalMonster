import React, { useEffect } from "react";

import { PageProp } from "host/RenderApp";

import WebSignInForm from "../../shared/WebSignInForm";
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

  useEffect(() => {
    if (!authed || partners === undefined) return;

    const params = new URLSearchParams(window.location.search);
    const partnerId = Number(params.get("partnerId"));
    const section = params.get("section");
    if (!Number.isFinite(partnerId) || partnerId <= 0 || !isPartnerAdminModalSection(section)) {
      return;
    }

    const partner = partners.find((p) => p.pid === partnerId);
    openPartnerModal(section, partnerId, partner?.name ?? `Partner ${partnerId}`);
    window.history.replaceState(null, "", "/partner/admin");
  }, [authed, openPartnerModal, partners]);

  if (visible === 0) return null;

  return (
    <div className="merchant-page">
      <PartnerAdminToolbar />
      <h1>Partner 管理</h1>
      <p className="merchant-note">
        管理您被授权的平台合作方（Partner）配置：资料、登录渠道、团队成员与商户 Campaign。Partner 由平台运营创建，不能在此自助注册新 Partner。
      </p>

      {!authed ? (
        <WebSignInForm
          staffGate="partner"
          description="使用 accountId / 密码登录；须为 partner_staff 成员。"
        />
      ) : (
        <section>
          <h2>我有权限的 Partner</h2>
          <p className="merchant-note">
            下列是您作为 <code>partner_staff</code> 可管理的合作方。若您同时在多个 Partner 团队，会全部列出。
          </p>
          {partners === undefined ? (
            <p className="merchant-note">加载中…</p>
          ) : partners.length === 0 ? (
            <p className="merchant-note">
              您尚未被加入任何 Partner 团队。请联系平台运营在{" "}
              <a href="/platform/admin">/platform/admin</a> 创建 Partner 并添加成员。
            </p>
          ) : (
            partners.map((p) => (
              <article key={p.pid} className="merchant-card">
                <strong>{p.name}</strong>
                <p className="merchant-note">
                  PID {p.pid}
                  {p.host ? ` · ${p.host}` : ""} · 角色 {p.role}
                </p>
                <PartnerAdminPartnerNav
                  partnerId={p.pid}
                  onSectionClick={(section, partnerId) =>
                    openPartnerModal(section, partnerId, p.name)
                  }
                />
              </article>
            ))
          )}
        </section>
      )}
      {partnerModals}
    </div>
  );
};

export default PartnerAdminHomePage;
