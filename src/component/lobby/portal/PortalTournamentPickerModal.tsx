import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CasualAdReplayVideoIcon } from "@/component/battle/games/shared/CasualAdReplayVideoIcon";
import {
  getPortalTournamentDefinition,
  portalTournamentUsesPlayEntryLadder,
  resolveEffectiveTournamentRewards,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { PortalCenterModal } from "./PortalCenterModal";
import type { PortalLobbyOfferingView } from "./PortalLobbyContext";
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
  onSelect: (tournamentId: string) => void;
  onClose: () => void;
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
    if (success == null) return null;
    return { labelKey: "lobby.prizePoints", value: `+${success}` };
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
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation("portal.player");
  const [cached, setCached] = useState({ mode, offerings });

  useEffect(() => {
    if (open && offerings.length > 0) {
      setCached({ mode, offerings });
    }
  }, [open, mode, offerings]);

  const activeMode = open ? mode : cached.mode;
  const activeOfferings = open && offerings.length > 0 ? offerings : cached.offerings;

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
    };
  };

  return (
    <PortalCenterModal open={open} title={headTitle} onClose={onClose}>
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
            entryKind === "blocked";
          const paidAmount =
            def && (def.entry.kind === "coins" || def.entry.kind === "gems")
              ? def.entry.amount
              : null;

          const feeLabel =
            entryKind === "ad"
              ? t("lobby.entryAd")
              : entryKind === "ticket"
                ? t("lobby.playWithTickets", {
                    price: activeEntry.ticketEntryPrice ?? (activeMode === "solo" ? 1 : 2),
                  })
                : entryKind === "coins"
                  ? t("lobby.entryCoins", { amount: paidAmount ?? 0 })
                  : entryKind === "gems"
                    ? t("lobby.entryGems", { amount: paidAmount ?? 0 })
                    : t("lobby.entryFree");

          const feeSub =
            entryKind === "free"
              ? t("lobby.entryFreeQuota", {
                  used: Math.min(activeEntry.playsToday, activeEntry.maxPlaysPerDay),
                  cap: activeEntry.maxPlaysPerDay,
                })
              : entryKind === "ticket"
                ? t("lobby.playWithTicketsSub", {
                    remaining: activeEntry.ticketEntryRemaining ?? 0,
                  })
                : null;

          const playLabel =
            activeEntry.joining
              ? t("lobby.joining")
              : entryKind === "ad"
                ? t("lobby.playWatchAd")
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
                    <strong className="portal-tour-ticket-title">{o.title}</strong>
                    {gameLabel ? (
                      <span className="portal-tour-ticket-game">{gameLabel}</span>
                    ) : null}
                  </div>
                  {prize ? (
                    <div className="portal-tour-ticket-prize">
                      <span className="portal-tour-ticket-prize-label">
                        {t(prize.labelKey)}
                      </span>
                      <span className="portal-tour-ticket-prize-value">{prize.value}</span>
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
