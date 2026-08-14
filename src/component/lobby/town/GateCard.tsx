import React, { useCallback, useMemo, useState } from "react";
import { GateSelection } from "./types";
import "./town.css";

export interface GateCardProps {
  selection: GateSelection;
  balance: number;
  unlockedTierIds: string[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onEnter: () => void;
  onModeChange: (modeId: string) => void;
  onTierChange: (tierId: string) => void;
  buildingConfig: {
    modes: { id: string; label: string }[];
    tiers: { id: string; label: string; buyIn: number; unlockTierId?: string }[];
  };
}

const GateCard: React.FC<GateCardProps> = ({
  selection,
  balance,
  unlockedTierIds,
  loading,
  error,
  onClose,
  onEnter,
  onModeChange,
  onTierChange,
  buildingConfig,
}) => {
  const [lockedTip, setLockedTip] = useState<string | null>(null);

  const insufficient = balance < selection.buyIn;
  const m1Table1Only = selection.tierId !== "parlor_t1";
  const canEnter =
    !loading &&
    !insufficient &&
    selection.ssaKey === "solitaire" &&
    !m1Table1Only;

  const tierRows = useMemo(
    () =>
      buildingConfig.tiers.map((tier) => ({
        ...tier,
        locked: !unlockedTierIds.includes(tier.id),
      })),
    [buildingConfig.tiers, unlockedTierIds]
  );

  const handleTierClick = useCallback(
    (tierId: string, locked: boolean, label: string) => {
      if (locked) {
        setLockedTip(`${label} locked — spend coins or raise Season Lv in League`);
        return;
      }
      setLockedTip(null);
      onTierChange(tierId);
    },
    [onTierChange]
  );

  return (
    <div className="town-gate-overlay" onClick={onClose}>
      <div className="town-gate-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="town-gate-card__header">
          <div className="town-gate-card__hero">
            {selection.buildingName.includes("Solitaire") ? "🎴" : "🃏"}
          </div>
          <div>
            <div className="town-gate-card__title">{selection.buildingName}</div>
            <div className="town-gate-card__subtitle">Old Square · D0</div>
          </div>
          <button type="button" className="town-gate-card__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="town-gate-card__body">
          {buildingConfig.modes.length > 0 && (
            <div>
              <div className="town-section-label">MODE</div>
              <div className="town-tab-row">
                {buildingConfig.modes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`town-tab ${selection.modeId === mode.id ? "town-tab--selected" : ""}`}
                    onClick={() => onModeChange(mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="town-section-label">TIER</div>
            <div className="town-chip-row">
              {tierRows.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  className={`town-chip ${selection.tierId === tier.id ? "town-chip--selected" : ""} ${tier.locked ? "town-chip--locked" : ""}`}
                  onClick={() => handleTierClick(tier.id, tier.locked, tier.label)}
                >
                  <span className="town-chip__tier">{tier.label}</span>
                  <span className="town-chip__buyin">{tier.buyIn === 0 ? "Free" : tier.buyIn}</span>
                </button>
              ))}
            </div>
            {lockedTip && <div className="town-banner-error" style={{ marginTop: 8 }}>{lockedTip}</div>}
          </div>

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

          {selection.ssaKey === "poker" && (
            <div className="town-banner-error">Poker Saloon coming soon — try Solitaire Parlor first.</div>
          )}
          {m1Table1Only && selection.ssaKey === "solitaire" && (
            <div className="town-banner-error">M1: Table 1 (Free) only. Table 2 unlock in M2.</div>
          )}
          {error && <div className="town-banner-error">{error}</div>}
          {insufficient && selection.ssaKey === "solitaire" && (
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
