import { getTournamentDefinition } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import type { CasualScoreTierRewardEntry } from "@/convex/casualPlatform/convex/data/casualTournamentRewardTypes";
import { ModalProp } from "host/service/ModalManager";
import { useUserManager } from "host/service/UserManager";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import type { CasualGameKind } from "../../service/casualOpenRunAssignment";
import {
  casualGameKindDisplayName,
  dailySoloTournamentIdForKind,
} from "../../service/casualOpenRunAssignment";

import type { CasualGameHistoryRow } from "../../service/useCasualPlatformManager";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "./casualDailySoloLeaderboardModal.css";

export type CasualDailySoloLeaderboardModalData = {
  gameKind: CasualGameKind;
};

type LbRow = { rank: number; uid: string; score: number; submittedAt?: number };

type SelfStanding = {
  instanceKey: string | null;
  myBestScore: number | null;
  myRank: number | null;
};

function displayUid(uid: string, selfUid: string | undefined): string {
  if (selfUid && uid === selfUid) return "我";
  if (uid.length <= 10) return uid;
  return `${uid.slice(0, 4)}…${uid.slice(-4)}`;
}

function formatTierRewardBrief(t: CasualScoreTierRewardEntry): string {
  const c = t.coins ?? 0;
  const g = t.gems ?? 0;
  if (g > 0) return `${c} 金币、${g} 钻`;
  return `${c} 金币`;
}

function scoreTierTimingNote(
  timing: "on_each_run_settled" | "period_instance_close" | undefined
): string {
  if (timing === "on_each_run_settled") {
    return "分数档在每局结算后按本作分数命中对应档位（可多条累计；领取入口以游戏内历史 / 待领为准）。";
  }
  return "分数档在日榜桶收尾时按你在桶内聚合最高分命中最高满足的一档。";
}

/** 当前日榜桶内、可领取且包含该分档阈值的历史行（含合并多档 bundle） */
function findScoreTierClaimTarget(
  gameHistory: CasualGameHistoryRow[],
  tournamentId: string,
  instanceKey: string | null,
  minScore: number
): { minScores: number[]; pendingIds: string[] } | null {
  if (instanceKey == null) return null;
  for (const row of gameHistory) {
    if (row.tournamentId !== tournamentId) continue;
    if (row.periodInstanceKey !== instanceKey) continue;
    if (row.historyRewardKind !== "score_tier_pending") continue;
    if (!row.canClaimReward) continue;
    const mins =
      row.scoreTierMinScores && row.scoreTierMinScores.length > 0
        ? row.scoreTierMinScores
        : row.scoreTierMinScore != null
          ? [row.scoreTierMinScore]
          : [];
    if (!mins.includes(minScore)) continue;
    const pendingIds =
      row.scoreTierPendingIds && row.scoreTierPendingIds.length > 0
        ? row.scoreTierPendingIds
        : [row.entryId];
    return { minScores: mins, pendingIds };
  }
  return null;
}

const CasualDailySoloLeaderboardModal: React.FC<ModalProp> = ({ visible, close, data }) => {
  const casual = useCasualPlatform();
  const { user } = useUserManager();
  const payload = data as CasualDailySoloLeaderboardModalData | undefined;
  const gameKind: CasualGameKind =
    payload?.gameKind === "block_blast" ||
    payload?.gameKind === "tower_arena" ||
    payload?.gameKind === "match_3"
      ? payload.gameKind
      : "solitaire";
  const tournamentId = dailySoloTournamentIdForKind(gameKind);
  const title = casualGameKindDisplayName(gameKind);

  const def = useMemo(() => getTournamentDefinition(tournamentId), [tournamentId]);
  const tiersSortedDesc = useMemo(() => {
    const raw = def?.rewards.scoreTierRewards;
    if (!raw?.length) return [];
    return [...raw].sort((a, b) => b.minScore - a.minScore);
  }, [def]);

  const [rows, setRows] = useState<LbRow[]>([]);
  const [selfStanding, setSelfStanding] = useState<SelfStanding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingMinScore, setClaimingMinScore] = useState<number | null>(null);
  /** 领取成功后立即标记为已领取，避免订阅滞后仍显示「领取奖励」 */
  const [optimisticClaimedMinScores, setOptimisticClaimedMinScores] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!casual.convexUrl) {
      setRows([]);
      setSelfStanding(null);
      setError("未配置休闲服");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const uid = user?.uid;
      const [list, standing] = await Promise.all([
        casual.fetchLeaderboard(tournamentId, 50) as Promise<LbRow[]>,
        uid
          ? casual.fetchPeriodInstanceSelfStanding(tournamentId, uid)
          : Promise.resolve<SelfStanding>({
              instanceKey: null,
              myBestScore: null,
              myRank: null,
            }),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setSelfStanding(standing);
    } catch {
      setError("加载失败");
      setRows([]);
      setSelfStanding(null);
    } finally {
      setLoading(false);
    }
  }, [casual.convexUrl, casual.fetchLeaderboard, casual.fetchPeriodInstanceSelfStanding, tournamentId, user?.uid]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  useEffect(() => {
    setOptimisticClaimedMinScores([]);
  }, [tournamentId, selfStanding?.instanceKey]);

  const onClaimTierRewards = useCallback(
    async (minScore: number) => {
      if (!user?.uid) return;
      const instKey = selfStanding?.instanceKey ?? null;
      const target = findScoreTierClaimTarget(casual.gameHistory, tournamentId, instKey, minScore);
      if (!target?.pendingIds.length) return;
      setClaimingMinScore(minScore);
      setError(null);
      try {
        const r = await casual.claimCasualScoreTierPendingRewardsBatch(target.pendingIds);
        if (r?.ok) {
          setOptimisticClaimedMinScores((prev) => [...new Set([...prev, ...target.minScores])]);
        } else {
          setError(
            r?.error === "claim_failed" ? "领取失败，请稍后重试。" : `领取失败：${r?.error ?? "未知错误"}`
          );
        }
      } catch {
        setError("领取失败，请稍后重试。");
      } finally {
        setClaimingMinScore(null);
      }
    },
    [
      user?.uid,
      casual.gameHistory,
      casual.claimCasualScoreTierPendingRewardsBatch,
      tournamentId,
      selfStanding?.instanceKey,
    ]
  );

  const optimisticSet = useMemo(() => new Set(optimisticClaimedMinScores), [optimisticClaimedMinScores]);

  if (!visible) return null;

  const myBest = selfStanding?.myBestScore ?? null;
  const myRank = selfStanding?.myRank ?? null;
  const instanceKey = selfStanding?.instanceKey ?? null;

  return (
    <div className="casual-daily-lb">
      <header className="casual-daily-lb__head">
        <div>
          <h1 className="casual-daily-lb__title">{title} · 今日战况</h1>
          <p className="casual-daily-lb__sub">日榜最高分与分档进度（UTC 日周期）</p>
        </div>
        <button type="button" className="casual-daily-lb__close" onClick={close} aria-label="关闭">
          关闭
        </button>
      </header>

      {error ? <p className="casual-daily-lb__note casual-daily-lb__note--err">{error}</p> : null}

      {loading ? (
        <p className="casual-daily-lb__loading">加载中…</p>
      ) : (
        <div className="casual-daily-lb__body">
          <div className="casual-daily-lb__summary" aria-label="个人今日进度">
            {!user?.uid ? (
              <p className="casual-daily-lb__summaryText">登录后可查看本人今日最高分与分档达成情况。</p>
            ) : (
              <p className="casual-daily-lb__summaryText">
                <span className="casual-daily-lb__summaryK">今日最高</span>{" "}
                <span className="casual-daily-lb__summaryV">{myBest != null ? myBest : "—"}</span>
                {myRank != null ? (
                  <>
                    {" "}
                    <span className="casual-daily-lb__summarySep">·</span>{" "}
                    <span className="casual-daily-lb__summaryK">名次</span>{" "}
                    <span className="casual-daily-lb__summaryV">{myRank}</span>
                  </>
                ) : null}
                {instanceKey ? (
                  <>
                    {" "}
                    <span className="casual-daily-lb__summarySep">·</span>{" "}
                    <span className="casual-daily-lb__summaryBucket" title="当前日榜桶">
                      {instanceKey}
                    </span>
                  </>
                ) : null}
              </p>
            )}
          </div>

          {tiersSortedDesc.length > 0 ? (
            <section className="casual-daily-lb__tiers" aria-labelledby="casual-daily-lb-tiers-title">
              <h2 id="casual-daily-lb-tiers-title" className="casual-daily-lb__sectionTitle">
                分档奖励
              </h2>
              <ul className="casual-daily-lb__tierList">
                {tiersSortedDesc.map((t) => {
                  const reached = myBest != null && myBest >= t.minScore;
                  const claimTarget =
                    user?.uid && instanceKey
                      ? findScoreTierClaimTarget(casual.gameHistory, tournamentId, instanceKey, t.minScore)
                      : null;
                  const canClaimNow =
                    Boolean(claimTarget) && !optimisticSet.has(t.minScore);
                  const claimingHere = claimingMinScore === t.minScore;

                  let action: React.ReactNode;
                  if (!reached) {
                    action = (
                      <span className="casual-daily-lb__tierBadge casual-daily-lb__tierBadge--no">未达</span>
                    );
                  } else if (canClaimNow) {
                    action = (
                      <button
                        type="button"
                        className="casual-daily-lb__tierClaimBtn"
                        disabled={claimingMinScore !== null}
                        onClick={() => void onClaimTierRewards(t.minScore)}
                      >
                        {claimingHere ? "领取中…" : "领取奖励"}
                      </button>
                    );
                  } else {
                    action = (
                      <span className="casual-daily-lb__tierBadge casual-daily-lb__tierBadge--claimed">
                        已领取
                      </span>
                    );
                  }

                  return (
                    <li key={t.minScore} className="casual-daily-lb__tierRow">
                      <div className="casual-daily-lb__tierMain">
                        <span className="casual-daily-lb__tierScore">≥ {t.minScore}</span>
                        <span className="casual-daily-lb__tierReward">{formatTierRewardBrief(t)}</span>
                      </div>
                      {action}
                    </li>
                  );
                })}
              </ul>
              {def?.rewards.scoreTierRewards?.length ? (
                <p className="casual-daily-lb__tierFoot">
                  {scoreTierTimingNote(def.rewards.scoreTierRewardsGrantTiming)}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="casual-daily-lb__board" aria-labelledby="casual-daily-lb-board-title">
            <h2 id="casual-daily-lb-board-title" className="casual-daily-lb__sectionTitle">
              排行榜
            </h2>
            {rows.length === 0 ? (
              <p className="casual-daily-lb__empty">暂无上榜记录，完成一局后将显示分数。</p>
            ) : (
              <ul className="casual-daily-lb__list" aria-label="排行榜">
                {rows.map((r) => {
                  const mine = Boolean(user?.uid && r.uid === user.uid);
                  return (
                    <li
                      key={`${r.rank}-${r.uid}`}
                      className={`casual-daily-lb__row${mine ? " casual-daily-lb__row--self" : ""}`}
                    >
                      <span className="casual-daily-lb__rank">{r.rank}</span>
                      <span className="casual-daily-lb__uid">{displayUid(r.uid, user?.uid)}</span>
                      <span className="casual-daily-lb__score">{r.score}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default CasualDailySoloLeaderboardModal;
