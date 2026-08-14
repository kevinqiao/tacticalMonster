import React, { useMemo } from "react";

import {
  GAME_ICONS,
  gameLabelFromGameType,
  HALL_KIND_META,
  HallKind,
  VenueTournamentOption,
} from "./types";
import "./town.css";

export interface VenuePickerModalProps {
  kind: HallKind;
  options: VenueTournamentOption[];
  balance: number;
  onClose: () => void;
  onSelect: (option: VenueTournamentOption) => void;
}

const PICKER_COPY: Record<
  HallKind,
  { title: string; icon: string; hint: string; empty: string }
> = {
  trial: {
    title: "Solo Challenge",
    icon: "🎴",
    hint: "Solo benchmark — no Week Score. Choose a table to enter.",
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
  onClose,
  onSelect,
}) => {
  const copy = PICKER_COPY[kind];
  const kindMeta = HALL_KIND_META[kind];

  const grouped = useMemo(() => {
    const map = new Map<string, VenueTournamentOption[]>();
    for (const opt of options) {
      const key = opt.gameType || "unknown";
      const list = map.get(key) ?? [];
      list.push(opt);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [options]);

  const openCount = options.filter((o) => o.open).length;

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
              {copy.title}
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
          <p className="town-showdown-picker__hint">{copy.hint}</p>

          {grouped.length === 0 ? (
            <p className="town-showdown-picker__empty">{copy.empty}</p>
          ) : (
            grouped.map(([gameType, rows]) => {
              const gameLabel = gameLabelFromGameType(gameType);
              return (
                <section key={gameType} className="town-showdown-picker__group">
                  <h3 className="town-showdown-picker__group-title">
                    <span aria-hidden>{GAME_ICONS[gameType] ?? copy.icon}</span>
                    {gameLabel}
                  </h3>
                  <ul className="town-showdown-picker__list">
                    {rows.map((opt) => {
                      const affordable = balance >= opt.buyIn;
                      const canPick = opt.open && affordable;
                      return (
                        <li key={opt.tier.id}>
                          <button
                            type="button"
                            className={`town-showdown-picker__row${canPick ? "" : " town-showdown-picker__row--disabled"}${!opt.open ? " town-showdown-picker__row--locked" : ""}${opt.open && !affordable ? " town-showdown-picker__row--funds" : ""}`}
                            disabled={!opt.open}
                            onClick={() => {
                              if (!canPick) return;
                              onSelect(opt);
                            }}
                          >
                            <span className="town-showdown-picker__row-main">
                              <span className="town-showdown-picker__row-label">{opt.tier.label}</span>
                              <span className="town-showdown-picker__row-meta">
                                {opt.venue.name}
                                {!opt.open && opt.lockReason ? ` · ${opt.lockReason}` : ""}
                                {opt.open && !affordable ? " · Not enough coins" : ""}
                              </span>
                            </span>
                            <span className="town-showdown-picker__row-buyin">
                              {opt.buyIn === 0 ? "Free" : `🪙 ${opt.buyIn}`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
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
