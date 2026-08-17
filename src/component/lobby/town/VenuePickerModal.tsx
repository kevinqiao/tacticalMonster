import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  getPortalTournamentDefinition,
  resolveEffectiveTournamentRewards,
} from "@/convex/portal/convex/data/portalTournamentConfigs";
import { localizePortalTournamentTitle } from "component/lobby/portal/portalTournamentLocalize";
import {
  isValidPortalGameType,
  portalGameDisplayName,
} from "component/lobby/portal/service/usePortalManager";

import { HALL_KIND_META, HallKind, TableLockCondition, VenueTournamentOption } from "./types";
import "./town.css";

export interface VenuePickerModalProps {
  kind: HallKind;
  options: VenueTournamentOption[];
  balance: number;
  ticketBalance?: number;
  ticketEntryPrice?: number;
  gameFilter?: string | null;
  onClose: () => void;
  onSelect: (option: VenueTournamentOption) => void;
  onLockedDistrict?: (districtId: string) => void;
}

function showdownUsesTicketEntry(kind: HallKind, buyIn: number): boolean {
  return kind === "showdown" && buyIn <= 0;
}

function prizeHighlight(tournamentId: string): { labelKey: string; value: string } | null {
  const def = getPortalTournamentDefinition(tournamentId);
  if (!def) return null;
  const rewards = resolveEffectiveTournamentRewards(def);
  if (def.matchType === "solo_p75") {
    const success = rewards.soloPoints?.success;
    const clearBonus = rewards.soloPoints?.clearBonus ?? 0;
    const coins = rewards.coinRewards?.soloSuccess;
    const hasPts = typeof success === "number" && Number.isFinite(success);
    const hasCoins = typeof coins === "number" && Number.isFinite(coins) && coins > 0;
    if (!hasPts && !hasCoins) return null;
    const pts = hasPts ? Math.floor(success) + Math.floor(clearBonus) : 0;
    if (hasPts && hasCoins) {
      return {
        labelKey: "lobby.prizeTopPointsAndCoins",
        value: `+${pts} / +${Math.floor(coins!)}`,
      };
    }
    if (hasCoins) {
      return { labelKey: "lobby.prizeTopCoins", value: `+${Math.floor(coins!)}` };
    }
    return { labelKey: "lobby.prizePoints", value: `+${pts}` };
  }
  const topPts = rewards.rankPoints?.[1];
  const topCoins = rewards.coinRewards?.rankCoins?.["1"];
  const hasPts = typeof topPts === "number" && Number.isFinite(topPts);
  const hasCoins = typeof topCoins === "number" && Number.isFinite(topCoins) && topCoins > 0;
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

function VenueLockMask({
  conditions,
  onLockedDistrict,
}: {
  conditions: TableLockCondition[];
  onLockedDistrict?: (districtId: string) => void;
}) {
  const lockedDistrict = conditions.find((row) => row.id === "district" && !row.ok && row.districtId);
  const canOpenDistrict = Boolean(lockedDistrict?.districtId && onLockedDistrict);

  return (
    <div className="town-venue-ticket__mask" aria-label="Locked">
      {canOpenDistrict ? (
        <button
          type="button"
          className="town-venue-ticket__lock-icon"
          onClick={() => onLockedDistrict?.(lockedDistrict!.districtId!)}
          aria-label="View district"
        >
          🔒
        </button>
      ) : (
        <span className="town-venue-ticket__lock-icon" aria-hidden>
          🔒
        </span>
      )}
      <ul className="town-venue-ticket__mask-list">
        {conditions.map((row) => {
          const openDistrict = row.id === "district" && !row.ok && row.districtId && onLockedDistrict;
          const className = `town-venue-ticket__mask-row${row.ok ? " town-venue-ticket__mask-row--ok" : " town-venue-ticket__mask-row--need"}`;
          if (openDistrict) {
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`${className} town-venue-ticket__mask-row-btn`}
                  onClick={() => onLockedDistrict(row.districtId!)}
                >
                  <span aria-hidden>{row.ok ? "✓" : "○"}</span>
                  <span>{row.label}</span>
                </button>
              </li>
            );
          }
          return (
            <li key={row.id} className={className}>
              <span aria-hidden>{row.ok ? "✓" : "○"}</span>
              <span>{row.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const PICKER_COPY: Record<
  HallKind,
  { title: string; icon: string; hint: string; empty: string }
> = {
  trial: {
    title: "Solo Challenge",
    icon: "🎴",
    hint: "All solo tables. Locked rows show what you still need.",
    empty: "No solo tables configured yet.",
  },
  showdown: {
    title: "Multiplayer Showdown",
    icon: "⚔️",
    hint: "Week Score counts toward this term's Pod. Choose a table to enter.",
    empty: "No showdown tables configured yet.",
  },
};

const VenuePickerModal: React.FC<VenuePickerModalProps> = ({
  kind,
  options,
  balance,
  ticketBalance = 0,
  ticketEntryPrice = 1,
  gameFilter,
  onClose,
  onSelect,
  onLockedDistrict,
}) => {
  const { t } = useTranslation("portal.player");
  const copy = PICKER_COPY[kind];
  const kindMeta = HALL_KIND_META[kind];
  const filtered = useMemo(
    () => (gameFilter ? options.filter((o) => o.gameType === gameFilter) : options),
    [options, gameFilter]
  );
  const filterLabel = gameFilter
    ? isValidPortalGameType(gameFilter)
      ? portalGameDisplayName(gameFilter)
      : gameFilter
    : null;
  const openCount = filtered.filter((o) => o.open).length;

  return (
    <div className="town-gate-overlay" onClick={onClose}>
      <div
        className="town-gate-card town-gate-card--picker"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-picker-title"
      >
        <div className="town-gate-card__header">
          <div className="town-gate-card__hero">{copy.icon}</div>
          <div>
            <div className="town-gate-card__title" id="venue-picker-title">
              {filterLabel ? `${copy.title} · ${filterLabel}` : copy.title}
            </div>
            <div className="town-gate-card__subtitle">
              {kindMeta.description} · {openCount} table{openCount === 1 ? "" : "s"} open
            </div>
          </div>
          <button type="button" className="town-gate-card__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="town-gate-card__body town-showdown-picker__body">
          <p className="town-showdown-picker__hint">
            {filterLabel ? `${filterLabel} tables on this hall. Pick one to enter.` : copy.hint}
          </p>

          {filtered.length === 0 ? (
            <p className="town-showdown-picker__empty">{copy.empty}</p>
          ) : (
            <ul className="town-venue-list">
              {filtered.map((opt) => {
                const def = getPortalTournamentDefinition(opt.tier.tournamentId);
                const gameLabel = isValidPortalGameType(opt.gameType)
                  ? portalGameDisplayName(opt.gameType)
                  : opt.gameType;
                const title = localizePortalTournamentTitle(
                  opt.tier.tournamentId,
                  def?.title ?? opt.tier.label
                );
                const ticketTable = showdownUsesTicketEntry(kind, opt.buyIn);
                const affordable = ticketTable
                  ? ticketBalance >= ticketEntryPrice
                  : balance >= opt.buyIn;
                const canPick = opt.open && affordable;
                const prize = prizeHighlight(opt.tier.tournamentId);
                const maxPlayers = def?.maxPlayers ?? null;
                const feeLabel = ticketTable
                  ? t("lobby.playWithTickets", { price: ticketEntryPrice })
                  : opt.buyIn > 0
                    ? t("lobby.entryCoins", { amount: opt.buyIn })
                    : t("lobby.entryFree");
                const playLabel = ticketTable
                  ? t("lobby.playWithTickets", { price: ticketEntryPrice })
                  : t("lobby.play");

                return (
                  <li
                    key={opt.tier.id}
                    className={`town-venue-ticket${!opt.open ? " town-venue-ticket--locked" : ""}${opt.open && !affordable ? " town-venue-ticket--funds" : ""}`}
                  >
                    <div className="town-venue-ticket__body">
                      <div className="town-venue-ticket__main">
                        <div className="town-venue-ticket__title-row">
                          <div className="town-venue-ticket__title-copy">
                            <strong className="town-venue-ticket__title">{title}</strong>
                            {gameLabel ? (
                              <span className="town-venue-ticket__game">{gameLabel}</span>
                            ) : null}
                          </div>
                        </div>
                        {opt.open && !affordable ? (
                          <div className="town-venue-ticket__lock">
                            {ticketTable ? "Not enough tickets" : "Not enough coins"}
                          </div>
                        ) : null}
                        {prize ? (
                          <div className="town-venue-ticket__prize">
                            <span className="town-venue-ticket__prize-label">{t(prize.labelKey)}</span>
                            <span className="town-venue-ticket__prize-value">{prize.value}</span>
                          </div>
                        ) : null}
                        {maxPlayers != null ? (
                          <div className="town-venue-ticket__players" aria-label={t("lobby.players")}>
                            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                              <path
                                fill="currentColor"
                                d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6.5-1a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM4.5 19.25c0-2.9 2.35-5.25 5.25-5.25h.5c2.9 0 5.25 2.35 5.25 5.25V20H4.5v-.75Zm11.25-4.5c.5-.16 1.03-.25 1.58-.25h.42c2.49 0 4.5 2.01 4.5 4.5V20h-4.25v-.75c0-1.35-.42-2.6-1.13-3.62-.37-.06-.74-.1-1.12-.13Z"
                              />
                            </svg>
                            <span>{maxPlayers}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="town-venue-ticket__stub">
                        <div className="town-venue-ticket__fee">
                          <span className="town-venue-ticket__fee-label">{t("lobby.entryFee")}</span>
                          <span className="town-venue-ticket__fee-value">{feeLabel}</span>
                        </div>
                        <button
                          type="button"
                          className="town-venue-ticket__play"
                          disabled={!canPick}
                          onClick={() => {
                            if (!canPick) return;
                            onSelect(opt);
                          }}
                        >
                          {playLabel}
                        </button>
                      </div>
                    </div>
                    {!opt.open ? (
                      <VenueLockMask
                        conditions={opt.lockConditions}
                        onLockedDistrict={onLockedDistrict}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="town-gate-card__footer">
          <button type="button" className="town-btn-ghost" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenuePickerModal;
