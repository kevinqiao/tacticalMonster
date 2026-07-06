import React, { useCallback, useState } from "react";

import { portalTierDisplayLabel, type PortalTierId } from "./portalGame3DTheme";
import type { PortalWeeklyCloseDisplay } from "./portalWeeklyCloseDisplay";

function outcomeLabel(outcome?: string): string {
  if (outcome === "promote") return "晋级";
  if (outcome === "demote") return "降级";
  return "保级";
}

type PortalWeeklyLeagueClosePanelProps = {
  display: PortalWeeklyCloseDisplay | null;
  tierId?: PortalTierId;
  onClaim: () => Promise<{ ok: boolean; granted?: { coins?: number } }>;
  onDismiss: () => Promise<{ ok: boolean }>;
  onClose: () => void;
  onClaimed?: (coins: number) => void;
};

export function PortalWeeklyLeagueClosePanel({
  display,
  tierId = "bronze",
  onClaim,
  onDismiss,
  onClose,
  onClaimed,
}: PortalWeeklyLeagueClosePanelProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const rewards = display?.pendingRewards;
  const canClaim = Boolean(rewards && (rewards.coins ?? 0) > 0 && !claimed);
  const { tierLabel } = portalTierDisplayLabel(tierId);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const r = await onClaim();
      if (r.ok) {
        setClaimed(true);
        const coins = r.granted?.coins ?? rewards?.coins ?? 0;
        if (coins > 0) onClaimed?.(coins);
        onClose();
      }
    } finally {
      setClaiming(false);
    }
  }, [onClaim, onClaimed, onClose, rewards?.coins]);

  const handleDismiss = useCallback(async () => {
    await onDismiss();
    onClose();
  }, [onDismiss, onClose]);

  if (!display) {
    return (
      <div className="portal-wl-close">
        <p className="portal-wl-close__empty">暂无结算信息</p>
      </div>
    );
  }

  return (
    <div className="portal-wl-close">
      <h2 className="portal-wl-close__title">周联赛结算</h2>
      <p className="portal-wl-close__sub">
        {outcomeLabel(display.outcome)}
        {display.finalRank ? ` · 第 ${display.finalRank} 名` : null}
      </p>
      <p className="portal-wl-close__tier">当前段位：{tierLabel}</p>
      {rewards && (rewards.coins ?? 0) > 0 ? (
        <p className="portal-wl-close__rewards">🪙 {rewards.coins} 金币</p>
      ) : (
        <p className="portal-wl-close__empty">本周无额外奖励</p>
      )}
      <div className="portal-wl-close__actions">
        {canClaim ? (
          <button
            type="button"
            className="portal-wl-close__btn"
            disabled={claiming}
            onClick={() => void handleClaim()}
          >
            {claiming ? "领取中…" : "领取奖励"}
          </button>
        ) : null}
        <button
          type="button"
          className="portal-wl-close__btn portal-wl-close__btn--ghost"
          onClick={() => void handleDismiss()}
        >
          稍后再领
        </button>
      </div>
    </div>
  );
}
