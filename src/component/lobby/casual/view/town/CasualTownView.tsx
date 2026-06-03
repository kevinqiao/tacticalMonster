import React, { useMemo, useState } from "react";

import { getTownBuilding, type TownBuildingDef } from "./casualTownBuildingCatalog";
import { TOWN_POINT_SOURCES, TOWN_STAGES, townLevelProgress } from "./casualTownProgress";
import type { TownBpLayer } from "./casualTownThemeCatalog";
import { TOWN_ILLUSTRATION_S1 } from "./townIllustrationConfig";
import TownIllustrationMap from "./TownIllustrationMap";
import TownOverlayMergePreviewBar from "./TownOverlayMergePreviewBar";
import type { TownOverlayMergePreviewState } from "./townOverlayPairPreview";
import TownThemePreviewBar from "./TownThemePreviewBar";
import { useCasualTownTheme } from "./useCasualTownTheme";
import "./casualTownView.css";

const DEFAULT_OVERLAY_MERGE_PREVIEW: TownOverlayMergePreviewState = {
  enabled: false,
  buildingId: "arena",
  baseSide: "after",
  showOverlay: true,
};

const MOCK_TOTAL_POINTS = 320;

function BuildingDetail({ building, unlocked }: { building: TownBuildingDef; unlocked: boolean }) {
  return (
    <div className={`town-detail${unlocked ? "" : " town-detail--locked"}`}>
      <div className="town-detail__top">
        <span className="town-detail__icon">{building.icon}</span>
        <div>
          <div className="town-detail__name">
            {building.name}
            {building.isLegendary && <span className="town-detail__legendary">传奇</span>}
          </div>
          <div className="town-detail__tagline">{building.tagline}</div>
        </div>
      </div>
      <p className="town-detail__desc">{building.description}</p>
      {!unlocked && <p className="town-detail__unlock">🔒 {building.unlockHint}</p>}
    </div>
  );
}

const CasualTownView: React.FC = () => {
  const { level, stage, currentPoints, nextLevelPoints, pct } = townLevelProgress(MOCK_TOTAL_POINTS);
  const [selectedId, setSelectedId] = useState<string | null>("champion_plaza");
  const [tab, setTab] = useState<"map" | "economy">("map");
  const [themePreviewLayer, setThemePreviewLayer] = useState<TownBpLayer | null>("env");
  const [themePreviewDeluxe, setThemePreviewDeluxe] = useState(false);
  const [overlayMergePreview, setOverlayMergePreview] = useState(
    DEFAULT_OVERLAY_MERGE_PREVIEW
  );
  const { entitlements: liveEntitlements } = useCasualTownTheme();

  const themePreview = useMemo(() => {
    if (themePreviewLayer == null) return null;
    return {
      townLayer: themePreviewLayer,
      townVariant: themePreviewDeluxe ? ("deluxe" as const) : ("standard" as const),
    };
  }, [themePreviewLayer, themePreviewDeluxe]);

  const selected = selectedId ? getTownBuilding(selectedId) : undefined;
  const selectedUnlocked = selected
    ? TOWN_ILLUSTRATION_S1.previewAllUnlocked || level >= selected.visibleFromStage
    : false;

  return (
    <div className="casual-town" data-town-view="illustration-v1">
      <header className="casual-town__header">
        <div className="casual-town__level-row">
          <span className="casual-town__stage-icon">{stage.icon}</span>
          <div>
            <h2 className="casual-town__title">
              {stage.name}
              <span className="casual-town__level-badge">Lv.{level}</span>
            </h2>
            <div className="casual-town__progress-bar">
              <div className="casual-town__progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="casual-town__progress-label">
              {level < 20
                ? `${currentPoints}/${nextLevelPoints} 建设点 → Lv.${level + 1}`
                : "传奇之城满级"}
            </p>
          </div>
        </div>
        <div className="casual-town__stages">
          {TOWN_STAGES.map((s) => (
            <div
              key={s.id}
              className={`casual-town__stage-pip${
                level >= s.levelRange[0] ? " is-reached" : ""
              }${s.id === stage.id ? " is-current" : ""}`}
              title={s.name}
            >
              {s.icon}
            </div>
          ))}
        </div>
      </header>

      <div className="casual-town__tabs">
        <button
          type="button"
          className={`casual-town__tab${tab === "map" ? " is-active" : ""}`}
          onClick={() => setTab("map")}
        >
          城镇全景
        </button>
        <button
          type="button"
          className={`casual-town__tab${tab === "economy" ? " is-active" : ""}`}
          onClick={() => setTab("economy")}
        >
          建设点
        </button>
      </div>

      {tab === "map" && (
        <>
          <TownThemePreviewBar
            liveEntitlements={liveEntitlements}
            previewLayer={themePreviewLayer}
            previewDeluxe={themePreviewDeluxe}
            onPreviewLayer={setThemePreviewLayer}
            onPreviewDeluxe={setThemePreviewDeluxe}
          />
          {import.meta.env.DEV && (
            <TownOverlayMergePreviewBar
              state={overlayMergePreview}
              onChange={setOverlayMergePreview}
            />
          )}
          <div className="casual-town__map-wrap casual-town__map-wrap--illustration">
            <TownIllustrationMap
              level={level}
              selectedId={selectedId}
              onSelect={setSelectedId}
              entitlements={liveEntitlements}
              themePreview={themePreview}
              overlayMergePreview={overlayMergePreview}
            />
          </div>
          {selected ? (
            <BuildingDetail building={selected} unlocked={selectedUnlocked} />
          ) : (
            <p className="casual-town__map-hint">点击地图或下方建筑标签查看详情</p>
          )}
        </>
      )}

      {tab === "economy" && (
        <div className="casual-town__economy-section">
          <p className="casual-town__economy-tip">
            建设点只能通过竞技赢得，不可购买，不可赠送。Town 等级永久保留，赛季不重置。
          </p>
          <ul className="casual-town__economy-list">
            {TOWN_POINT_SOURCES.map((src) => (
              <li
                key={src.id}
                className={`casual-town__economy-item casual-town__economy-item--${src.frequency}`}
              >
                <div className="casual-town__economy-name">{src.name}</div>
                <div className="casual-town__economy-pts">{src.points}</div>
                <div className="casual-town__economy-detail">{src.detail}</div>
              </li>
            ))}
          </ul>
          <p className="casual-town__economy-pace">
            参考节奏：每日 30–50 点，满级（Lv.20）约需 10,000 点，对应约 2 年日常活跃。
          </p>
        </div>
      )}
    </div>
  );
};

export default CasualTownView;


