import { PageProp } from "host/RenderApp";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useMemo, useRef, useState } from "react";

import type { CasualGameHistoryRow } from "../../service/useCasualPlatformManager";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualPageShell from "../shell/CasualPageShell";
import "../shared/casualEconomyPages.css";
import "./casualHistoryTab.css";

function formatMatchType(matchType: string): string {
  switch (matchType) {
    case "tournament_a":
      return "A 场";
    case "tournament_b":
      return "B 场";
    case "tournament_c":
      return "C 场";
    case "season_challenge":
      return "赛季专场";
    default:
      return matchType;
  }
}

function formatPendingRewardsSummary(row: {
  pendingRunRewards?: {
    coins?: number;
    gems?: number;
    seasonVoucher?: number;
  } | null;
}): string | null {
  const p = row.pendingRunRewards;
  if (!p) return null;
  const parts: string[] = [];
  if ((p.coins ?? 0) > 0) parts.push(`${p.coins} 金币`);
  if ((p.gems ?? 0) > 0) parts.push(`${p.gems} 钻`);
  if ((p.seasonVoucher ?? 0) > 0) parts.push(`${p.seasonVoucher} 赛季券`);
  return parts.length ? parts.join(" · ") : null;
}

const CasualHistoryTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    gameHistory,
    claimCasualRunRewards,
    claimCasualScoreTierPendingRewardsBatch,
    claimCasualInstanceRewards,
  } = useCasualPlatform();
  const { user } = useUserManager();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimErrorId, setClaimErrorId] = useState<string | null>(null);

  const onClaim = useCallback(
    async (row: CasualGameHistoryRow) => {
      setClaimErrorId(null);
      setClaimingId(row.entryId);
      try {
        let r: { ok: boolean; error?: string };
        if (row.historyRewardKind === "score_tier_pending") {
          r = await claimCasualScoreTierPendingRewardsBatch(
            row.scoreTierPendingIds ?? [row.entryId]
          );
        } else if (row.historyRewardKind === "instance_close_pending") {
          r = await claimCasualInstanceRewards(row.entryId);
        } else {
          r = await claimCasualRunRewards(row.entryId);
        }
        if (!r.ok) {
          setClaimErrorId(row.entryId);
        }
      } finally {
        setClaimingId(null);
      }
    },
    [claimCasualRunRewards, claimCasualScoreTierPendingRewardsBatch, claimCasualInstanceRewards]
  );

  const emptyText = useMemo(() => {
    if (!user?.uid) return "登录后可查看你的游戏历史记录。";
    return "还没有历史记录，先去 Play 里完成一局吧。";
  }, [user?.uid]);

  return (
    <CasualPageShell
      title="游戏历史记录"
      titleId="casual-tab-history"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <section className="casual-econ casual-history-tab">
        {gameHistory.length === 0 ? (
          <div className="casual-history-tab__empty">{emptyText}</div>
        ) : null}
        {gameHistory.length > 0 ? (
          <ul className="casual-history-tab__list">
            {gameHistory.map((row) => {
              const rewardHint = formatPendingRewardsSummary(row);
              const isTier = row.historyRewardKind === "score_tier_pending";
              const isInstanceClose = row.historyRewardKind === "instance_close_pending";
              const claimLabel = isTier
                ? "领取分档奖励"
                : isInstanceClose
                  ? "领取周期奖励"
                  : "领取奖励";
              return (
                <li
                  key={`${row.historyRewardKind ?? "run_pending"}-${row.entryId}`}
                  className="casual-history-tab__item"
                >
                  <div className="casual-history-tab__head">
                    <strong>{row.title}</strong>
                    <span>{formatMatchType(row.matchType)}</span>
                  </div>
                  <div className="casual-history-tab__meta">
                    <span>游戏：{row.gameId}</span>
                    <span>分数：{row.score ?? "-"}</span>
                    <span>名次：{row.rank != null ? row.rank : "-"}</span>
                    <span>参与人数：{row.participantCount ?? "-"}</span>
                    <span>状态：{row.entryStatus === "submitted" ? "已提交" : "进行中"}</span>
                    {(isTier || isInstanceClose) && row.periodInstanceKey != null ? (
                      <span>桶：{row.periodInstanceKey}</span>
                    ) : null}
                    {isTier && row.matchGameId ? (
                      <span>对局 gameId：{row.matchGameId}</span>
                    ) : null}
                    {isInstanceClose && row.submittedAt != null ? (
                      <span>周期结束：{new Date(row.submittedAt).toLocaleString()}</span>
                    ) : null}
                    <span>
                      开场：
                      {row.runStartedAt != null
                        ? new Date(row.runStartedAt).toLocaleString()
                        : "-"}
                    </span>
                    <span>
                      提交：
                      {row.submittedAt && !isInstanceClose
                        ? new Date(row.submittedAt).toLocaleString()
                        : row.submittedAt && isInstanceClose
                          ? "—"
                          : "-"}
                    </span>
                  </div>
                  {row.canClaimReward ? (
                    <div className="casual-history-tab__claim">
                      {rewardHint ? <p className="casual-history-tab__reward-hint">{rewardHint}</p> : null}
                      <button
                        type="button"
                        className="casual-history-tab__claim-btn"
                        disabled={claimingId === row.entryId}
                        onClick={() => void onClaim(row)}
                      >
                        {claimingId === row.entryId ? "领取中…" : claimLabel}
                      </button>
                      {claimErrorId === row.entryId ? (
                        <span className="casual-history-tab__claim-err">领取失败，请稍后重试</span>
                      ) : null}
                    </div>
                  ) : null}
                  {isInstanceClose && !row.canClaimReward ? (
                    row.rewardsClaimedAt != null ? (
                      <div className="casual-history-tab__claimed-hint">周期奖励已领取</div>
                    ) : (
                      <div className="casual-history-tab__claimed-hint">本周期结算完成（无待领奖励）</div>
                    )
                  ) : null}
                  {!isInstanceClose &&
                  !row.canClaimReward &&
                  row.rewardsClaimedAt != null &&
                  !rewardHint ? (
                    <div className="casual-history-tab__claimed-hint">奖励已领取</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </CasualPageShell>
  );
};

export default CasualHistoryTab;
