import React, { useCallback, useState } from "react";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import { getPortalHttpClient } from "component/lobby/portal/service/usePortalManager";
import "./townZone.css";
import ProsperityMilestonesStrip from "./ProsperityMilestonesStrip";
import type { ProsperityMilestonesView } from "./prosperityMilestones";

export type TownZoneView = {
  slotId: string;
  districtId: string;
  zoneType: string | null;
  level: number;
  developable: boolean;
  choices: string[];
  developCost: number | null;
  upgradeCost: number | null;
  passivePerHour: number;
  entertainmentBonusActive?: boolean;
  label: string | null;
  labelZh: string | null;
};

export type EntertainmentBonusView = {
  minGamesPerWeek: number;
  passiveMultiplier: number;
  gamesThisWeek: number;
  active: boolean;
  remaining: number;
};

const ZONE_LABELS: Record<string, string> = {
  commercial: "Commercial 商业区",
  industrial: "Industrial 工业区",
  tourism: "Tourism 旅游区",
  entertainment: "Entertainment 娱乐区",
};

export interface TownZonePanelProps {
  zones: TownZoneView[];
  coins: number;
  mayorLevel: number;
  prosperityScore: number;
  prosperityMilestones?: ProsperityMilestonesView;
  collectablePassive: number;
  entertainmentBonus?: EntertainmentBonusView | null;
  hasEntertainmentZone?: boolean;
  d1Expansion: {
    minMayorLevel: number;
    minDevelopedZones: number;
    questId: string;
    feeCoins: number;
    canExpand: boolean;
  } | null;
  portalSessionReady: boolean;
  townSlug?: string;
  onClose: () => void;
  onUpdated: () => void;
  onToast: (msg: string) => void;
}

const TownZonePanel: React.FC<TownZonePanelProps> = ({
  zones,
  coins,
  mayorLevel,
  prosperityScore,
  prosperityMilestones,
  collectablePassive,
  entertainmentBonus,
  hasEntertainmentZone = false,
  d1Expansion,
  portalSessionReady,
  townSlug,
  onClose,
  onUpdated,
  onToast,
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [pickType, setPickType] = useState<string>("commercial");

  const runMutation = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      const http = getPortalHttpClient();
      if (!http || !portalSessionReady) {
        onToast("Portal not ready");
        return;
      }
      setBusy(key);
      try {
        const result = (await fn()) as { ok?: boolean; error?: string; collected?: number };
        if (result?.ok === false) {
          onToast(result.error ?? "Failed");
          return;
        }
        if (typeof result?.collected === "number" && result.collected > 0) {
          onToast(`Collected ${result.collected} coins`);
        }
        onUpdated();
      } catch (e) {
        console.error("[TownZone]", key, e);
        onToast("Something went wrong");
      } finally {
        setBusy(null);
      }
    },
    [portalSessionReady, onUpdated, onToast]
  );

  const developable = zones.filter((z) => z.developable && z.level === 0 && !z.zoneType);

  return (
    <div className="town-zone-overlay" role="dialog" aria-label="Mayor's Office">
      <div className="town-zone-panel">
        <header className="town-zone-panel__head">
          <div>
            <h2>Mayor&apos;s Office</h2>
            <p>
              Mayor Lv.{mayorLevel} · Prosperity {prosperityScore}%
            </p>
          </div>
          <button type="button" className="town-zone-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="town-zone-panel__collect">
          <div>
            <strong>Passive income</strong>
            <span>{collectablePassive > 0 ? `${collectablePassive} coins ready` : "Nothing to collect yet"}</span>
          </div>
          <button
            type="button"
            className="town-btn-primary town-zone-panel__collect-btn"
            disabled={busy != null || collectablePassive <= 0}
            onClick={() =>
              runMutation("collect", () => httpCollect(townSlug))
            }
          >
            Collect
          </button>
        </div>

        {hasEntertainmentZone && entertainmentBonus ? (
          <div
            className={`town-zone-panel__bonus${entertainmentBonus.active ? " town-zone-panel__bonus--active" : ""}`}
          >
            <strong>Entertainment × Showdown</strong>
            <span>
              {entertainmentBonus.active
                ? `×${entertainmentBonus.passiveMultiplier} passive active (${entertainmentBonus.gamesThisWeek}/${entertainmentBonus.minGamesPerWeek} Showdown this week)`
                : `${entertainmentBonus.gamesThisWeek}/${entertainmentBonus.minGamesPerWeek} Showdown this week for ×${entertainmentBonus.passiveMultiplier} entertainment passive`}
            </span>
          </div>
        ) : null}

        {prosperityMilestones ? (
          <ProsperityMilestonesStrip milestones={prosperityMilestones} compact />
        ) : null}

        {developable.length > 0 ? (
          <div className="town-zone-panel__pick">
            <label htmlFor="town-zone-type">New zone type</label>
            <select
              id="town-zone-type"
              value={pickType}
              onChange={(e) => setPickType(e.target.value)}
            >
              {(developable[0]?.choices ?? ["commercial"]).map((c) => (
                <option key={c} value={c}>
                  {ZONE_LABELS[c] ?? c}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <ul className="town-zone-list">
          {zones
            .filter((z) => z.developable)
            .map((zone) => {
              const empty = zone.level === 0 && !zone.zoneType;
              const canUpgrade =
                zone.zoneType && zone.level > 0 && zone.upgradeCost != null && coins >= zone.upgradeCost;
              const canDevelop = empty && zone.developCost != null && coins >= zone.developCost;

              return (
                <li key={zone.slotId} className="town-zone-list__item">
                  <div className="town-zone-list__meta">
                    <strong>{zone.labelZh ?? zone.label ?? zone.slotId}</strong>
                    <span>
                      {empty
                        ? `Empty slot · develop ${zone.developCost ?? "—"}`
                        : `Lv.${zone.level} · ${zone.passivePerHour}/h${
                            zone.entertainmentBonusActive ? " ⚡" : ""
                          }`}
                    </span>
                  </div>
                  {empty ? (
                    <button
                      type="button"
                      className="town-zone-list__action"
                      disabled={busy != null || !canDevelop}
                      onClick={() =>
                        runMutation(`dev-${zone.slotId}`, () =>
                          httpDevelop(zone.slotId, pickType, townSlug)
                        )
                      }
                    >
                      Develop
                    </button>
                  ) : zone.upgradeCost != null ? (
                    <button
                      type="button"
                      className="town-zone-list__action"
                      disabled={busy != null || !canUpgrade}
                      onClick={() =>
                        runMutation(`up-${zone.slotId}`, () => httpUpgrade(zone.slotId, townSlug))
                      }
                    >
                      Upgrade {zone.upgradeCost}
                    </button>
                  ) : (
                    <span className="town-zone-list__max">Max</span>
                  )}
                </li>
              );
            })}
        </ul>

        {d1Expansion ? (
          <footer className="town-zone-panel__expand">
            <p>
              Expand to Market Street — Mayor Lv.{d1Expansion.minMayorLevel}, {d1Expansion.minDevelopedZones}{" "}
              zones, quest, {d1Expansion.feeCoins} coins
            </p>
            <button
              type="button"
              className="town-btn-primary"
              disabled={busy != null || !d1Expansion.canExpand || coins < d1Expansion.feeCoins}
              onClick={() =>
                runMutation("expand", () => httpExpand("D1", townSlug))
              }
            >
              Expand District
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
};

async function httpCollect(townSlug?: string) {
  const http = getPortalHttpClient();
  return http!.mutation(portalTournamentFns.townCollectPassive, { townSlug });
}

async function httpDevelop(slotId: string, zoneType: string, townSlug?: string) {
  const http = getPortalHttpClient();
  return http!.mutation(portalTournamentFns.townDevelopZone, { slotId, zoneType, townSlug });
}

async function httpUpgrade(slotId: string, townSlug?: string) {
  const http = getPortalHttpClient();
  return http!.mutation(portalTournamentFns.townUpgradeZone, { slotId, townSlug });
}

async function httpExpand(districtId: string, townSlug?: string) {
  const http = getPortalHttpClient();
  return http!.mutation(portalTournamentFns.townExpandDistrict, { districtId, townSlug });
}

export default TownZonePanel;
