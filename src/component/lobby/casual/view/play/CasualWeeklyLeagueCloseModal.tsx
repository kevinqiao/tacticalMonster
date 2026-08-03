import { ModalProp } from "host/service/ModalManager";
import React, { useCallback, useState } from "react";

import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { casualLadderTierLabel } from "./casualSeasonLadderLabels";
import "./casualWeeklyLeagueCloseModal.css";

export type CasualWeeklyLeagueCloseModalData = {
  outcome?: "promote" | "safe" | "demote";
  finalRank?: number;
  pendingRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  };
};

function outcomeLabel(outcome?: string): string {
  if (outcome === "promote") return "晋级";
  if (outcome === "demote") return "降级";
  return "保级";
}

const CasualWeeklyLeagueCloseModal: React.FC<ModalProp> = ({ visible, close, data }) => {
  const casual = useCasualPlatform();
  const payload = (data ?? {}) as CasualWeeklyLeagueCloseModalData;
  const snap = casual.weeklyLeagueSnapshot;
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const rewards = payload.pendingRewards ?? snap?.pendingRewards;
  const canClaim = Boolean(rewards && !claimed);

  const onClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const r = await casual.claimWeeklyLeagueRewards();
      if (r.ok) setClaimed(true);
    } finally {
      setClaiming(false);
    }
  }, [casual]);

  const onDismiss = useCallback(async () => {
    await casual.dismissWeeklyLeagueClose();
    close();
  }, [casual, close]);

  if (!visible) return null;

  return (
    <div className="casual-wl-close">
      <h2 className="casual-wl-close__title">周联赛结算</h2>
      <p className="casual-wl-close__sub">
        {outcomeLabel(payload.outcome ?? snap?.lastOutcome)}
        {payload.finalRank ? ` · 第 ${payload.finalRank} 名` : null}
      </p>
      {snap?.leagueTierId ? (
        <p className="casual-wl-close__tier">
          当前段位：{casualLadderTierLabel(snap.leagueTierId)}
        </p>
      ) : null}
      {rewards ? (
        <ul className="casual-wl-close__rewards">
          {(rewards.coins ?? 0) > 0 ? <li>{rewards.coins} 金币</li> : null}
          {(rewards.gems ?? 0) > 0 ? <li>{rewards.gems} 钻</li> : null}
          {(rewards.seasonVoucher ?? 0) > 0 ? <li>{rewards.seasonVoucher} 赛季券</li> : null}
        </ul>
      ) : (
        <p className="casual-wl-close__empty">本周无额外奖励</p>
      )}
      <div className="casual-wl-close__actions">
        {canClaim ? (
          <button type="button" className="casual-wl-close__btn" disabled={claiming} onClick={() => void onClaim()}>
            {claiming ? "领取中…" : "领取奖励"}
          </button>
        ) : null}
        <button type="button" className="casual-wl-close__btn casual-wl-close__btn--ghost" onClick={() => void onDismiss()}>
          知道了
        </button>
      </div>
    </div>
  );
};

export default CasualWeeklyLeagueCloseModal;
