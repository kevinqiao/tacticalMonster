import React from "react";

export type PartnerAdminSection = "profile" | "auth" | "team" | "merchant" | "portal";

type PartnerAdminPartnerNavProps = {
  partnerId: number;
  onSectionClick: (section: PartnerAdminSection, partnerId: number) => void;
};

/** Per-partner shortcuts — all open in modals on /partner/admin */
const PartnerAdminPartnerNav: React.FC<PartnerAdminPartnerNavProps> = ({
  partnerId,
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
      登录渠道
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
      onClick={() => onSectionClick("merchant", partnerId)}
    >
      商户管理
    </button>
    <button
      type="button"
      className="merchant-link-btn"
      onClick={() => onSectionClick("portal", partnerId)}
    >
      Portal 游戏
    </button>
  </nav>
);

export default PartnerAdminPartnerNav;
