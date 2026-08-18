import React, { useCallback, useState } from "react";

import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import { getPortalHttpClient, usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";
import "./townPass.css";

export type TermPassNodeView = {
  node: number;
  xpCost: number;
  reward: { kind: string; amount?: number; title?: string; titleId?: string };
  xpReached: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type TermPassView = {
  termNumber: number;
  xp: number;
  completedMain: number;
  completedTotal: number;
  mainNodes: number;
  nextNode: number | null;
  xpIntoNode: number;
  xpForNode: number;
  speed: number;
  prosperityScore: number;
  showdownXp: number;
  soloXp: number;
  showdownXpBase: number;
  soloXpBase: number;
  claimableCount: number;
  nodes: TermPassNodeView[];
};

export type GameOpsView = {
  title: string;
  kind: string;
  gameTypes: string[];
  playsRequired: number;
  plays: Record<string, number>;
  rewardCoins: number;
  claimed: boolean;
  complete: boolean;
  lockCopy: string | null;
};

export type GameCodexEntry = {
  gameType: string;
  label: string;
  opened: boolean;
  played: boolean;
};

const EVENT_GAME_LABELS: Record<string, string> = {
  solitaire: "Solitaire",
  yatz: "Yatz",
};

function eventPlayLine(gameOps: GameOpsView): string {
  return gameOps.gameTypes
    .map((g) => `${EVENT_GAME_LABELS[g] ?? g} ${gameOps.plays[g] ?? 0}/${gameOps.playsRequired}`)
    .join(" · ");
}

function eventStatusLine(gameOps: GameOpsView): string {
  if (gameOps.lockCopy) return "Locked";
  if (gameOps.claimed) return "Claimed";
  if (gameOps.complete) return "Complete · ready to claim";
  return "In progress";
}

function rewardLabel(reward: TermPassNodeView["reward"]): string {
  if (reward.kind === "tickets") return `${reward.amount ?? 0} tickets`;
  if (reward.kind === "title") return reward.title ?? "Title";
  return `${reward.amount ?? 0} coins`;
}

function rewardShort(reward: TermPassNodeView["reward"]): string {
  if (reward.kind === "tickets") return `${reward.amount ?? 0}t`;
  if (reward.kind === "title") {
    const parts = (reward.title ?? "Title").trim().split(/\s+/);
    return parts[parts.length - 1] ?? "Title";
  }
  return `${reward.amount ?? 0}c`;
}

function passNodeHint(node: TermPassNodeView, previous?: TermPassNodeView): string {
  if (node.claimed) return `${rewardLabel(node.reward)} claimed`;
  if (node.claimable) return `Claim ${rewardLabel(node.reward)}`;
  if (!node.xpReached) return `Play to ${node.xpCost} XP`;
  if (previous && !previous.claimed) return `Claim node ${previous.node} first`;
  return `Play to ${node.xpCost} XP`;
}

const TownRewardTab: React.FC<{
  onToast: (msg: string) => void;
  townSlug?: string;
  portalSessionReady?: boolean;
  termPass?: TermPassView | null;
  gameOps?: GameOpsView | null;
  onUpdated?: () => void;
  onOpenDistrict?: (districtId: string) => void;
}> = ({ onToast, townSlug, portalSessionReady, termPass, gameOps, onUpdated, onOpenDistrict }) => {
  const portal = usePortal();
  const checkin = portal.dailyCheckin;
  const [busy, setBusy] = useState<string | null>(null);

  const runTown = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      const http = getPortalHttpClient();
      if (!http || !portalSessionReady) {
        onToast("Portal not ready");
        return;
      }
      setBusy(key);
      try {
        const result = (await fn()) as { ok?: boolean; error?: string };
        if (result?.ok === false) {
          onToast(result.error ?? "Claim failed");
          return;
        }
        onUpdated?.();
      } catch (e) {
        console.error("[Reward]", key, e);
        onToast("Something went wrong");
      } finally {
        setBusy(null);
      }
    },
    [portalSessionReady, onToast, onUpdated]
  );

  const claim = useCallback(async () => {
    setBusy("checkin");
    try {
      const r = await portal.claimDailyCheckin();
      if (r.ok) {
        const parts: string[] = [];
        if (r.ticketsGranted) parts.push(`${r.ticketsGranted} tickets`);
        if (r.coinsGranted) parts.push(`${r.coinsGranted} coins`);
        onToast(parts.length ? `Claimed ${parts.join(" + ")}` : "Checked in!");
        await portal.refresh();
      } else {
        onToast(r.error ?? "Check-in failed");
      }
    } finally {
      setBusy(null);
    }
  }, [portal, onToast]);

  const nodes = termPass?.nodes ?? [];
  const nodeXpPct =
    termPass && termPass.xpForNode > 0
      ? Math.min(100, Math.round((termPass.xpIntoNode / termPass.xpForNode) * 100))
      : termPass && termPass.nextNode == null
        ? 100
        : 0;

  const claimPassNode = (node: number) =>
    runTown(`pass-${node}`, () =>
      getPortalHttpClient()!.mutation(portalTournamentFns.townClaimTermPass, {
        node,
        townSlug,
      })
    );

  return (
    <div className="town-tab-panel">
      <h2>Rewards</h2>
      {termPass ? (
        <div className="town-tab-panel__card town-pass">
          <div className="town-pass__head">
            <strong>Term {termPass.termNumber} Pass</strong>
            <span>
              {termPass.completedMain}/{termPass.mainNodes}
            </span>
          </div>
          <div className="town-pass__xp" aria-label="Current node XP">
            <span className="town-pass__xp-bar" aria-hidden>
              <i style={{ width: `${nodeXpPct}%` }} />
            </span>
            <span>
              {termPass.nextNode
                ? `This node ${termPass.xpIntoNode}/${termPass.xpForNode} XP`
                : "Track complete"}
            </span>
          </div>
          <div className="town-pass__boost">
            <div className="town-tab-panel__row">
              <span>Showdown</span>
              <span>
                {termPass.showdownXp > (termPass.showdownXpBase ?? 10)
                  ? `+${termPass.showdownXpBase} → +${termPass.showdownXp} XP`
                  : `+${termPass.showdownXp ?? 10} XP`}
              </span>
            </div>
            <div className="town-tab-panel__row">
              <span>Solo success</span>
              <span>
                {termPass.soloXp > (termPass.soloXpBase ?? 4)
                  ? `+${termPass.soloXpBase} → +${termPass.soloXp} XP`
                  : `+${termPass.soloXp ?? 4} XP`}
              </span>
            </div>
            <div className="town-tab-panel__row">
              <span>Prosperity</span>
              <span>
                {termPass.speed > 1
                  ? `${termPass.prosperityScore}% · +${Math.round((termPass.speed - 1) * 100)}% XP`
                  : `${termPass.prosperityScore}% · raise districts for more XP`}
              </span>
            </div>
          </div>
          <div className="town-pass__track" aria-label="Term Pass">
            {nodes.map((node, index) => {
              const current = termPass.nextNode === node.node;
              return (
                <button
                  key={node.node}
                  type="button"
                  className={`town-pass__node${node.claimed ? " is-claimed" : ""}${
                    node.claimable ? " is-claimable" : ""
                  }${current ? " is-current" : ""}`}
                  disabled={busy != null}
                  onClick={() => {
                    if (node.claimable) {
                      void claimPassNode(node.node);
                      return;
                    }
                    onToast(passNodeHint(node, nodes[index - 1]));
                  }}
                  title={rewardLabel(node.reward)}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="town-pass__node-id">{node.node}</span>
                  <span className="town-pass__node-reward">{rewardShort(node.reward)}</span>
                  {node.claimable ? <span className="town-pass__node-claim">Claim</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {gameOps ? (
        <div className="town-tab-panel__card">
          <strong>Event · {gameOps.title.replace(/^This week:\s*/i, "")}</strong>
          <div className="town-tab-panel__row">
            <span>Progress</span>
            <span>{eventPlayLine(gameOps)}</span>
          </div>
          <div className="town-tab-panel__row">
            <span>Status</span>
            <span>{eventStatusLine(gameOps)}</span>
          </div>
          <div className="town-tab-panel__row">
            <span>Reward</span>
            <span>+{gameOps.rewardCoins} coins</span>
          </div>
          {gameOps.lockCopy ? (
            <button type="button" className="town-btn-primary" onClick={() => onOpenDistrict?.("D1")}>
              {gameOps.lockCopy}
            </button>
          ) : (
            <button
              type="button"
              className="town-btn-primary"
              disabled={busy != null || gameOps.claimed || !gameOps.complete}
              onClick={() =>
                runTown("ops", () =>
                  getPortalHttpClient()!.mutation(portalTournamentFns.townClaimGameOps, { townSlug })
                )
              }
            >
              {gameOps.claimed
                ? "Claimed"
                : gameOps.complete
                  ? `Claim +${gameOps.rewardCoins} coins`
                  : "Claim"}
            </button>
          )}
        </div>
      ) : null}

      <div className="town-tab-panel__card">
        <strong>Daily check-in</strong>
        {checkin ? (
          <>
            <div className="town-tab-panel__row">
              <span>Streak</span>
              <span>{checkin.streakCount} days</span>
            </div>
            <div className="town-tab-panel__row">
              <span>Today</span>
              <span>
                {checkin.alreadyClaimedToday
                  ? "Claimed"
                  : `+${checkin.baseCoins} coins · +${checkin.baseTickets} tickets`}
              </span>
            </div>
            {!checkin.alreadyClaimedToday ? (
              <button type="button" className="town-btn-primary" disabled={busy != null} onClick={() => void claim()}>
                Claim
              </button>
            ) : null}
          </>
        ) : (
          <p className="town-tab-panel__empty">Sign in to claim daily rewards.</p>
        )}
      </div>
      {portal.adCoinOffer?.enabled ? (
        <div className="town-tab-panel__card">
          <strong>Watch ad</strong>
          <p>+{portal.adCoinOffer.rewardAmount} coins ({portal.adCoinOffer.remaining} left today)</p>
          <button
            type="button"
            className="town-btn-primary"
            disabled={busy != null || portal.adCoinOffer.remaining <= 0}
            onClick={async () => {
              setBusy("ad");
              try {
                const r = await portal.watchAdForCoins();
                if (r.ok) onToast(`+${r.coinsGranted} coins`);
                else onToast(r.error ?? "Ad failed");
              } finally {
                setBusy(null);
              }
            }}
          >
            Watch ad
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TownRewardTab;
