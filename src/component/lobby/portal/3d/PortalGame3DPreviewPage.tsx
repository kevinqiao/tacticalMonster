import React from "react";

import { PortalGame3DInner } from "./PortalGame3DInner";
import { PortalGame3DShadowHost } from "./PortalGame3DShadowHost";
import { resolvePortal3DHeroLogo } from "./portalGame3DTheme";

type PortalGame3DPreviewPageProps = {
  visible: number;
};

/** /portal/preview 静态视觉稿：无 Provider、无 Convex、无业务弹窗。 */
export default function PortalGame3DPreviewPage({
  visible,
}: PortalGame3DPreviewPageProps) {
  const heroLogoUrl = resolvePortal3DHeroLogo("solitaire");

  return (
    <PortalGame3DShadowHost>
      <PortalGame3DInner
        heroLogoUrl={heroLogoUrl}
        authed
        tier={{
          tierId: "silver",
          tierLabel: "白银 III",
          division: "III",
          cohortNo: "A3K9M2X7",
          rank: 12,
          cohortSize: 50,
          points: 245,
          projectedCoins: 80,
        }}
        coinBalance={1240}
        weekEndsAt={Date.now() + 3 * 86400000}
        pageActive={visible > 0}
        onJoin={() => {}}
        onOpenRules={() => {}}
        onOpenLeaderboard={() => {}}
        onOpenFullHistory={() => {}}
        onOpenShop={() => {}}
        onSignIn={() => {}}
        onSignOut={() => {}}
        showAuthButton
      />
    </PortalGame3DShadowHost>
  );
}
