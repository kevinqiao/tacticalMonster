import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CasualAdReplayVideoIcon } from "@/component/battle/games/shared/CasualAdReplayVideoIcon";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
  resolveEffectiveTournamentRewards,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { PortalCenterModal } from "./PortalCenterModal";
import { isFinitePortalAdEntryCap } from "./shared/portalAdEntryQuota";
import type { PortalLobbyOfferingView } from "./PortalLobbyContext";
import { localizePortalTournamentTitle } from "./portalTournamentLocalize";
import {
  isValidPortalGameType,
  portalGameDisplayName,
} from "./service/usePortalManager";

export type PortalTournamentPickerEntryState = {
  dailyExhausted: boolean;
  adEntryAvailable: boolean;
  ticketEntryAvailable: boolean;
  ticketEntryPrice?: number;
  ticketEntryRemaining?: number;
  playsToday: number;
  maxPlaysPerDay: number;
  joining: boolean;
  /** Another offering in this picker is joining — disable without showing "joining". */
  siblingJoining?: boolean;
  /**
   * Real-time joinability (wallet / daily ladder / open run / queue / closed).
   * When false, enter button is grayed out.
   */
  playable?: boolean;
  /**
   * True when this ticket has its own free/ad caps (quotaScope=tournament).
   * Then show used/cap on the row; otherwise rely on the picker header chips.
   */
  perTournamentQuota?: boolean;
};

/** Mode-level free + ad daily counters shown at the top of the picker. */
export type PortalTournamentPickerDailyQuota = {
  freeUsed: number;
  freeCap: number;
  adUsed: number;
  adCap: number;
  /** When false, hide the ad chip (feature off). */
  adEnabled?: boolean;
  /** Solo only: rewarded successes today / daily cap. */
  successEnabled?: boolean;
  successUsed?: number;
  successCap?: number;
};

type Props = {
  open: boolean;
  mode: "solo" | "multi";
  offerings: PortalLobbyOfferingView[];
  /**
   * Shared mode/lobby entry, or per-tournament when quotaScope=tournament
   * (pass resolveEntry).
   */
  entry?: PortalTournamentPickerEntryState;
  resolveEntry?: (tournamentId: string) => PortalTournamentPickerEntryState;
  /**
   * Mode/lobby-level free + ad summary for the picker header.
   * Hidden when tickets use per-tournament quotas.
   */
  dailyQuota?: PortalTournamentPickerDailyQuota | null;
  onSelect: (tournamentId: string) => void;
  onClose: () => void;
  /** Open full rank-reward schedule for a multi ticket. */
  onOpenRankRewards?: (tournamentId: string) => void;
};

function prizeHighlight(
  tournamentId: string,
  matchType: string | null
): { labelKey: string; value: string } | null {
  const def = getPortalTournamentDefinition(tournamentId);
  if (!def) return null;
  const rewards = resolveEffectiveTournamentRewards(def);
  if (matchType === "solo_p75" || def.matchType === "solo_p75") {
    const success = rewards.soloPoints?.success;
    const clearBonus = rewards.soloPoints?.clearBonus ?? 0;
    if (typeof success !== "number" || !Number.isFinite(success)) return null;
    const total = Math.floor(success) + Math.floor(clearBonus);
    return { labelKey: "lobby.prizePoints", value: `+${total}` };
  }
  const topPts = rewards.rankPoints?.[1];
  const topCoins = rewards.coinRewards?.rankCoins?.["1"];
  const hasPts = typeof topPts === "number" && Number.isFinite(topPts);
  const hasCoins =
    typeof topCoins === "number" && Number.isFinite(topCoins) && topCoins > 0;
  // Coin multi: same rank points as free, plus coin payout — show both.
  if (hasPts && hasCoins) {
    return {
      labelKey: "lobby.prizeTopPointsAndCoins",
      value: `+${topPts} / +${Math.floor(topCoins!)}`,
    };
  }
  if (hasCoins) {
    return { labelKey: "lobby.prizeTopCoins", value: `+${Math.floor(topCoins!)}` };
  }
  if (!hasPts) return null;
  return { labelKey: "lobby.prizeTopPoints", value: `+${topPts}` };
}

type EntryKind = "free" | "ad" | "ticket" | "coins" | "gems" | "blocked";

function resolveEntryKind(
  entry: PortalTournamentPickerEntryState,
  tournamentId: string
): EntryKind {
  const def = getPortalTournamentDefinition(tournamentId);
  if (def && !portalTournamentUsesPlayEntryLadder(def)) {
    if (def.entry.kind === "gems") return "gems";
    if (def.entry.kind === "coins") return "coins";
  }
  if (!entry.dailyExhausted) return "free";
  if (entry.adEntryAvailable) return "ad";
  if (entry.ticketEntryAvailable) return "ticket";
  return "blocked";
}

/** Ticket-style list when a mode has multiple lobby tournaments. */
const PortalTournamentPickerModal: React.FC<Props> = ({
  open,
  mode,
  offerings,
  entry,
  resolveEntry,
  dailyQuota,
  onSelect,
  onClose,
  onOpenRankRewards,
}) => {
  const { t } = useTranslation("portal.player");
  const [cached, setCached] = useState({ mode, offerings, dailyQuota });

  useEffect(() => {
    if (open && offerings.length > 0) {
      setCached({ mode, offerings, dailyQuota });
    }
  }, [open, mode, offerings, dailyQuota]);

  const activeMode = open ? mode : cached.mode;
  const activeOfferings = open && offerings.length > 0 ? offerings : cached.offerings;
  const activeQuota = open ? dailyQuota : cached.dailyQuota;

  const sorted = useMemo(
    () => [...activeOfferings].sort((a, b) => a.sortOrder - b.sortOrder),
    [activeOfferings]
  );

  const headTitle =
    activeMode === "solo" ? t("lobby.pickModeSolo") : t("lobby.pickModeMulti");

  const entryFor = (tournamentId: string): PortalTournamentPickerEntryState => {
    if (resolveEntry) return resolveEntry(tournamentId);
    if (entry) return entry;
    return {
      dailyExhausted: false,
      adEntryAvailable: false,
      ticketEntryAvailable: false,
      playsToday: 0,
      maxPlaysPerDay: 0,
      joining: false,
      playable: true,
    };
  };

  const adCap = activeQuota ? Math.max(0, activeQuota.adCap) : 0;
  const adFinite = isFinitePortalAdEntryCap(adCap);
  const showAdQuota =
    activeQuota != null &&
    activeQuota.adEnabled !== false &&
    activeQuota.adCap > 0;
  const freeUsed = activeQuota
    ? Math.min(Math.max(0, activeQuota.freeUsed), Math.max(0, activeQuota.freeCap))
    : 0;
  const freeCap = activeQuota ? Math.max(0, activeQuota.freeCap) : 0;
  const adUsed = activeQuota
    ? Math.min(Math.max(0, activeQuota.adUsed), adFinite ? adCap : 0)
    : 0;
  const successCap =
    mode === "solo" && activeQuota?.successEnabled
      ? Math.max(0, Math.floor(activeQuota.successCap ?? 0))
      : 0;
  const successUsed =
    successCap > 0
      ? Math.min(
          Math.max(0, Math.floor(activeQuota?.successUsed ?? 0)),
          successCap
        )
      : 0;
  const showSuccessQuota = successCap > 0;
  // Header chips are for shared mode/lobby pools. Skip when any ticket is
  // per-tournament (those rows show their own used/cap).
  const anyPerTournamentQuota = sorted.some((o) => {
    const st = entryFor(o.tournamentId);
    return st.perTournamentQuota === true;
  });
  const showHeaderQuota =
    !anyPerTournamentQuota &&
    activeQuota &&
    (freeCap > 0 || showSuccessQuota);

  const quotaAria = (() => {
    if (!showHeaderQuota) return undefined;
    if (showSuccessQuota) {
      return showAdQuota && !adFinite
        ? t("lobby.pickQuotaAriaUnlimitedAdWithSuccess", {
            freeUsed,
            freeCap,
            successUsed,
            successCap,
          })
        : t("lobby.pickQuotaAriaWithSuccess", {
            freeUsed,
            freeCap,
            adUsed: showAdQuota && adFinite ? adUsed : 0,
            adCap: showAdQuota && adFinite ? adCap : 0,
            successUsed,
            successCap,
          });
    }
    return showAdQuota && !adFinite
      ? t("lobby.pickQuotaAriaUnlimitedAd", { freeUsed, freeCap })
      : t("lobby.pickQuotaAria", {
          freeUsed,
          freeCap,
          adUsed: showAdQuota && adFinite ? adUsed : 0,
          adCap: showAdQuota && adFinite ? adCap : 0,
        });
  })();

  return (
    <PortalCenterModal open={open} title={headTitle} onClose={onClose}>
      {showHeaderQuota ? (
        <div className="portal-tour-quota" aria-label={quotaAria}>
          {freeCap > 0 ? (
            <span className="portal-tour-quota-chip portal-tour-quota-chip--free">
              {t("lobby.pickQuotaFree", { used: freeUsed, cap: freeCap })}
            </span>
          ) : null}
          {showAdQuota ? (
            <span className="portal-tour-quota-chip portal-tour-quota-chip--ad">
              <CasualAdReplayVideoIcon />
              {adFinite
                ? t("lobby.pickQuotaAd", { used: adUsed, cap: adCap })
                : t("lobby.pickQuotaAdUnlimited")}
            </span>
          ) : null}
          {showSuccessQuota ? (
            <span className="portal-tour-quota-chip portal-tour-quota-chip--success">
              {t("lobby.pickQuotaSuccess", {
                used: successUsed,
                cap: successCap,
              })}
            </span>
          ) : null}
        </div>
      ) : null}
      <ul className="portal-tour-list" aria-label={headTitle}>
        {sorted.map((o) => {
          const def = getPortalTournamentDefinition(o.tournamentId);
          const matchType = o.matchType ?? def?.matchType ?? null;
          const gameType = o.gameType ?? def?.gameType ?? null;
          const gameLabel =
            gameType && isValidPortalGameType(gameType)
              ? portalGameDisplayName(gameType)
              : gameType;
          const prize = prizeHighlight(o.tournamentId, matchType);
          const maxPlayers = def?.maxPlayers ?? null;
          const activeEntry = entryFor(o.tournamentId);
          const entryKind = resolveEntryKind(activeEntry, o.tournamentId);
          const playDisabled =
            activeEntry.joining ||
            activeEntry.siblingJoining === true ||
            entryKind === "blocked" ||
            activeEntry.playable === false;
          const paidAmount =
            def && (def.entry.kind === "coins" || def.entry.kind === "gems")
              ? def.entry.amount
              : null;
          const usesLadder =
            def != null && portalTournamentUsesPlayEntryLadder(def);

          // Ladder tables with ad entry: always label as Free+Ad (not only "Free" / "Ad"
          // based on today's exhaustion). Play CTA still follows entryKind.
          const feeLabel =
            entryKind === "coins"
              ? t("lobby.entryCoins", { amount: paidAmount ?? 0 })
              : entryKind === "gems"
                ? t("lobby.entryGems", { amount: paidAmount ?? 0 })
                : entryKind === "ticket"
                  ? t("lobby.playWithTickets", {
                      price:
                        activeEntry.ticketEntryPrice ??
                        (activeMode === "solo" ? 1 : 2),
                    })
                  : usesLadder && showAdQuota
                    ? t("lobby.entryFreeAndAd")
                    : t("lobby.entryFree");

          // Shared free/ad counts live in the header — only repeat on the row
          // when this tournament has its own quota (quotaScope=tournament).
          const feeSub =
            entryKind === "ticket"
              ? t("lobby.playWithTicketsSub", {
                  remaining: activeEntry.ticketEntryRemaining ?? 0,
                })
              : activeEntry.perTournamentQuota === true &&
                  usesLadder &&
                  (entryKind === "free" ||
                    entryKind === "ad" ||
                    entryKind === "blocked")
                ? t("lobby.entryFreeQuota", {
                    used: Math.min(
                      activeEntry.playsToday,
                      activeEntry.maxPlaysPerDay
                    ),
                    cap: activeEntry.maxPlaysPerDay,
                  })
                : null;

          const playLabel =
            activeEntry.joining
              ? t("lobby.joining")
              : entryKind === "ad"
                ? t("lobby.playWatchAdPlain")
                : entryKind === "ticket"
                  ? t("lobby.playWithTickets", {
                      price: activeEntry.ticketEntryPrice ?? (activeMode === "solo" ? 1 : 2),
                    })
                  : t("lobby.play");

          return (
            <li key={o.tournamentId} className="portal-tour-ticket">
              <div className="portal-tour-ticket-body">
                <div className="portal-tour-ticket-main">
                  <div className="portal-tour-ticket-title-row">
                    <strong className="portal-tour-ticket-title">
                      {localizePortalTournamentTitle(
                        o.tournamentId,
                        o.title,
                        o.titleOverride
                      )}
                    </strong>
                    {gameLabel ? (
                      <span className="portal-tour-ticket-game">{gameLabel}</span>
                    ) : null}
                  </div>
                  {prize &&
                  activeMode === "multi" &&
                  matchType === "multi_ranked" &&
                  onOpenRankRewards ? (
                    <div className="portal-tour-ticket-prize">
                      <button
                        type="button"
                        className="portal-tour-ticket-prize-btn"
                        onClick={() => onOpenRankRewards(o.tournamentId)}
                        aria-label={t("lobby.allRanks")}
                      >
                        <span className="portal-tour-ticket-prize-label">
                          {t(prize.labelKey)}
                        </span>
                        <span className="portal-tour-ticket-prize-value">
                          {prize.value}
                        </span>
                        <span className="portal-tour-ticket-prize-all">
                          {t("lobby.allRanks")}
                        </span>
                      </button>
                    </div>
                  ) : prize ? (
                    <div className="portal-tour-ticket-prize">
                      <span className="portal-tour-ticket-prize-label">
                        {t(prize.labelKey)}
                      </span>
                      <span className="portal-tour-ticket-prize-value">
                        {prize.value}
                      </span>
                    </div>
                  ) : activeMode === "multi" &&
                    matchType === "multi_ranked" &&
                    onOpenRankRewards ? (
                    <div className="portal-tour-ticket-prize">
                      <button
                        type="button"
                        className="portal-tour-ticket-prize-btn portal-tour-ticket-prize-btn--link"
                        onClick={() => onOpenRankRewards(o.tournamentId)}
                      >
                        {t("lobby.allRanks")}
                      </button>
                    </div>
                  ) : null}
                  {maxPlayers != null ? (
                    <div className="portal-tour-ticket-players" aria-label={t("lobby.players")}>
                      <svg
                        className="portal-tour-ticket-players-icon"
                        viewBox="0 0 24 24"
                        aria-hidden
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6.5-1a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM4.5 19.25c0-2.9 2.35-5.25 5.25-5.25h.5c2.9 0 5.25 2.35 5.25 5.25V20H4.5v-.75Zm11.25-4.5c.5-.16 1.03-.25 1.58-.25h.42c2.49 0 4.5 2.01 4.5 4.5V20h-4.25v-.75c0-1.35-.42-2.6-1.13-3.62-.37-.06-.74-.1-1.12-.13Z"
                        />
                      </svg>
                      <span className="portal-tour-ticket-players-count">{maxPlayers}</span>
                    </div>
                  ) : null}
                </div>
                <div className="portal-tour-ticket-stub">
                  <div className="portal-tour-ticket-fee">
                    <span className="portal-tour-ticket-fee-label">
                      {t("lobby.entryFee")}
                    </span>
                    <span className="portal-tour-ticket-fee-value">{feeLabel}</span>
                    {feeSub ? (
                      <span className="portal-tour-ticket-fee-sub">{feeSub}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`portal-tour-ticket-play${
                      playDisabled ? " portal-tour-ticket-play--disabled" : ""
                    }${entryKind === "ad" ? " portal-tour-ticket-play--ad" : ""}`}
                    disabled={playDisabled}
                    onClick={() => onSelect(o.tournamentId)}
                  >
                    {entryKind === "ad" && !activeEntry.joining ? (
                      <span className="portal-tour-ticket-play-inner">
                        <CasualAdReplayVideoIcon />
                        {playLabel}
                      </span>
                    ) : (
                      playLabel
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </PortalCenterModal>
  );
};

export default PortalTournamentPickerModal;
