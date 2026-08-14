import React, { useMemo, useState } from "react";
import {
  GateSelection,
  HALL_KIND_META,
  HallTierView,
  gameLabelFromGameType,
} from "./types";
import "./town.css";

export interface GateCardProps {
  selection: GateSelection;
  balance: number;
  loading?: boolean;
  error?: string | null;
  portalReady?: boolean;
  onClose: () => void;
  onEnter: () => void;
  onTierChange: (tierId: string) => void;
  tiers: HallTierView[];
}

const GateCard: React.FC<GateCardProps> = ({
  selection,
  balance,
  loading,
  error,
  portalReady = true,
  onClose,
  onEnter,
  onTierChange,
  tiers,
}) => {
  const [lockedTip, setLockedTip] = useState<string | null>(null);

  const insufficient = balance < selection.buyIn;
  const hallMeta = HALL_KIND_META[selection.hallKind];

  const canEnter = !loading && !insufficient && portalReady !== false;

  const tierRows = useMemo(
    () =>
      tiers.map((tier) => ({
        ...tier,
        buyIn: tier.buyIn ?? 0,
        affordable: balance >= (tier.buyIn ?? 0),
      })),
    [tiers, balance]
  );

  const buildingIcon =
    selection.hallKind === "trial" ? "🎴" : selection.hallKind === "showdown" ? "⚔️" : "🏠";
  const gameLabel = selection.gameType ? gameLabelFromGameType(selection.gameType) : "";

  return (
    <div className="town-gate-overlay" onClick={onClose}>
      <div className="town-gate-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="town-gate-card__header">
          <div className="town-gate-card__hero">{buildingIcon}</div>
          <div>
            <div className="town-gate-card__title">{selection.buildingName}</div>
            <div className="town-gate-card__subtitle">
              {gameLabel ? `${gameLabel} · ${selection.tierLabel}` : hallMeta.label}
            </div>
          </div>
          <button type="button" className="town-gate-card__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="town-gate-card__body">
          <div className="town-gate-card__kind-banner">
            <span className={`town-gate-card__kind town-gate-card__kind--${selection.hallKind}`}>
              {hallMeta.shortLabel}
            </span>
            <span className="town-gate-card__kind-desc">{hallMeta.description}</span>
          </div>

          {tiers.length > 1 ? (
            <div>
              <div className="town-section-label">TABLE</div>
              <div className="town-chip-row">
                {tierRows.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    className={`town-chip ${selection.tierId === tier.id ? "town-chip--selected" : ""} ${!tier.affordable ? "town-chip--locked" : ""}`}
                    onClick={() => {
                      if (!tier.affordable) {
                        setLockedTip("Not enough coins for this table");
                        return;
                      }
                      setLockedTip(null);
                      onTierChange(tier.id);
                    }}
                  >
                    <span className="town-chip__tier">{tier.label}</span>
                    <span className="town-chip__buyin">
                      {tier.buyIn === 0 ? "Free" : tier.buyIn}
                    </span>
                  </button>
                ))}
              </div>
              {lockedTip && <div className="town-banner-error" style={{ marginTop: 8 }}>{lockedTip}</div>}
            </div>
          ) : null}

          <div className="town-buyin-panel">
            <div>
              <div className="town-section-label">Buy-in</div>
              <div className="town-buyin-panel__value">🪙 {selection.buyIn}</div>
            </div>
            <div>
              <div className="town-section-label">Your balance</div>
              <div className={insufficient ? "town-buyin-panel__balance--low" : "town-buyin-panel__balance--ok"}>
                🪙 {balance.toLocaleString()}
              </div>
            </div>
          </div>

          {portalReady === false && (
            <div className="town-banner-error">This venue is not ready yet.</div>
          )}
          {error && <div className="town-banner-error">{error}</div>}
          {insufficient && portalReady !== false && (
            <div className="town-banner-error">Not enough coins for this table.</div>
          )}
        </div>

        <div className="town-gate-card__footer">
          <button type="button" className="town-btn-primary" disabled={!canEnter} onClick={onEnter}>
            {loading ? "Entering…" : `Enter · ${selection.buyIn === 0 ? "Free" : `${selection.buyIn} coins`}`}
          </button>
          <button type="button" className="town-btn-ghost" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default GateCard;
