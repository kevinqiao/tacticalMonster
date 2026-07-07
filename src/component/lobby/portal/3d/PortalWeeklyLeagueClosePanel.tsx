import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { portalTierDisplayLabel, type PortalTierId } from "./portalGame3DTheme";
import type { PortalWeeklyCloseDisplay } from "./portalWeeklyCloseDisplay";

function outcomeLabel(
  outcome: string | undefined,
  t: (key: string) => string
): string {
  if (outcome === "promote") return t("weeklyLeague.outcome.promote");
  if (outcome === "demote") return t("weeklyLeague.outcome.demote");
  return t("weeklyLeague.outcome.keep");
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
  const { t } = useTranslation("portal.player");
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
        <p className="portal-wl-close__empty">{t("weeklyLeague.emptyInfo")}</p>
      </div>
    );
  }

  return (
    <div className="portal-wl-close">
      <h2 className="portal-wl-close__title">{t("weeklyLeague.title")}</h2>
      <p className="portal-wl-close__sub">
        {outcomeLabel(display.outcome, t)}
        {display.finalRank
          ? t("weeklyLeague.finalRank", { rank: display.finalRank })
          : null}
      </p>
      <p className="portal-wl-close__tier">
        {t("weeklyLeague.currentTier", { tier: tierLabel })}
      </p>
      {rewards && (rewards.coins ?? 0) > 0 ? (
        <p className="portal-wl-close__rewards">
          {t("weeklyLeague.rewardCoins", { coins: rewards.coins })}
        </p>
      ) : (
        <p className="portal-wl-close__empty">{t("weeklyLeague.noExtraReward")}</p>
      )}
      <div className="portal-wl-close__actions">
        {canClaim ? (
          <button
            type="button"
            className="portal-wl-close__btn"
            disabled={claiming}
            onClick={() => void handleClaim()}
          >
            {claiming ? t("weeklyLeague.claiming") : t("weeklyLeague.claim")}
          </button>
        ) : null}
        <button
          type="button"
          className="portal-wl-close__btn portal-wl-close__btn--ghost"
          onClick={() => void handleDismiss()}
        >
          {t("weeklyLeague.dismiss")}
        </button>
      </div>
    </div>
  );
}
