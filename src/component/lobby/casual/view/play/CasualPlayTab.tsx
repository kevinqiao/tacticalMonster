import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  casualSettleBaseCoins,
  casualSettleBaseGems,
  effectiveEntryBilling,
  getTournamentDefinition,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import CasualSkinEquipPanel from "component/battle/games/shared/visualTheme/CasualSkinEquipPanel";
import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { usePageManager } from "host/service/PageManager";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  gameKindFromTemplateId,
  hasAnyOpenCasualRunAssignment,
  inferCasualGameKindFromAssignment,
  type CasualGameKind,
} from "../../service/casualOpenRunAssignment";
import {
  CASUAL_MATCH_OPEN_TIMEOUT_MS,
  type AwaitOpenCasualRunMatchWatch,
  useAwaitOpenCasualRunAssignment,
} from "../../service/useAwaitOpenCasualRunAssignment";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import { casualLadderTierLabel } from "./casualSeasonLadderLabels";
import { useSyncedLatestOpenCasualAssignment } from "../../service/useSyncedLatestOpenCasualAssignment";
import { resolveJoinTournamentOutcome } from "../../service/casualJoinTournamentFlow";
import { joinEntryErrorMessage } from "../shared/casualEconomyUi";
import CasualPageShell from "../shell/CasualPageShell";
import CasualPlayMatchOverlay from "./CasualPlayMatchOverlay";
import "./casualPlayTab.css";

function soloEntryHintLine(tournamentId: string): string {
  const d = getTournamentDefinition(tournamentId);
  if (!d) return "日榜最高分";
  if (d.entry.kind === "none") return "日榜最高分 · 免费入场";
  if (d.entry.kind === "coins") {
    const per = effectiveEntryBilling(d) === "per_instance" ? " · 每桶首场" : "";
    return `日榜最高分 · ${d.entry.amount} 金币入场${per}`;
  }
  if (d.entry.kind === "gems") return `日榜最高分 · ${d.entry.amount} 钻入场`;
  return "日榜最高分 · 赛季券入场";
}

function buildSoloCostConfirmLines(
  tournamentId: string,
  preview: {
    dueCoins: number;
    dueGems: number;
    dueVouchers: number;
    entryKind: "none" | "coins" | "gems" | "seasonVouchers";
  }
): string[] {
  const def = getTournamentDefinition(tournamentId);
  const lines: string[] = [];
  if (preview.dueCoins > 0) lines.push(`本次将消耗 ${preview.dueCoins} 金币（入场）。`);
  if (preview.dueGems > 0) lines.push(`本次将消耗 ${preview.dueGems} 钻（入场）。`);
  if (preview.dueVouchers > 0) lines.push(`本次将消耗 ${preview.dueVouchers} 赛季券（入场）。`);
  if (preview.entryKind !== "none" && lines.length === 0) {
    lines.push("本次加入将产生入场消耗（以实际结算为准）。");
  }
  if (def && effectiveEntryBilling(def) === "per_instance") {
    lines.push("同一日榜桶内仅首场扣除上述入场；同桶内再开不重复扣该项。");
  }
  return lines;
}

type SoloDetailSection = { heading: string; bullets: string[] };

function dailySoloTournamentId(kind: CasualGameKind): string {
  return kind === "solitaire"
    ? CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID
    : CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID;
}

/** 单人挑战「详情」弹窗：玩法 / 成本 / 奖励（与 `casualTournamentConfigs` 对齐的简述） */
function buildDailySoloDetailSections(tournamentId: string): SoloDetailSection[] | null {
  const def = getTournamentDefinition(tournamentId);
  if (!def) return null;

  const gameplay: string[] = [
    "本模式为「日榜最高分」异步挑战：以自然日（UTC）为周期桶；当天内多次对局时，仅取你本人最高一次分数参与排名与相关奖励判定。",
    "每局为独立单人局，结算后分数上报至当前日榜桶。",
  ];

  const entry: string[] = [];
  if (def.entry.kind === "none") {
    entry.push("当前配置为免费入场（不扣金币 / 钻 / 赛季券）。");
  } else if (def.entry.kind === "coins") {
    entry.push(`标价：每处入场 ${def.entry.amount} 金币。`);
    if (effectiveEntryBilling(def) === "per_instance") {
      entry.push("扣费方式：同一日榜周期桶内仅首场对局扣除上述入场费；同桶内再开不重复扣该项。");
    } else {
      entry.push("扣费方式：每场加入时按配置扣除。");
    }
  } else if (def.entry.kind === "gems") {
    entry.push(`标价：${def.entry.amount} 钻。`);
    if (effectiveEntryBilling(def) === "per_instance") {
      entry.push("同一日榜桶内仅首场扣除；同桶内再开不重复扣该项。");
    }
  } else {
    entry.push(`标价：${def.entry.amount} 赛季券（走赛季钱包）。`);
  }

  const rewards: string[] = [];
  const baseC = casualSettleBaseCoins(def);
  const baseG = casualSettleBaseGems(def);
  if (baseC > 0 || baseG > 0) {
    rewards.push(
      `每局结算参与奖（以服端为准）：约 ${baseC} 金币${baseG > 0 ? `、${baseG} 钻` : ""}。`
    );
  }
  rewards.push(
    `结算可获得赛季 Pass XP（配置 seasonXpOnSettle=${def.seasonXpOnSettle}，赛季积分榜系数 seasonPointsMultiplier=${def.seasonPointsMultiplier}，以服端为准）。`
  );

  const rr = def.rewards.rankRewards;
  if (rr?.length) {
    rewards.push("日榜周期收尾时按桶内名次发放名次奖（区间如下，以服端结算为准）：");
    for (const row of rr) {
      const [a, b] = row.rankRange;
      const rankLabel = a === b ? `第 ${a} 名` : `第 ${a}–${b} 名`;
      rewards.push(
        `${rankLabel}：${row.coins ?? 0} 金币${(row.gems ?? 0) > 0 ? `、${row.gems} 钻` : ""}。`
      );
    }
  }

  const tiers = def.rewards.scoreTierRewards;
  if (tiers?.length) {
    const timing =
      def.rewards.scoreTierRewardsGrantTiming === "on_each_run_settled"
        ? "分数档在每局结算后按本作分数命中对应档位（可多条累计；领取入口以游戏内历史 / 待领为准）。"
        : "分数档在日榜桶收尾时按你在桶内聚合最高分命中最高满足的一档。";
    rewards.push(`分数档奖励：${timing}`);
    for (const t of tiers) {
      rewards.push(
        `分数 ≥ ${t.minScore}：${t.coins ?? 0} 金币${(t.gems ?? 0) > 0 ? `、${t.gems} 钻` : ""}。`
      );
    }
  }

  return [
    { heading: "玩法机制", bullets: gameplay },
    { heading: "进入成本", bullets: entry },
    { heading: "奖励规则", bullets: rewards },
  ];
}

/** Play：任务列表 · 按「单人挑战 / 多人竞技」分组，各含 Solitaire 与 Block Blast */
const CasualPlayTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const { openPage } = usePageManager();
  const latestOpenAssignment = useSyncedLatestOpenCasualAssignment({
    enabled: visible !== 0 && Boolean(casual.convexUrl),
    openRunAssignments: casual.openRunAssignments,
  });

  const [joiningSolo, setJoiningSolo] = useState<CasualGameKind | null>(null);
  const [awaitingSoloMatch, setAwaitingSoloMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  /** A/B/C 异步场：队列消失后仍订阅 openRunAssignments 直至开桌或超时 */
  const [awaitingAsyncMatch, setAwaitingAsyncMatch] = useState<AwaitOpenCasualRunMatchWatch | null>(null);
  const [soloNote, setSoloNote] = useState<string | null>(null);
  const [soloCostConfirm, setSoloCostConfirm] = useState<{
    kind: CasualGameKind;
    tournamentId: string;
    lines: string[];
  } | null>(null);
  const [soloDetailKind, setSoloDetailKind] = useState<CasualGameKind | null>(null);
  const [leavingMatch, setLeavingMatch] = useState(false);

  const coins = casual.casualPlayer?.coins;
  const gems = casual.casualPlayer?.gems;
  const vouchers =
    casual.passProgress?.seasonVouchers ?? casual.casualPlayer?.seasonVouchers;
  const ladder = casual.seasonLadderSnapshot;

  const openTasksSheet = () => {
    openModal({ name: "casual_tasks_sheet" });
  };

  const openGameTournaments = (gameType: "solitaire" | "block_blast", gameTitle: string) => {
    openModal({
      name: "casual_game_tournaments",
      data: { gameType, gameTitle },
    });
  };

  const openSeasonLeaderboard = () => {
    openModal({
      name: "casual_season_leaderboard",
      data: {},
    });
  };

  const openSoloGame = useCallback(
    (kind: CasualGameKind, tournamentId: string, gameId: string) => {
      openModal({
        name: kind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
        data: {
          casualTournamentId: tournamentId,
          casualMatchGameId: gameId,
        },
      });
    },
    [openModal]
  );

  useAwaitOpenCasualRunAssignment({
    watch: awaitingAsyncMatch ?? awaitingSoloMatch,
    enabled: visible !== 0,
    timeoutMs: awaitingAsyncMatch
      ? CASUAL_MATCH_OPEN_TIMEOUT_MS + 15_000
      : CASUAL_MATCH_OPEN_TIMEOUT_MS,
    openRunAssignments: casual.openRunAssignments,
    onMatched: (hit) => {
      if (awaitingAsyncMatch) {
        setAwaitingAsyncMatch(null);
        setSoloNote(null);
        void casual.refreshCasualPlayer();
        openSoloGame(
          gameKindFromTemplateId(awaitingAsyncMatch.templateId),
          awaitingAsyncMatch.templateId,
          hit.gameId
        );
        return;
      }
      if (!awaitingSoloMatch) return;
      setAwaitingSoloMatch(null);
      setJoiningSolo(null);
      setSoloNote(null);
      void casual.refreshCasualPlayer();
      openSoloGame(awaitingSoloMatch.gameKind, awaitingSoloMatch.templateId, hit.gameId);
    },
    onTimeout: () => {
      if (awaitingAsyncMatch) {
        setAwaitingAsyncMatch(null);
        setSoloNote("匹配超时，请稍后重试。");
        void casual.refreshCasualPlayer();
        return;
      }
      setAwaitingSoloMatch(null);
      setJoiningSolo(null);
      setSoloNote("匹配超时，请稍后重试。");
      void casual.refreshCasualPlayer();
    },
  });

  const runJoinSoloAfterPreview = useCallback(
    async (
      kind: CasualGameKind,
      tournamentId: string,
      withCostAck: boolean
    ): Promise<"ok" | "queued" | "failed"> => {
      const r = await casual.joinTournament(
        tournamentId,
        withCostAck ? { dailySoloCostAck: true } : undefined
      );
      const outcome = resolveJoinTournamentOutcome(r);
      if (outcome.kind === "failed") {
        setSoloNote(outcome.error);
        return "failed";
      }
      if (outcome.kind === "queued") {
        setSoloNote("匹配中，正在为你创建对局…");
        setAwaitingSoloMatch({ templateId: tournamentId, gameKind: kind });
        return "queued";
      }
      await casual.refreshCasualPlayer();
      openSoloGame(kind, outcome.templateId, outcome.gameId);
      return "ok";
    },
    [casual.joinTournament, casual.refreshCasualPlayer, openSoloGame]
  );

  const joinSoloDailyChallenge = useCallback(
    async (kind: CasualGameKind) => {
      if (!casual.convexUrl) return;

      setSoloNote(null);
      const tournamentId =
        kind === "solitaire"
          ? CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID
          : CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID;
      if (hasAnyOpenCasualRunAssignment(casual.openRunAssignments)) {
        setSoloNote("有未结束的锦标对局，请先完成后再开始新挑战。");
        return;
      }
      if (
        casual.matchQueueEntries.some(
          (e) => e.status === "waiting" || e.status === "claiming"
        )
      ) {
        setSoloNote("正在匹配或对局创建中，请稍候或先退出匹配。");
        return;
      }

      setJoiningSolo(kind);
      setAwaitingSoloMatch(null);
      try {
        const pv = await casual.fetchJoinEntryChargePreview(tournamentId);
        if (!pv || !pv.ok) {
          setSoloNote(
            pv && !pv.ok
              ? joinEntryErrorMessage(pv.error)
              : "无法预览入场费用，请稍后重试。"
          );
          return;
        }

        if (pv.willChargeEntry) {
          setJoiningSolo(null);
          setSoloCostConfirm({
            kind,
            tournamentId,
            lines: buildSoloCostConfirmLines(tournamentId, pv),
          });
          return;
        }

        const outcome = await runJoinSoloAfterPreview(kind, tournamentId, false);
        if (outcome !== "queued") {
          setJoiningSolo(null);
        }
      } catch {
        setJoiningSolo(null);
        setAwaitingSoloMatch(null);
      }
    },
    [
      casual.convexUrl,
      casual.fetchJoinEntryChargePreview,
      casual.openRunAssignments,
      casual.matchQueueEntries,
      runJoinSoloAfterPreview,
    ]
  );

  const confirmSoloCostAndJoin = useCallback(async () => {
    const c = soloCostConfirm;
    if (!c) return;
    setSoloCostConfirm(null);
    setJoiningSolo(c.kind);
    setAwaitingSoloMatch(null);
    setSoloNote(null);
    try {
      const outcome = await runJoinSoloAfterPreview(c.kind, c.tournamentId, true);
      if (outcome !== "queued") {
        setJoiningSolo(null);
      }
    } catch {
      setJoiningSolo(null);
      setAwaitingSoloMatch(null);
    }
  }, [soloCostConfirm, runJoinSoloAfterPreview]);

  const openOngoingGame = useCallback(() => {
    const hit = latestOpenAssignment;
    if (!hit) return;
    const kind = inferCasualGameKindFromAssignment(hit);
    openModal({
      name: kind === "solitaire" ? "play_solitaire_solo" : "play_block_blast",
      data: {
        casualTournamentId: hit.templateId,
        casualMatchGameId: hit.gameId,
      },
    });
  }, [latestOpenAssignment, openModal]);

  const queue = casual.matchQueueEntries;
  const queueWaiting = queue.some((e) => e.status === "waiting");
  const queueClaiming = queue.some((e) => e.status === "claiming");
  const primaryQueueEntry = queue[0];

  useEffect(() => {
    const entry = primaryQueueEntry;
    if (entry && (entry.status === "waiting" || entry.status === "claiming")) {
      setAwaitingAsyncMatch({
        templateId: entry.templateId,
        gameKind: gameKindFromTemplateId(entry.templateId),
      });
    }
  }, [primaryQueueEntry?.templateId, primaryQueueEntry?.status]);

  const hasOpenRun = latestOpenAssignment != null;
  const matchOverlayOpen =
    awaitingAsyncMatch != null || queueWaiting || queueClaiming;
  const playBlocked = hasOpenRun || matchOverlayOpen;
  const primaryQueueTitle = primaryQueueEntry
    ? getTournamentDefinition(primaryQueueEntry.templateId)?.title ?? primaryQueueEntry.templateId
    : "";

  const leaveMatchQueueErrorText = (error: string): string => {
    if (error === "cannot_leave_claiming") return "正在创建对局，请稍候…";
    if (error === "not_in_queue") return "当前不在匹配队列中。";
    return `退出失败：${error}`;
  };

  const handleLeaveMatchQueue = useCallback(async () => {
    if (leavingMatch || !queueWaiting) return;
    setLeavingMatch(true);
    try {
      const res = await casual.leaveCasualMatchQueue(primaryQueueEntry?.templateId);
      setAwaitingAsyncMatch(null);
      setAwaitingSoloMatch(null);
      setJoiningSolo(null);
      if (res.ok) {
        setSoloNote(null);
      } else {
        setSoloNote(leaveMatchQueueErrorText(res.error));
      }
    } finally {
      setLeavingMatch(false);
    }
  }, [casual.leaveCasualMatchQueue, leavingMatch, primaryQueueEntry?.templateId, queueWaiting]);

  const missionSummary =
    casual.missions.length > 0 ? `${casual.missions.length} 项进行中` : "查看赛季任务与进度";

  const playBusy = joiningSolo !== null || soloCostConfirm !== null;

  const soloDetailSections =
    soloDetailKind != null ? buildDailySoloDetailSections(dailySoloTournamentId(soloDetailKind)) : null;

  return (
    <CasualPageShell
      title="Play"
      titleId="casual-tab-play"
      rootRef={rootRef}
      visible={visible}
      showHeader={true}
    >
      {!casual.convexUrl ? (
        <div className="casual-play-hub">
          <div className="casual-play-hub__offline">
            配置 <code>VITE_CONVEX_URL_CASUAL</code> 后可同步锦标赛与任务。
          </div>
        </div>
      ) : (
        <div className="casual-play-hub">
          <div className="casual-play-hub__balances" aria-label="当前资产">
            {typeof coins === "number" ? (
              <span className="casual-play-hub__chip">
                金币 <b>{coins}</b>
              </span>
            ) : null}
            {typeof gems === "number" ? (
              <span className="casual-play-hub__chip">
                钻 <b>{gems}</b>
              </span>
            ) : null}
            {typeof vouchers === "number" ? (
              <span className="casual-play-hub__chip">
                赛季券 <b>{vouchers}</b>
              </span>
            ) : null}
          </div>

          <CasualSkinEquipPanel gameId="solitaire" />

          {ladder ? (
            <div className="casual-play-hub__ladder" aria-label="赛季竞技">
              <div className="casual-play-hub__ladderStats">
                <span className="casual-play-hub__ladderStat">
                  积分 <b>{ladder.points.toLocaleString()}</b>
                </span>
                <span className="casual-play-hub__ladderStat">
                  段位 <b>{casualLadderTierLabel(ladder.tierId)}</b>
                </span>
                <span className="casual-play-hub__ladderStat">
                  段内 <b>第 {ladder.rankInTier}</b>
                  <span className="casual-play-hub__ladderStatMuted"> / {ladder.tierSize}</span>
                </span>
              </div>
              <button
                type="button"
                className="casual-play-hub__ladderRankBtn"
                disabled={playBlocked}
                onClick={openSeasonLeaderboard}
              >
                赛季榜
              </button>
            </div>
          ) : null}

          {hasOpenRun ? (
            <div className="casual-play-hub__ongoingRow" role="status">
              <p className="casual-play-hub__ongoingRowText">有一场正在进行中的对局</p>
              <button type="button" className="casual-play-hub__ongoingEnter" onClick={openOngoingGame}>
                进入
              </button>
            </div>
          ) : null}

          <CasualPlayMatchOverlay
            open={visible !== 0 && !hasOpenRun && matchOverlayOpen}
            phase={queueClaiming ? "claiming" : "waiting"}
            waitingForPeer={
              awaitingAsyncMatch != null && !queueWaiting && !queueClaiming
                ? false
                : (primaryQueueEntry?.waitingForPeer ?? false)
            }
            tournamentTitle={primaryQueueTitle || undefined}
            leaving={leavingMatch}
            onLeave={
              queueWaiting && primaryQueueEntry?.waitingForPeer
                ? () => void handleLeaveMatchQueue()
                : undefined
            }
          />

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-task-row">
            <h2 id="casual-play-hub-task-row" className="casual-play-hub__rowTitle">
              任务
            </h2>
            <button
              type="button"
              className="casual-play-hub__taskStrip"
              disabled={playBlocked || playBusy}
              onClick={openTasksSheet}
            >
              <span className="casual-play-hub__taskStripMain">
                <span className="casual-play-hub__taskStripTitle">任务列表</span>
                <span className="casual-play-hub__taskStripSub">{missionSummary}</span>
              </span>
              <span className="casual-play-hub__taskStripChev" aria-hidden>
                ›
              </span>
            </button>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-solo">
            <h2 id="casual-play-hub-solo" className="casual-play-hub__rowTitle">
              单人挑战
            </h2>
            {soloNote ? <p className="casual-play-hub__soloNote">{soloNote}</p> : null}
            <div className="casual-play-hub__gameGrid casual-play-hub__gameGrid--pair">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♦</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--black">♠</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♥</span>
                </div>
                <p className="casual-play-hub__modeTitle">Solitaire</p>
                <p className="casual-play-hub__gameHint">
                  {soloEntryHintLine(CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID)}
                </p>
                <div className="casual-play-hub__soloBtnRow casual-play-hub__soloBtnRow--withDetail">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__soloGridPlay"
                    disabled={playBlocked || playBusy}
                    onClick={() => void joinSoloDailyChallenge("solitaire")}
                  >
                    {joiningSolo === "solitaire" ? "…" : "Play"}
                  </button>
                  <div className="casual-play-hub__soloGridDetailSlot">
                    <button
                      type="button"
                      className="casual-play-hub__modeBtn--detailInline"
                      disabled={playBlocked || playBusy}
                      onClick={() => setSoloDetailKind("solitaire")}
                    >
                      详情
                    </button>
                  </div>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank casual-play-hub__soloGridRank"
                    disabled={playBlocked || playBusy}
                    onClick={() =>
                      openModal({
                        name: "casual_daily_solo_leaderboard",
                        data: { gameKind: "solitaire" as const },
                      })
                    }
                  >
                    今日战况
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Block Blast</p>
                <p className="casual-play-hub__gameHint">
                  {soloEntryHintLine(CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID)}
                </p>
                <div className="casual-play-hub__soloBtnRow casual-play-hub__soloBtnRow--withDetail">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__soloGridPlay"
                    disabled={playBlocked || playBusy}
                    onClick={() => void joinSoloDailyChallenge("block_blast")}
                  >
                    {joiningSolo === "block_blast" ? "…" : "Play"}
                  </button>
                  <div className="casual-play-hub__soloGridDetailSlot">
                    <button
                      type="button"
                      className="casual-play-hub__modeBtn--detailInline"
                      disabled={playBlocked || playBusy}
                      onClick={() => setSoloDetailKind("block_blast")}
                    >
                      详情
                    </button>
                  </div>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank casual-play-hub__soloGridRank"
                    disabled={playBlocked || playBusy}
                    onClick={() =>
                      openModal({
                        name: "casual_daily_solo_leaderboard",
                        data: { gameKind: "block_blast" as const },
                      })
                    }
                  >
                    今日战况
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="casual-play-hub__row" aria-labelledby="casual-play-hub-multi">
            <h2 id="casual-play-hub-multi" className="casual-play-hub__rowTitle">
              多人竞技
            </h2>
            <div className="casual-play-hub__gameGrid casual-play-hub__gameGrid--pair">
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--solitaire" aria-hidden>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♦</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--black">♠</span>
                  <span className="casual-play-hub__suit casual-play-hub__suit--red">♥</span>
                </div>
                <p className="casual-play-hub__modeTitle">Solitaire</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C 专场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("solitaire", "Solitaire")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openSeasonLeaderboard}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
              <div className="casual-play-hub__modeCard">
                <div className="casual-play-hub__tileVisual casual-play-hub__tileVisual--blast" aria-hidden />
                <p className="casual-play-hub__modeTitle">Block Blast</p>
                <p className="casual-play-hub__gameHint">锦标赛 · A / B / C 专场</p>
                <div className="casual-play-hub__soloBtnRow">
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--secondary"
                    disabled={playBlocked}
                    onClick={() => openGameTournaments("block_blast", "Block Blast")}
                  >
                    Enter
                  </button>
                  <button
                    type="button"
                    className="casual-play-hub__modeBtn casual-play-hub__modeBtn--rank"
                    disabled={playBlocked}
                    onClick={openSeasonLeaderboard}
                  >
                    赛季排行榜
                  </button>
                </div>
              </div>
            </div>
          </section>

          {typeof document !== "undefined" && soloCostConfirm
            ? createPortal(
                <div
                  className="casual-play-hub__costConfirm"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="casual-solo-cost-title"
                >
                  <button
                    type="button"
                    className="casual-play-hub__costConfirmBackdrop"
                    aria-label="关闭"
                    onClick={() => setSoloCostConfirm(null)}
                  />
                  <div className="casual-play-hub__costConfirmCard">
                    <h3 id="casual-solo-cost-title" className="casual-play-hub__costConfirmTitle">
                      确认入场消耗
                    </h3>
                    <p className="casual-play-hub__costConfirmSub">
                      {soloCostConfirm.kind === "solitaire" ? "Solitaire" : "Block Blast"} · 日榜最高分
                    </p>
                    <ul className="casual-play-hub__costConfirmList">
                      {soloCostConfirm.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <div className="casual-play-hub__costConfirmActions">
                      <button
                        type="button"
                        className="casual-play-hub__costConfirmBtn casual-play-hub__costConfirmBtn--ghost"
                        onClick={() => setSoloCostConfirm(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="casual-play-hub__costConfirmBtn casual-play-hub__costConfirmBtn--primary"
                        disabled={joiningSolo !== null}
                        onClick={() => void confirmSoloCostAndJoin()}
                      >
                        {joiningSolo !== null ? "加入中…" : "确定并开始"}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}
          {typeof document !== "undefined" && soloDetailKind
            ? createPortal(
                <div
                  className="casual-play-hub__soloDetail"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="casual-solo-detail-title"
                >
                  <button
                    type="button"
                    className="casual-play-hub__soloDetailBackdrop"
                    aria-label="关闭"
                    onClick={() => setSoloDetailKind(null)}
                  />
                  <div className="casual-play-hub__soloDetailShell">
                    <div className="casual-play-hub__soloDetailHeader">
                      <h3 id="casual-solo-detail-title" className="casual-play-hub__soloDetailTitle">
                        {soloDetailKind === "solitaire" ? "Solitaire" : "Block Blast"} · 日榜说明
                      </h3>
                      <button
                        type="button"
                        className="casual-play-hub__soloDetailClose"
                        aria-label="关闭"
                        onClick={() => setSoloDetailKind(null)}
                      >
                        ×
                      </button>
                    </div>
                    <div className="casual-play-hub__soloDetailBody">
                      {soloDetailSections ? (
                        soloDetailSections.map((sec) => (
                          <section key={sec.heading} className="casual-play-hub__soloDetailSection">
                            <h4 className="casual-play-hub__soloDetailSectionTitle">{sec.heading}</h4>
                            <ul className="casual-play-hub__soloDetailList">
                              {sec.bullets.map((line, i) => (
                                <li key={`${sec.heading}-${i}`}>{line}</li>
                              ))}
                            </ul>
                          </section>
                        ))
                      ) : (
                        <p className="casual-play-hub__soloDetailEmpty">暂无该专场的配置说明。</p>
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )
            : null}
        </div>
      )}
    </CasualPageShell>
  );
};

export default CasualPlayTab;
