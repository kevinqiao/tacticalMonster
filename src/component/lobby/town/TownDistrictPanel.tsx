import React, { useCallback, useState } from "react";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import { getPortalHttpClient } from "component/lobby/portal/service/usePortalManager";
import {
  DEFAULT_D1_EXPANSION,
  checklistGates,
  districtCatalogEntry,
  districtErrorMessage,
  expansionChecklist,
  nextExpansionBlocker,
  type DistrictExpansionView,
} from "./districtSystem";
import type { TownZoneView } from "./TownZonePanel";
import "./townDistrict.css";

const ZONE_LABELS: Record<string, string> = {
  commercial: "Finance 金融区",
  industrial: "Industrial 工业区",
  tourism: "Tourism 旅游区",
  entertainment: "Entertainment 娱乐区",
};

export interface TownDistrictPanelProps {
  districtId: string;
  zones: TownZoneView[];
  coins: number;
  mayorLevel: number;
  developedZonesD0: number;
  developedZonesD1: number;
  d1Expansion: DistrictExpansionView | null;
  currentDistrict: string;
  unlockedDistricts: string[];
  portalSessionReady: boolean;
  townSlug?: string;
  expandBusy?: boolean;
  focusBusy?: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onToast: (msg: string) => void;
  onGoHere: (districtId: string) => void;
  onExpand: () => void;
  onOpenDistrict: (districtId: string) => void;
  justExpanded?: boolean;
  collectablePassive?: number;
}

const TownDistrictPanel: React.FC<TownDistrictPanelProps> = ({
  districtId,
  zones,
  coins,
  mayorLevel,
  developedZonesD0,
  developedZonesD1,
  d1Expansion,
  currentDistrict,
  unlockedDistricts,
  portalSessionReady,
  townSlug,
  expandBusy = false,
  focusBusy = false,
  onClose,
  onUpdated,
  onToast,
  onGoHere,
  onExpand,
  onOpenDistrict,
  justExpanded = false,
  collectablePassive = 0,
}) => {
  const catalog = districtCatalogEntry(districtId);
  const unlocked = unlockedDistricts.includes(districtId);
  const here = districtId === currentDistrict;
  const developed = districtId === "D0" ? developedZonesD0 : developedZonesD1;
  const slots = zones.filter((z) => z.districtId === districtId && z.developable);
  const emptySlots = slots.filter((z) => z.level === 0 && !z.zoneType);
  const [busy, setBusy] = useState<string | null>(null);
  const [pickType, setPickType] = useState(emptySlots[0]?.choices[0] ?? "commercial");
  const d1List = expansionChecklist(d1Expansion ?? DEFAULT_D1_EXPANSION, mayorLevel, developedZonesD0, coins);
  const lockedD1 = districtId === "D1" && !unlocked;

  const runMutation = useCallback(
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
          onToast(districtErrorMessage(result.error));
          return;
        }
        onUpdated();
      } catch (e) {
        console.error("[District]", key, e);
        onToast("Something went wrong");
      } finally {
        setBusy(null);
      }
    },
    [portalSessionReady, onUpdated, onToast]
  );

  if (!catalog) return null;

  const state = here ? "Here" : unlocked ? "Open" : "Locked";

  return (
    <div className="town-district-overlay" role="dialog" aria-label={catalog.label}>
      <div className="town-district-panel">
        <header className="town-district-panel__head">
          <div>
            <p className="town-district-panel__id">{catalog.id}</p>
            <h2>{catalog.label}</h2>
            <p>
              {state} · {developed}/{catalog.developableSlots} lots
            </p>
          </div>
          <button type="button" className="town-district-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="town-district-panel__actions">
          {unlocked && !here ? (
            <button
              type="button"
              className="town-btn-primary"
              disabled={focusBusy}
              onClick={() => onGoHere(districtId)}
            >
              {focusBusy ? "Going…" : "Go here"}
            </button>
          ) : null}
          {here ? <span className="town-district-panel__here">You are here</span> : null}
        </div>

        {unlocked ? (
          <section className="town-district-panel__collect">
            <div>
              <strong>Passive income</strong>
              <span>
                {collectablePassive > 0
                  ? `${collectablePassive} coins ready from town lots`
                  : "Nothing to collect yet"}
              </span>
            </div>
            <button
              type="button"
              className="town-btn-primary"
              disabled={busy != null || collectablePassive <= 0}
              onClick={() =>
                runMutation("collect", async () => {
                  const result = (await getPortalHttpClient()!.mutation(
                    portalTournamentFns.townCollectPassive,
                    { townSlug }
                  )) as { ok?: boolean; error?: string; collected?: number };
                  if (result?.ok !== false && typeof result?.collected === "number" && result.collected > 0) {
                    onToast(`Collected ${result.collected} coins`);
                  }
                  return result;
                })
              }
            >
              Collect
            </button>
          </section>
        ) : null}

        {justExpanded && unlocked ? (
          <section className="town-district-panel__celebrate" aria-live="polite">
            <strong>Market Street is open</strong>
            <p>New lots are ready to develop.</p>
          </section>
        ) : null}

        {lockedD1 ? (
          <section className="town-district-panel__gates" aria-label="Expansion gates">
            <h3>Unlock Market Street</h3>
            <ul>
              {checklistGates(d1List).map((gate) => (
                <li key={gate.label} className={gate.ok ? "is-ok" : ""}>
                  <span>
                    {gate.ok ? "✓" : "○"} {gate.label}
                  </span>
                  {!gate.ok && gate === d1List.zones ? (
                    <button type="button" onClick={() => onOpenDistrict("D0")}>
                      Build in Old Square
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="town-district-panel__hint">{nextExpansionBlocker(d1List) ?? "Ready to expand"}</p>
            <button
              type="button"
              className="town-btn-primary"
              disabled={expandBusy || !d1List.canExpand}
              onClick={onExpand}
            >
              {expandBusy ? "Expanding…" : `Expand · ${d1List.coins.need} coins`}
            </button>
          </section>
        ) : null}

        {unlocked ? (
          <section className="town-district-panel__lots">
            <h3>Lots</h3>
            {emptySlots.length > 0 ? (
              <label className="town-district-panel__pick">
                New lot type
                <select value={pickType} onChange={(e) => setPickType(e.target.value)}>
                  {(emptySlots[0].choices.length ? emptySlots[0].choices : ["commercial"]).map((c) => (
                    <option key={c} value={c}>
                      {ZONE_LABELS[c] ?? c}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {slots.length === 0 ? (
              <p className="town-district-panel__hint">No lots in this district yet.</p>
            ) : (
              <ul className="town-district-panel__lot-list">
                {slots.map((zone) => {
                  const empty = zone.level === 0 && !zone.zoneType;
                  const canDevelop = empty && zone.developCost != null && coins >= zone.developCost;
                  const canUpgrade =
                    Boolean(zone.zoneType) &&
                    zone.level > 0 &&
                    zone.upgradeCost != null &&
                    coins >= zone.upgradeCost;
                  return (
                    <li key={zone.slotId}>
                      <div>
                        <strong>{zone.labelZh ?? zone.label ?? (empty ? "Empty lot" : zone.slotId)}</strong>
                        <span>
                          {empty
                            ? `Develop ${zone.developCost ?? "—"} coins`
                            : `Lv.${zone.level} · ${zone.passivePerHour}/h${
                                zone.entertainmentBonusActive || zone.coinTableBonusActive ? " ⚡" : ""
                              }`}
                        </span>
                      </div>
                      {empty ? (
                        <button
                          type="button"
                          disabled={busy != null || !canDevelop}
                          onClick={() =>
                            runMutation(`dev-${zone.slotId}`, () =>
                              getPortalHttpClient()!.mutation(portalTournamentFns.townDevelopZone, {
                                slotId: zone.slotId,
                                zoneType: pickType,
                                townSlug,
                              })
                            )
                          }
                        >
                          Develop
                        </button>
                      ) : zone.upgradeCost != null ? (
                        <button
                          type="button"
                          disabled={busy != null || !canUpgrade}
                          onClick={() =>
                            runMutation(`up-${zone.slotId}`, () =>
                              getPortalHttpClient()!.mutation(portalTournamentFns.townUpgradeZone, {
                                slotId: zone.slotId,
                                townSlug,
                              })
                            )
                          }
                        >
                          Upgrade {zone.upgradeCost}
                        </button>
                      ) : (
                        <span>Max</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default TownDistrictPanel;
