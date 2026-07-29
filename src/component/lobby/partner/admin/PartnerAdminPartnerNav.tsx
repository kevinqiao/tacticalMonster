import React from "react";

export type PartnerAdminSection =
  | "profile"
  | "auth"
  | "team"
  | "brand"
  | "shop"
  | "redeem"
  | "campaigns";

type PartnerAdminPartnerNavProps = {
  partnerId: number;
  /** When false, campaign ops sections are hidden (CrazyGames-clean). */
  campaignOps?: boolean;
  /** Enables Portal shop/redeem operations. */
  portalGames?: boolean;
  onSectionClick: (section: PartnerAdminSection, partnerId: number) => void;
};

/** Per-partner shortcuts — all open in modals on /partner/admin */
const PartnerAdminPartnerNav: React.FC<PartnerAdminPartnerNavProps> = ({
  partnerId,
  campaignOps = false,
  portalGames = false,
  onSectionClick,
}) => (
  <nav className="merchant-nav">
    <button
      type="button"
      className="merchant-link-btn"
      onClick={() => onSectionClick("profile", partnerId)}
    >
      资料
    </button>
    <button
      type="button"
      className="merchant-link-btn"
      onClick={() => onSectionClick("auth", partnerId)}
    >
      登录配置
    </button>
    <button
      type="button"
      className="merchant-link-btn"
      onClick={() => onSectionClick("team", partnerId)}
    >
      团队
    </button>
    <button
      type="button"
      className="merchant-link-btn"
      onClick={() => onSectionClick("brand", partnerId)}
    >
      品牌
    </button>
    {portalGames ? (
      <button
        type="button"
        className="merchant-link-btn"
        onClick={() => onSectionClick("shop", partnerId)}
      >
        商店
      </button>
    ) : null}
    {portalGames ? (
      <button
        type="button"
        className="merchant-link-btn"
        onClick={() => onSectionClick("redeem", partnerId)}
      >
        核销
      </button>
    ) : null}
    {campaignOps ? (
      <button
        type="button"
        className="merchant-link-btn"
        onClick={() => onSectionClick("campaigns", partnerId)}
      >
        活动
      </button>
    ) : null}
  </nav>
);

export default PartnerAdminPartnerNav;
