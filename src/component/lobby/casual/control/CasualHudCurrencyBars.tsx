import { usePageManager } from "host/service/PageManager";
import React, { useCallback } from "react";

import { formatResourceAmount, HeadHudResourceChip } from "../../tactical/control/head/HeadHudResourceChip";
import { HEAD_NAV_DESKTOP_ICONS } from "../../tactical/control/head/HeadNavDesktopConfig";
import type { CasualPlayerSummary } from "../service/useCasualPlatformManager";
import { CASUAL_HEAD_NAV_URI } from "./HeadNavSharedCasual";

/** 与 tactical 顶栏 `head-nav-hud__currencies` 同款：双资源条 +「+」进商店 */
export const CasualHudCurrencyBars: React.FC<{ player: CasualPlayerSummary | null }> = ({
  player,
}) => {
  const { openPage } = usePageManager();
  const shopUri = CASUAL_HEAD_NAV_URI[0];

  const onAddResource = useCallback(() => {
    openPage({ uri: shopUri });
  }, [openPage, shopUri]);

  const coinIcon = HEAD_NAV_DESKTOP_ICONS[0] ?? "";
  const gemIcon = HEAD_NAV_DESKTOP_ICONS[1] ?? "";

  return (
    <div className="head-nav-hud__currencies" aria-label="Currencies">
      <HeadHudResourceChip
        amountLabel={formatResourceAmount(player?.coins)}
        glyphSrc={coinIcon}
        onAdd={onAddResource}
        addAriaLabel="打开商店（金币）"
      />
      <HeadHudResourceChip
        amountLabel={formatResourceAmount(player?.gems)}
        glyphSrc={gemIcon}
        onAdd={onAddResource}
        addAriaLabel="打开商店（钻石）"
      />
    </div>
  );
};
