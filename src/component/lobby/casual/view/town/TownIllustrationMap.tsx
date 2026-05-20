import React, { useMemo } from "react";

import type { CasualSkinEntitlements } from "../../service/useCasualPlatformManager";
import { getTownBuilding, TOWN_BUILDINGS } from "./casualTownBuildingCatalog";
import type { TownBpLayer } from "./casualTownThemeCatalog";
import {
  getTownIllustrationConfig,
  type TownIllustrationHotspot,
} from "./townIllustrationConfig";
import {
  effectiveTownBpLayer,
  resolveTownEntitlements,
  resolveVisibleFxLayers,
  townLayerBaseFilter,
  townLayerGroundTint,
  townLayerSkyGradient,
  TOWN_BP_LAYER_LABELS,
} from "./townIllustrationTheme";
import "./townIllustrationMap.css";

export interface TownIllustrationMapProps {
  level: number;
  selectedId: string | null;
  onSelect: (buildingId: string) => void;
  seasonId?: string;
  entitlements: CasualSkinEntitlements;
  themePreview?: {
    townLayer: TownBpLayer;
    townVariant?: "standard" | "deluxe";
  } | null;
}

const TownIllustrationMap: React.FC<TownIllustrationMapProps> = ({
  level,
  selectedId,
  onSelect,
  seasonId,
  entitlements: liveEntitlements,
  themePreview,
}) => {
  const config = useMemo(() => getTownIllustrationConfig(seasonId), [seasonId]);

  const entitlements = useMemo(
    () => resolveTownEntitlements(liveEntitlements, themePreview ?? null),
    [liveEntitlements, themePreview]
  );

  const bpLayer = useMemo(() => effectiveTownBpLayer(entitlements), [entitlements]);
  const deluxe = entitlements.townVariant === "deluxe";

  const skyGradient = useMemo(
    () => townLayerSkyGradient(bpLayer, entitlements.cssThemeKey, deluxe),
    [bpLayer, entitlements.cssThemeKey, deluxe]
  );
  const groundTint = useMemo(
    () => townLayerGroundTint(bpLayer, entitlements.cssThemeKey, deluxe),
    [bpLayer, entitlements.cssThemeKey, deluxe]
  );
  const baseFilter = useMemo(
    () => townLayerBaseFilter(bpLayer, deluxe),
    [bpLayer, deluxe]
  );

  const visibleFx = useMemo(
    () => resolveVisibleFxLayers(config, entitlements),
    [config, entitlements]
  );

  const unlockedById = useMemo(() => {
    const map = new Map<string, boolean>();
    TOWN_BUILDINGS.forEach((b) => {
      map.set(
        b.buildingId,
        config.previewAllUnlocked || level >= b.visibleFromStage
      );
    });
    return map;
  }, [config.previewAllUnlocked, level]);

  const hotspotById = useMemo(() => {
    const map = new Map<string, TownIllustrationHotspot>();
    config.hotspots.forEach((h) => map.set(h.buildingId, h));
    return map;
  }, [config.hotspots]);

  const calibrationIds = config.calibrationBuildingIds;
  const isCalibrating = calibrationIds != null && calibrationIds.length > 0;

  const mapHotspots = useMemo(() => {
    return config.hotspots.filter((h) => {
      if (h.onMap === false) return false;
      if (isCalibrating) return calibrationIds!.includes(h.buildingId);
      return true;
    });
  }, [config.hotspots, calibrationIds, isCalibrating]);

  const isOnMap = (buildingId: string) => {
    const h = hotspotById.get(buildingId);
    if (!h || h.onMap === false) return false;
    if (isCalibrating) return calibrationIds!.includes(buildingId);
    return true;
  };

  return (
    <div
      className={`town-illus${isCalibrating ? " town-illus--calibration" : ""}`}
      data-town-renderer="illustration-hotspot-v1"
      data-illustration-id={config.id}
      data-hotspot-calibration={isCalibrating ? "calibration" : "off"}
      data-town-layer={entitlements.townLayer}
      data-town-variant={entitlements.townVariant}
    >
      {isCalibrating && (
        <p className="town-illus__calibration-banner">
          热区校准：虚线框上始终显示建筑名。调准后设 calibrationBuildingIds 为 null。
        </p>
      )}
      <div
        className="town-illus__frame"
        data-town-layer={bpLayer}
        style={{
          aspectRatio: String(config.aspectRatio),
          ["--town-base-filter" as string]: baseFilter,
        }}
      >
        <span className="town-illus__tier-badge">{TOWN_BP_LAYER_LABELS[bpLayer]}</span>
        <div
          className="town-illus__sky"
          style={{ background: skyGradient }}
          aria-hidden
        />
        <div className="town-illus__canvas">
          <img
            className="town-illus__image town-illus__image--base"
            src={config.baseSrc}
            alt=""
            draggable={false}
          />
          {visibleFx.map((fx) =>
            fx.imageSrc ? (
              <img
                key={fx.layer}
                className={`town-illus__image town-illus__image--layer town-illus__image--${fx.layer}`}
                src={fx.imageSrc}
                alt=""
                draggable={false}
                style={{
                  opacity: fx.opacity,
                  filter: fx.imageFilter,
                }}
              />
            ) : (
              <div
                key={fx.layer}
                className={`town-illus__fx town-illus__fx--${fx.cssFx}`}
                style={{ opacity: fx.opacity }}
                aria-hidden
              />
            )
          )}
          <div
            className="town-illus__ground"
            style={{ background: groundTint }}
            aria-hidden
          />
        </div>
        {mapHotspots.map((hotspot) => (
          <HotspotButton
            key={hotspot.buildingId}
            hotspot={hotspot}
            selected={selectedId === hotspot.buildingId}
            unlocked={unlockedById.get(hotspot.buildingId) ?? false}
            onSelect={onSelect}
            showDebugOutline={isCalibrating}
          />
        ))}
      </div>

      <nav className="town-illus__roster" aria-label="建筑列表">
        {TOWN_BUILDINGS.map((b) => {
          const unlocked = unlockedById.get(b.buildingId) ?? false;
          const onMap = isOnMap(b.buildingId);
          return (
            <button
              key={b.buildingId}
              type="button"
              className={`town-illus__chip${selectedId === b.buildingId ? " is-selected" : ""}${
                unlocked ? "" : " is-locked"
              }${!onMap ? " town-illus__chip--offmap" : ""}`}
              onClick={() => onSelect(b.buildingId)}
              title={b.name}
            >
              <span className="town-illus__chip-icon">{unlocked ? b.icon : "🔒"}</span>
              <span className="town-illus__chip-name">{b.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

function HotspotButton({
  hotspot,
  selected,
  unlocked,
  onSelect,
  showDebugOutline,
}: {
  hotspot: TownIllustrationHotspot;
  selected: boolean;
  unlocked: boolean;
  onSelect: (id: string) => void;
  showDebugOutline?: boolean;
}) {
  const def = getTownBuilding(hotspot.buildingId);
  if (!def) return null;

  return (
    <button
      type="button"
      className={`town-illus__hotspot${selected ? " is-selected" : ""}${
        unlocked ? "" : " is-locked"
      }${def.isLegendary ? " is-legendary" : ""}${
        showDebugOutline ? " town-illus__hotspot--debug" : ""
      }`}
      style={{
        left: `${hotspot.x * 100}%`,
        top: `${hotspot.y * 100}%`,
        width: `${hotspot.w * 100}%`,
        height: `${hotspot.h * 100}%`,
      }}
      onClick={() => onSelect(hotspot.buildingId)}
      aria-label={def.name}
    >
      {selected && <span className="town-illus__hotspot-ring" aria-hidden />}
      {!unlocked && <span className="town-illus__hotspot-lock">🔒</span>}
      {(showDebugOutline || selected) && (
        <span
          className={`town-illus__hotspot-label${
            showDebugOutline ? " town-illus__hotspot-label--pinned" : ""
          }`}
        >
          {def.icon} {def.name}
        </span>
      )}
    </button>
  );
}

export default TownIllustrationMap;
