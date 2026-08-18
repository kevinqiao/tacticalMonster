import React, { useCallback, useEffect, useState } from "react";
import { portalTournamentFns } from "component/lobby/portal/service/portalConvexFunctionRefs";
import { getPortalHttpClient } from "component/lobby/portal/service/usePortalManager";
import {
  DEFAULT_D1_EXPANSION,
  checklistGates,
  districtCatalogEntry,
  districtDevelopedLevel,
  districtErrorMessage,
  districtOpFor,
  districtStatusLine,
  expansionChecklist,
  liveDistrictCollect,
  nextExpansionBlocker,
  type DistrictExpansionView,
  type DistrictOpView,
  type TownLevyView,
} from "./districtSystem";
import "./townDistrict.css";

export type { DistrictOpView };

const TYPE_LABELS: Record<string, string> = {
  commercial: "Finance",
  industrial: "Industry",
  tourism: "Tourism",
  entertainment: "Entertainment",
};

const TYPE_FLAVOR: Record<string, string> = {
  commercial: "Coin tables this week raise this district's coins/h.",
  industrial: "Same level, slightly more coins/h.",
  tourism: "Same level, slightly more prosperity.",
  entertainment: "Showdown this week raises this district's coins/h.",
};

export interface TownDistrictPanelProps {
  districtId: string;
  districtOps: DistrictOpView[];
  coins: number;
  mayorLevel: number;
  d1Expansion: DistrictExpansionView | null;
  unlockedDistricts: string[];
  portalSessionReady: boolean;
  townSlug?: string;
  expandBusy?: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onToast: (msg: string) => void;
  onExpand: () => void;
  onOpenDistrict: (districtId: string) => void;
  justExpanded?: boolean;
  townLevy?: TownLevyView | null;
  collectBusy?: boolean;
  onCollect?: () => void;
}

const TownDistrictPanel: React.FC<TownDistrictPanelProps> = ({
  districtId,
  districtOps,
  coins,
  mayorLevel,
  d1Expansion,
  unlockedDistricts,
  portalSessionReady,
  townSlug,
  expandBusy = false,
  onClose,
  onUpdated,
  onToast,
  onExpand,
  onOpenDistrict,
  justExpanded = false,
  townLevy = null,
  collectBusy = false,
  onCollect,
}) => {
  const catalog = districtCatalogEntry(districtId);
  const op = districtOpFor(districtOps, districtId);
  const d0Level = districtDevelopedLevel(districtOpFor(districtOps, "D0"));
  const unlocked = unlockedDistricts.includes(districtId);
  const developed = districtDevelopedLevel(op) > 0;
  const [busy, setBusy] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const collectView = liveDistrictCollect(townLevy, districtOps, nowMs);
  const choices = op?.choices?.length ? op.choices : ["commercial", "industrial", "tourism", "entertainment"];
  const [pickType, setPickType] = useState(choices[0] ?? "commercial");
  const d1List = expansionChecklist(d1Expansion ?? DEFAULT_D1_EXPANSION, mayorLevel, d0Level, coins);
  const lockedD1 = districtId === "D1" && !unlocked;

  const defaultType = choices[0] ?? "commercial";
  useEffect(() => {
    setPickType(developed && op?.type ? op.type : defaultType);
  }, [districtId, developed, op?.type, defaultType]);

  useEffect(() => {
    if (!collectView?.dripping) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [collectView?.dripping, townLevy?.readyAt]);

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

  const status = lockedD1
    ? "Locked"
    : developed
      ? districtStatusLine(op, true)
      : unlocked
        ? "Undeveloped"
        : "Locked";
  const gameNote =
    districtId === "D1"
      ? developed
        ? "Yatz tables are open."
        : unlocked
          ? "Develop to open Yatz."
          : "Expand and develop to open Yatz."
      : "Solitaire is open from the start.";

  return (
    <div className="town-district-overlay" role="dialog" aria-label={catalog.label}>
      <div className="town-district-panel">
        <header className="town-district-panel__head">
          <div>
            <p className="town-district-panel__id">{catalog.id}</p>
            <h2>{catalog.label}</h2>
            <p>{status}</p>
          </div>
          <button type="button" className="town-district-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {justExpanded && unlocked ? (
          <section className="town-district-panel__celebrate" aria-live="polite">
            <strong>Market Street is open</strong>
            <p>Pick a type to develop it and unlock Yatz.</p>
          </section>
        ) : null}

        {lockedD1 ? (
          <section className="town-district-panel__block" aria-label="Expansion gates">
            <h3>Unlock Market Street</h3>
            <ul className="town-district-panel__list">
              {checklistGates(d1List).map((gate) => (
                <li key={gate.label} className={gate.ok ? "is-ok" : ""}>
                  <span>
                    {gate.ok ? "✓" : "○"} {gate.label}
                  </span>
                  {!gate.ok && gate === d1List.prior ? (
                    <button type="button" onClick={() => onOpenDistrict("D0")}>
                      Upgrade Old Square
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="town-district-panel__hint">{nextExpansionBlocker(d1List) ?? "Ready to expand"}</p>
            <p className="town-district-panel__hint">{gameNote}</p>
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

        {unlocked && !developed ? (
          <section className="town-district-panel__block">
            <h3>Develop</h3>
            <p className="town-district-panel__hint">
              Pick a type. This district will earn coins/h. Collect every 8h from Districts.
            </p>
            <label className="town-district-panel__pick">
              District type
              <select value={pickType} onChange={(e) => setPickType(e.target.value)}>
                {choices.map((c) => (
                  <option key={c} value={c}>
                    {TYPE_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </label>
            <p className="town-district-panel__hint">{TYPE_FLAVOR[pickType]}</p>
            <p className="town-district-panel__hint">{gameNote}</p>
            <button
              type="button"
              className="town-btn-primary"
              disabled={busy != null || op?.developCost == null || coins < op.developCost}
              onClick={() =>
                runMutation("develop", () =>
                  getPortalHttpClient()!.mutation(portalTournamentFns.townDevelopDistrict, {
                    districtId,
                    zoneType: pickType,
                    townSlug,
                  })
                )
              }
            >
              {busy === "develop" ? "Developing…" : `Develop · ${op?.developCost ?? "—"} coins`}
            </button>
          </section>
        ) : null}

        {unlocked && developed ? (
          <section className="town-district-panel__block">
            <h3>Passive</h3>
            <p className="town-district-panel__rate">
              {op?.passivePerHour ?? 0}/h
              {op?.entertainmentBonusActive || op?.coinTableBonusActive ? " · bonus this week" : ""}
            </p>
            <p className="town-district-panel__hint">
              {TYPE_FLAVOR[op?.type ?? ""] ?? "Type only changes this district's flavor."}
            </p>
            {collectView ? (
              <>
                <p className="town-district-panel__hint">Town {collectView.bankLine}</p>
                <button
                  type="button"
                  className="town-btn-primary"
                  disabled={collectBusy || !collectView.canCollect}
                  onClick={onCollect}
                >
                  {collectBusy ? "Collecting…" : collectView.collectLabel}
                </button>
              </>
            ) : null}

            <h3>Upgrade</h3>
            {op?.upgradeCost != null ? (
              <button
                type="button"
                className="town-btn-primary"
                disabled={busy != null || coins < op.upgradeCost}
                onClick={() =>
                  runMutation("upgrade", () =>
                    getPortalHttpClient()!.mutation(portalTournamentFns.townUpgradeDistrict, {
                      districtId,
                      townSlug,
                    })
                  )
                }
              >
                {busy === "upgrade" ? "Upgrading…" : `Upgrade · ${op.upgradeCost} coins`}
              </button>
            ) : (
              <p className="town-district-panel__hint">Max level</p>
            )}

            <h3>Rebrand</h3>
            {op?.rebrandCost != null ? (
              <>
                <p className="town-district-panel__hint">Once. Keeps this level. Does not change tables or Week Score.</p>
                <label className="town-district-panel__pick">
                  New type
                  <select value={pickType} onChange={(e) => setPickType(e.target.value)}>
                    {choices.map((c) => (
                      <option key={c} value={c}>
                        {TYPE_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="town-district-panel__hint">{TYPE_FLAVOR[pickType]}</p>
                <button
                  type="button"
                  className="town-btn-primary"
                  disabled={busy != null || coins < op.rebrandCost || pickType === op.type}
                  onClick={() =>
                    runMutation("rebrand", () =>
                      getPortalHttpClient()!.mutation(portalTournamentFns.townRebrandDistrict, {
                        districtId,
                        zoneType: pickType,
                        townSlug,
                      })
                    )
                  }
                >
                  {busy === "rebrand" ? "Rebranding…" : `Rebrand · ${op.rebrandCost} coins`}
                </button>
              </>
            ) : (
              <p className="town-district-panel__hint">Already rebranded</p>
            )}
            <p className="town-district-panel__hint">{gameNote}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default TownDistrictPanel;


