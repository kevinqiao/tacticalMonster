import { PageProp } from "host/RenderApp";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useMemo, useRef, useState } from "react";

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
    seasonChallengePoints?: number;
    seasonVoucher?: number;
  } | null;
}): string | null {
  const p = row.pendingRunRewards;
  if (!p) return null;
  const parts: string[] = [];
  if ((p.coins ?? 0) > 0) parts.push(`${p.coins} 金币`);
  if ((p.gems ?? 0) > 0) parts.push(`${p.gems} 钻`);
  if ((p.seasonChallengePoints ?? 0) > 0) parts.push(`${p.seasonChallengePoints} 挑战点`);
  if ((p.seasonVoucher ?? 0) > 0) parts.push(`${p.seasonVoucher} 赛季券`);
  return parts.length ? parts.join(" · ") : null;
}

function formatInstanceRewardsSummary(row: {
  pendingInstanceRewards?: {
    coins?: number;
    gems?: number;
    seasonChallengePoints?: number;
    seasonVoucher?: number;
  };
}): string | null {
  const p = row.pendingInstanceRewards;
  if (!p) return null;
  const parts: string[] = [];
  if ((p.coins ?? 0) > 0) parts.push(`${p.coins} 金币`);
  if ((p.gems ?? 0) > 0) parts.push(`${p.gems} 钻`);
  if ((p.seasonChallengePoints ?? 0) > 0) parts.push(`${p.seasonChallengePoints} 挑战点`);
  if ((p.seasonVoucher ?? 0) > 0) parts.push(`${p.seasonVoucher} 赛季券`);
  return parts.length ? parts.join(" · ") : null;
}

const CasualHistoryTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { gameHistory, instancePendingClaims, claimCasualRunRewards, claimCasualInstanceRewards } =
    useCasualPlatform();
  const { user } = useUserManager();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimErrorId, setClaimErrorId] = useState<string | null>(null);
  const [claimingInstId, setClaimingInstId] = useState<string | null>(null);
  const [claimInstErrId, setClaimInstErrId] = useState<string | null>(null);

  const onClaimInstance = useCallback(
    async (instancePlayerStateId: string) => {
      setClaimInstErrId(null);
      setClaimingInstId(instancePlayerStateId);
      try {
        const r = await claimCasualInstanceRewards(instancePlayerStateId);
        if (!r.ok) {
          setClaimInstErrId(instancePlayerStateId);
        }
      } finally {
        setClaimingInstId(null);
      }
    },
    [claimCasualInstanceRewards]
  );

  const onClaim = useCallback(
    async (playerTournamentId: string) => {
      setClaimErrorId(null);
      setClaimingId(playerTournamentId);
      try {
        const r = await claimCasualRunRewards(playerTournamentId);
        if (!r.ok) {
          setClaimErrorId(playerTournamentId);
        }
      } finally {
        setClaimingId(null);
      }
    },
    [claimCasualRunRewards]
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
        {instancePendingClaims.length > 0 ? (
          <div className="casual-history-tab__instance-claims" style={{ marginBottom: "1.25rem" }}>
            <h3 className="casual-history-tab__subhead">周期锦标奖励</h3>
            <ul className="casual-history-tab__list">
              {instancePendingClaims.map((row) => {
                const hint = formatInstanceRewardsSummary(row);
                return (
                  <li key={row.instancePlayerStateId} className="casual-history-tab__item">
                    <div className="casual-history-tab__head">
                      <strong>{row.title}</strong>
                      <span>桶 {row.instanceKey}</span>
                    </div>
                    <div className="casual-history-tab__meta">
                      <span>周期总榜名次：{row.finalRank != null ? row.finalRank : "-"}</span>
                      <span>聚合分：{row.aggregatedScore != null ? row.aggregatedScore : "-"}</span>
                    </div>
                    {row.canClaim ? (
                      <div className="casual-history-tab__claim">
                        {hint ? <p className="casual-history-tab__reward-hint">{hint}</p> : null}
                        <button
                          type="button"
                          className="casual-history-tab__claim-btn"
                          disabled={claimingInstId === row.instancePlayerStateId}
                          onClick={() => void onClaimInstance(row.instancePlayerStateId)}
                        >
                          {claimingInstId === row.instancePlayerStateId ? "领取中…" : "领取周期奖励"}
                        </button>
                        {claimInstErrId === row.instancePlayerStateId ? (
                          <span className="casual-history-tab__claim-err">领取失败，请稍后重试</span>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {gameHistory.length === 0 && instancePendingClaims.length === 0 ? (
          <div className="casual-history-tab__empty">{emptyText}</div>
        ) : null}
        {gameHistory.length > 0 ? (
          <ul className="casual-history-tab__list">
            {gameHistory.map((row) => {
              const rewardHint = formatPendingRewardsSummary(row);
              return (
                <li key={row.entryId} className="casual-history-tab__item">
                  <div className="casual-history-tab__head">
                    <strong>{row.title}</strong>
                    <span>{formatMatchType(row.matchType)}</span>
                  </div>
                  <div className="casual-history-tab__meta">
                    <span>游戏：{row.gameId}</span>
                    {row.periodTournament ? (
                      <span>
                        周期场
                        {row.periodInstanceKey ? `（${row.periodInstanceKey}）` : ""}
                        · 榜与金币等奖励在周期结束后统一结算
                      </span>
                    ) : null}
                    <span>分数：{row.score ?? "-"}</span>
                    <span>名次：{row.rank != null ? row.rank : "-"}</span>
                    <span>参与人数：{row.participantCount ?? "-"}</span>
                    <span>状态：{row.entryStatus === "submitted" ? "已提交" : "进行中"}</span>
                    <span>
                      开场：
                      {row.runStartedAt != null
                        ? new Date(row.runStartedAt).toLocaleString()
                        : "-"}
                    </span>
                    <span>
                      提交：
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}
                    </span>
                  </div>
                  {row.canClaimReward ? (
                    <div className="casual-history-tab__claim">
                      {rewardHint ? <p className="casual-history-tab__reward-hint">{rewardHint}</p> : null}
                      <button
                        type="button"
                        className="casual-history-tab__claim-btn"
                        disabled={claimingId === row.entryId}
                        onClick={() => void onClaim(row.entryId)}
                      >
                        {claimingId === row.entryId ? "领取中…" : "Claim reward"}
                      </button>
                      {claimErrorId === row.entryId ? (
                        <span className="casual-history-tab__claim-err">领取失败，请稍后重试</span>
                      ) : null}
                    </div>
                  ) : null}
                  {!row.canClaimReward && row.rewardsClaimedAt != null && !rewardHint ? (
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
